import { Request, Response } from "express";
import Event from "./event";
import User from "../user/user";
import { asyncHandler } from "../utils/asyncHandler";
import { createError } from "../utils/errorResponse";

// @desc    Search events with advanced filters
// @route   GET /api/search/events
// @access  Public
export const searchEvents = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      keyword,
      category,
      eventType,
      location,
      dateFrom,
      dateTo,
      minFee,
      maxFee,
      minParticipants,
      maxParticipants,
      sortBy,
      sortOrder = "asc",
      page = "1",
      limit = "12",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter: any = {};

    // Keyword search in title and description
    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { tags: { $in: [new RegExp(keyword as string, "i")] } },
      ];
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Event type filter
    if (eventType) {
      filter.eventType = eventType;
    }

    // Location filter
    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom as string);
      if (dateTo) filter.date.$lte = new Date(dateTo as string);
    }

    // Fee range filter
    if (minFee !== undefined || maxFee !== undefined) {
      filter.joiningFee = {};
      if (minFee !== undefined)
        filter.joiningFee.$gte = parseFloat(minFee as string);
      if (maxFee !== undefined)
        filter.joiningFee.$lte = parseFloat(maxFee as string);
    }

    // Participants range filter
    if (minParticipants !== undefined || maxParticipants !== undefined) {
      filter.currentParticipants = {};
      if (minParticipants !== undefined)
        filter.currentParticipants.$gte = parseInt(minParticipants as string);
      if (maxParticipants !== undefined)
        filter.currentParticipants.$lte = parseInt(maxParticipants as string);
    }

    // Status filter - only show open events by default
    if (!req.query.status) {
      filter.status = "open";
    } else if (req.query.status !== "all") {
      filter.status = req.query.status;
    }

    // Build sort object
    let sort: any = {};
    if (sortBy) {
      const order = sortOrder === "desc" ? -1 : 1;
      switch (sortBy) {
        case "date":
          sort.date = order;
          break;
        case "fee":
          sort.joiningFee = order;
          break;
        case "participants":
          sort.currentParticipants = order;
          break;
        case "created":
          sort.createdAt = order;
          break;
        default:
          sort.createdAt = -1;
      }
    } else {
      sort.date = 1; // Sort by upcoming events by default
    }

    // Execute query
    const events = await Event.find(filter)
      .populate("host", "name avatar rating")
      .skip(skip)
      .limit(limitNum)
      .sort(sort);

    const total = await Event.countDocuments(filter);

    // Get categories for filter suggestions
    const categories = await Event.distinct("category");
    const locations = await Event.distinct("location");
    const eventTypes = await Event.distinct("eventType");

    res.json({
      success: true,
      data: {
        events,
        filters: {
          categories,
          locations,
          eventTypes,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  }
);

// @desc    Get events near location
// @route   GET /api/search/nearby
// @access  Public
export const getNearbyEvents = asyncHandler(
  async (req: Request, res: Response) => {
    const { location, radius = "10" } = req.query;

    if (!location) {
      throw createError("Location is required", 400);
    }

    // This is a simplified version - in production, use geospatial queries
    const events = await Event.find({
      location: { $regex: location, $options: "i" },
      status: "open",
      date: { $gte: new Date() },
    })
      .populate("host", "name avatar")
      .limit(20)
      .sort({ date: 1 });

    res.json({
      success: true,
      data: { events },
    });
  }
);

// @desc    Get trending events
// @route   GET /api/search/trending
// @access  Public
export const getTrendingEvents = asyncHandler(
  async (req: Request, res: Response) => {
    // Get events with most participants in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const events = await Event.find({
      createdAt: { $gte: sevenDaysAgo },
      status: "open",
    })
      .populate("host", "name avatar")
      .sort({ currentParticipants: -1 })
      .limit(10);

    res.json({
      success: true,
      data: { events },
    });
  }
);

// @desc    Get events by interests
// @route   GET /api/search/interests
// @access  Private
export const getEventsByInterests = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await User.findById((req as any).user.userId);

    if (!user || !user.interests || user.interests.length === 0) {
      return res.json({
        success: true,
        data: { events: [] },
      });
    }

    // Find events matching user interests
    const events = await Event.find({
      $or: [
        { tags: { $in: user.interests } },
        { category: { $in: user.interests } },
      ],
      status: "open",
      date: { $gte: new Date() },
    })
      .populate("host", "name avatar")
      .limit(20)
      .sort({ date: 1 });

    res.json({
      success: true,
      data: { events },
    });
  }
);

// @desc    Get event statistics
// @route   GET /api/search/stats
// @access  Public
export const getEventStats = asyncHandler(
  async (req: Request, res: Response) => {
    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({
      status: "open",
      date: { $gte: new Date() },
    });
    const eventsToday = await Event.countDocuments({
      date: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999),
      },
    });

    // Get events by category
    const eventsByCategory = await Event.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Get events by type
    const eventsByType = await Event.aggregate([
      { $group: { _id: "$eventType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalEvents,
        upcomingEvents,
        eventsToday,
        eventsByCategory,
        eventsByType,
      },
    });
  }
);

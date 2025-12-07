import { Request, Response } from "express";
import Event from "./event";
import User from "../user/user";
import { asyncHandler } from "../utils/asyncHandler";
import { createError } from "../utils/errorResponse";

const getQueryString = (value: any): string | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0] as string;
  return value as string;
};


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

    const pageNum = parseInt(getQueryString(page) || "1");
    const limitNum = parseInt(getQueryString(limit) || "12");
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};

    // Keyword filter
    const keywordStr = getQueryString(keyword);
    if (keywordStr) {
      filter.$or = [
        { title: { $regex: keywordStr, $options: "i" } },
        { description: { $regex: keywordStr, $options: "i" } },
        { tags: { $in: [new RegExp(keywordStr, "i")] } },
      ];
    }

    // Category filter
    const categoryStr = getQueryString(category);
    if (categoryStr) {
      filter.category = categoryStr;
    }

    // Event type filter
    const eventTypeStr = getQueryString(eventType);
    if (eventTypeStr) {
      filter.eventType = eventTypeStr;
    }

    // Location filter
    const locationStr = getQueryString(location);
    if (locationStr) {
      filter.location = { $regex: locationStr, $options: "i" };
    }

    // Date range filter
    const dateFromStr = getQueryString(dateFrom);
    const dateToStr = getQueryString(dateTo);
    if (dateFromStr || dateToStr) {
      filter.date = {};
      if (dateFromStr) filter.date.$gte = new Date(dateFromStr);
      if (dateToStr) filter.date.$lte = new Date(dateToStr);
    }

    // Fee range filter
    const minFeeStr = getQueryString(minFee);
    const maxFeeStr = getQueryString(maxFee);
    if (minFeeStr !== undefined || maxFeeStr !== undefined) {
      filter.joiningFee = {};
      if (minFeeStr !== undefined)
        filter.joiningFee.$gte = parseFloat(minFeeStr);
      if (maxFeeStr !== undefined)
        filter.joiningFee.$lte = parseFloat(maxFeeStr);
    }

    // Participants range filter
    const minParticipantsStr = getQueryString(minParticipants);
    const maxParticipantsStr = getQueryString(maxParticipants);
    if (minParticipantsStr !== undefined || maxParticipantsStr !== undefined) {
      filter.currentParticipants = {};
      if (minParticipantsStr !== undefined)
        filter.currentParticipants.$gte = parseInt(minParticipantsStr);
      if (maxParticipantsStr !== undefined)
        filter.currentParticipants.$lte = parseInt(maxParticipantsStr);
    }

    // Status filter
    const statusStr = getQueryString(req.query.status);
    if (!statusStr) {
      filter.status = "open";
    } else if (statusStr !== "all") {
      filter.status = statusStr;
    }

    // Build sort object
    let sort: any = {};
    const sortByStr = getQueryString(sortBy);
    const sortOrderStr = getQueryString(sortOrder);

    if (sortByStr) {
      const order = sortOrderStr === "desc" ? -1 : 1;
      switch (sortByStr) {
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
      sort.date = 1;
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
export const getNearbyEvents = asyncHandler(
  async (req: Request, res: Response) => {
    const { location, radius = "10" } = req.query;

    const locationStr = getQueryString(location);
    if (!locationStr) {
      throw createError("Location is required", 400);
    }

    const events = await Event.find({
      location: { $regex: locationStr, $options: "i" },
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
export const getTrendingEvents = asyncHandler(
  async (req: Request, res: Response) => {
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
export const getEventsByInterests = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await User.findById((req as any).user.userId);

    if (!user || !user.interests || user.interests.length === 0) {
      return res.json({
        success: true,
        data: { events: [] },
      });
    }

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
export const getEventStats = asyncHandler(
  async (req: Request, res: Response) => {
    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({
      status: "open",
      date: { $gte: new Date() },
    });

    // Get start and end of today
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const eventsToday = await Event.countDocuments({
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
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

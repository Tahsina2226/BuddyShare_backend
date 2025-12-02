import { Request, Response } from "express";
import Event from "./event";
import User from "../user/user";
import { asyncHandler } from "../utils/asyncHandler";
import { createError } from "../utils/errorResponse";

// @desc    Create new event
// @route   POST /api/events
// @access  Private/Host
export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    eventType,
    date,
    time,
    location,
    address,
    maxParticipants,
    joiningFee,
    category,
    tags,
  } = req.body;

  // Check if user is host or admin
  const user = await User.findById((req as any).user.userId);
  if (!["host", "admin"].includes(user!.role)) {
    throw createError("Only hosts can create events", 403);
  }

  // Create event
  const event = await Event.create({
    title,
    description,
    eventType,
    date,
    time,
    location,
    address,
    host: (req as any).user.userId,
    maxParticipants: parseInt(maxParticipants),
    currentParticipants: 0,
    joiningFee: parseFloat(joiningFee) || 0,
    category,
    tags: tags || [],
    status: "open",
  });

  res.status(201).json({
    success: true,
    message: "Event created successfully",
    data: { event },
  });
});

// @desc    Get all events
// @route   GET /api/events
// @access  Public
export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Filtering
  const filter: any = {};

  if (req.query.category) filter.category = req.query.category;
  if (req.query.eventType) filter.eventType = req.query.eventType;
  if (req.query.location)
    filter.location = { $regex: req.query.location, $options: "i" };
  if (req.query.status) filter.status = req.query.status;

  // Date filtering
  if (req.query.dateFrom) {
    filter.date = {
      ...filter.date,
      $gte: new Date(req.query.dateFrom as string),
    };
  }
  if (req.query.dateTo) {
    filter.date = {
      ...filter.date,
      $lte: new Date(req.query.dateTo as string),
    };
  }

  // Sorting
  const sort: any = {};
  if (req.query.sortBy === "date") sort.date = 1;
  if (req.query.sortBy === "participants") sort.currentParticipants = -1;
  if (!req.query.sortBy) sort.createdAt = -1;

  const events = await Event.find(filter)
    .populate("host", "name email avatar")
    .skip(skip)
    .limit(limit)
    .sort(sort);

  const total = await Event.countDocuments(filter);

  res.json({
    success: true,
    data: {
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
export const getEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id)
    .populate("host", "name email avatar bio location")
    .populate("participants", "name avatar");

  if (!event) {
    throw createError("Event not found", 404);
  }

  res.json({
    success: true,
    data: { event },
  });
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private/Host
export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  let event = await Event.findById(req.params.id);

  if (!event) {
    throw createError("Event not found", 404);
  }

  // Check if user is event host or admin
  if (
    event.host.toString() !== (req as any).user.userId &&
    (req as any).user.role !== "admin"
  ) {
    throw createError("Not authorized to update this event", 403);
  }

  // Update event
  event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("host", "name email avatar");

  res.json({
    success: true,
    message: "Event updated successfully",
    data: { event },
  });
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private/Host/Admin
export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw createError("Event not found", 404);
  }

  // Check if user is event host or admin
  if (
    event.host.toString() !== (req as any).user.userId &&
    (req as any).user.role !== "admin"
  ) {
    throw createError("Not authorized to delete this event", 403);
  }

  await Event.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Event deleted successfully",
    data: {},
  });
});

// @desc    Get events by host
// @route   GET /api/events/host/:hostId
// @access  Public
export const getEventsByHost = asyncHandler(
  async (req: Request, res: Response) => {
    const events = await Event.find({ host: req.params.hostId })
      .populate("host", "name avatar")
      .sort({ date: 1 });

    res.json({
      success: true,
      data: { events },
    });
  }
);

// @desc    Get user's joined events
// @route   GET /api/events/joined
// @access  Private
export const getJoinedEvents = asyncHandler(
  async (req: Request, res: Response) => {
    const events = await Event.find({ participants: (req as any).user.userId })
      .populate("host", "name avatar")
      .sort({ date: 1 });

    res.json({
      success: true,
      data: { events },
    });
  }
);

// @desc    Get events created by current user
// @route   GET /api/events/my-events
// @access  Private/Host
export const getMyEvents = asyncHandler(async (req: Request, res: Response) => {
  const events = await Event.find({ host: (req as any).user.userId })
    .populate("participants", "name avatar")
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: { events },
  });
});

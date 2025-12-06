import { Request, Response } from "express";
import Event from "./event";
import User from "../user/user";
import { asyncHandler } from "../utils/asyncHandler";
import { createError } from "../utils/errorResponse";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    const uploadPath = path.join(process.cwd(), "uploads/events");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "event-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: fileFilter,
});

export const uploadEventImage = upload.single("image");

const getFullUrl = (req: Request, path: string): string => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) {
    return `${req.protocol}://${req.get("host")}${path}`;
  }
  return path;
};

const transformEventWithFullUrls = (req: Request, event: any) => {
  const eventObj = event.toObject ? event.toObject() : event;
  return {
    ...eventObj,
    image: getFullUrl(req, eventObj.image),
    host:
      eventObj.host && typeof eventObj.host === "object"
        ? {
            ...eventObj.host,
            avatar: getFullUrl(req, eventObj.host?.avatar || ""),
          }
        : eventObj.host,
    participants:
      eventObj.participants?.map((participant: any) =>
        participant && typeof participant === "object"
          ? {
              ...participant,
              avatar: getFullUrl(req, participant.avatar || ""),
            }
          : participant
      ) || [],
  };
};

const mapCategoryToSchema = (category: string): string => {
  const categoryMap: Record<string, string> = {
    Tech: "Technology",
    tech: "Technology",
    "Tech Event": "Technology",
    "Technology Event": "Technology",
    Coding: "Technology",
    Programming: "Technology",
    Software: "Technology",
    IT: "Technology",
    webdev: "Technology",
    devops: "Technology",
    ai: "Technology",
    ml: "Technology",
    blockchain: "Technology",
    cybersecurity: "Technology",
    cloud: "Technology",
  };

  return categoryMap[category] || category;
};

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
    image: imageUrl,
  } = req.body;

  const user = await User.findById((req as any).user.userId);
  if (!["host", "admin"].includes(user!.role)) {
    throw createError("Only hosts can create events", 403);
  }

  let image = imageUrl;
  if (req.file) {
    const imagePath = `/uploads/events/${req.file.filename}`;
    image = `${req.protocol}://${req.get("host")}${imagePath}`;
  }

  const mappedCategory = mapCategoryToSchema(category);

  const event = await Event.create({
    title,
    description,
    eventType,
    date,
    time,
    location,
    address,
    host: (req as any).user.userId,
    hostName: user!.name,
    hostEmail: user!.email,
    maxParticipants: parseInt(maxParticipants),
    currentParticipants: 0,
    joiningFee: parseFloat(joiningFee) || 0,
    category: mappedCategory,
    tags: tags
      ? Array.isArray(tags)
        ? tags.map((t: string) => t.toLowerCase().trim())
        : tags.split(",").map((t: string) => t.trim().toLowerCase())
      : [],
    image,
    status: "open",
  });

  const eventWithFullUrls = transformEventWithFullUrls(req, event);

  res.status(201).json({
    success: true,
    message: "Event created successfully",
    data: { event: eventWithFullUrls },
  });
});

export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const filter: any = {};

  if (req.query.category) {
    const mappedCategory = mapCategoryToSchema(req.query.category as string);
    filter.category = mappedCategory;
  }
  if (req.query.eventType) filter.eventType = req.query.eventType;
  if (req.query.location)
    filter.location = { $regex: req.query.location, $options: "i" };
  if (req.query.status) filter.status = req.query.status;

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

  const eventsWithFullUrls = events.map((event) =>
    transformEventWithFullUrls(req, event)
  );

  res.json({
    success: true,
    data: {
      events: eventsWithFullUrls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

export const getEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id)
    .populate("host", "name email avatar bio location")
    .populate("participants", "name avatar");

  if (!event) {
    throw createError("Event not found", 404);
  }

  const eventWithFullUrls = transformEventWithFullUrls(req, event);

  res.json({
    success: true,
    data: { event: eventWithFullUrls },
  });
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  let event = await Event.findById(req.params.id);

  if (!event) {
    throw createError("Event not found", 404);
  }

  if (
    event.host.toString() !== (req as any).user.userId &&
    (req as any).user.role !== "admin"
  ) {
    throw createError("Not authorized to update this event", 403);
  }

  let image = req.body.image;
  if (req.file) {
    const imagePath = `/uploads/events/${req.file.filename}`;
    image = `${req.protocol}://${req.get("host")}${imagePath}`;

    if (event.image && event.image.includes("/uploads/events/")) {
      try {
        const oldImageFilename = event.image.split("/").pop();
        const oldImagePath = path.join(
          process.cwd(),
          "uploads/events",
          oldImageFilename || ""
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      } catch (error) {
        console.error("Error deleting old image:", error);
      }
    }
  }

  const updateData: any = {
    ...req.body,
  };

  if (req.body.category) {
    updateData.category = mapCategoryToSchema(req.body.category);
  }

  if (image) {
    updateData.image = image;
  }

  if (req.body.tags) {
    updateData.tags = Array.isArray(req.body.tags)
      ? req.body.tags.map((t: string) => t.toLowerCase().trim())
      : req.body.tags.split(",").map((t: string) => t.trim().toLowerCase());
  }

  if (req.body.maxParticipants) {
    updateData.maxParticipants = parseInt(req.body.maxParticipants);
  }
  if (req.body.joiningFee) {
    updateData.joiningFee = parseFloat(req.body.joiningFee);
  }

  event = await Event.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).populate("host", "name email avatar");

  const eventWithFullUrls = transformEventWithFullUrls(req, event);

  res.json({
    success: true,
    message: "Event updated successfully",
    data: { event: eventWithFullUrls },
  });
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    throw createError("Event not found", 404);
  }

  if (
    event.host.toString() !== (req as any).user.userId &&
    (req as any).user.role !== "admin"
  ) {
    throw createError("Not authorized to delete this event", 403);
  }

  if (event.image && event.image.includes("/uploads/events/")) {
    try {
      const imageFilename = event.image.split("/").pop();
      const imagePath = path.join(
        process.cwd(),
        "uploads/events",
        imageFilename || ""
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  }

  await Event.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Event deleted successfully",
    data: {},
  });
});

export const getEventsByHost = asyncHandler(
  async (req: Request, res: Response) => {
    const events = await Event.find({ host: req.params.hostId })
      .populate("host", "name avatar")
      .sort({ date: 1 });

    const eventsWithFullUrls = events.map((event) =>
      transformEventWithFullUrls(req, event)
    );

    res.json({
      success: true,
      data: { events: eventsWithFullUrls },
    });
  }
);

export const getJoinedEvents = asyncHandler(
  async (req: Request, res: Response) => {
    const events = await Event.find({ participants: (req as any).user.userId })
      .populate("host", "name avatar")
      .sort({ date: 1 });

    const eventsWithFullUrls = events.map((event) =>
      transformEventWithFullUrls(req, event)
    );

    res.json({
      success: true,
      data: { events: eventsWithFullUrls },
    });
  }
);

export const getMyEvents = asyncHandler(async (req: Request, res: Response) => {
  const events = await Event.find({ host: (req as any).user.userId })
    .populate("participants", "name avatar")
    .sort({ createdAt: -1 });

  const eventsWithFullUrls = events.map((event) =>
    transformEventWithFullUrls(req, event)
  );

  res.json({
    success: true,
    data: { events: eventsWithFullUrls },
  });
});

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw createError("No image uploaded", 400);
  }

  const imagePath = `/uploads/events/${req.file.filename}`;
  const fullUrl = `${req.protocol}://${req.get("host")}${imagePath}`;

  res.json({
    success: true,
    message: "Image uploaded successfully",
    data: {
      url: imagePath,
      fullUrl: fullUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

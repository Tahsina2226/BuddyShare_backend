import { Request, Response } from "express";
import Event from "./event";
import User from "../user/user";
import { asyncHandler } from "../utils/asyncHandler";
import { createError } from "../utils/errorResponse";

export const joinEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id);
  const userId = (req as any).user.userId;

  if (!event) {
    throw createError("Event not found", 404);
  }

  if (event.status !== "open") {
    throw createError("Event is not open for joining", 400);
  }

  if (event.currentParticipants >= event.maxParticipants) {
    throw createError("Event is full", 400);
  }

  if (event.participants.includes(userId as any)) {
    throw createError("Already joined this event", 400);
  }

  if (event.host.toString() === userId) {
    throw createError("Host cannot join their own event", 400);
  }

  const eventDate = new Date(event.date);
  if (eventDate < new Date()) {
    throw createError("Cannot join past events", 400);
  }

  event.participants.push(userId as any);
  event.currentParticipants = event.participants.length;

  if (event.currentParticipants >= event.maxParticipants) {
    event.status = "full";
  }

  await event.save();

  res.json({
    success: true,
    message: "Successfully joined the event",
    data: {
      eventId: event._id,
      currentParticipants: event.currentParticipants,
      status: event.status,
    },
  });
});

export const leaveEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await Event.findById(req.params.id);
  const userId = (req as any).user.userId;

  if (!event) {
    throw createError("Event not found", 404);
  }

  if (!event.participants.includes(userId as any)) {
    throw createError("You are not a participant of this event", 400);
  }

  const eventDate = new Date(event.date);
  const now = new Date();
  const hoursUntilEvent =
    (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilEvent < 24) {
    throw createError("Cannot leave event within 24 hours of start time", 400);
  }

  event.participants = event.participants.filter(
    (participantId) => participantId.toString() !== userId
  );
  event.currentParticipants = event.participants.length;

  if (
    event.status === "full" &&
    event.currentParticipants < event.maxParticipants
  ) {
    event.status = "open";
  }

  await event.save();

  res.json({
    success: true,
    message: "Successfully left the event",
    data: {
      eventId: event._id,
      currentParticipants: event.currentParticipants,
      status: event.status,
    },
  });
});

export const getEventParticipants = asyncHandler(
  async (req: Request, res: Response) => {
    const event = await Event.findById(req.params.id)
      .populate("participants", "name avatar email location interests")
      .select("participants");

    if (!event) {
      throw createError("Event not found", 404);
    }

    const userId = (req as any).user.userId;
    const isHost = event.host.toString() === userId;
    const isParticipant = event.participants.some(
      (participant: any) => participant._id.toString() === userId
    );

    if (!isHost && !isParticipant) {
      throw createError("Not authorized to view participants", 403);
    }

    res.json({
      success: true,
      data: {
        participants: event.participants,
        total: event.participants.length,
      },
    });
  }
);

export const removeParticipant = asyncHandler(
  async (req: Request, res: Response) => {
    const event = await Event.findById(req.params.id);
    const userId = req.params.userId;

    if (!event) {
      throw createError("Event not found", 404);
    }

   
    if (event.host.toString() !== (req as any).user.userId) {
      throw createError("Only host can remove participants", 403);
    }


    if (!event.participants.includes(userId as any)) {
      throw createError("User is not a participant of this event", 400);
    }

    event.participants = event.participants.filter(
      (participantId) => participantId.toString() !== userId
    );
    event.currentParticipants = event.participants.length;


    if (
      event.status === "full" &&
      event.currentParticipants < event.maxParticipants
    ) {
      event.status = "open";
    }

    await event.save();

    res.json({
      success: true,
      message: "Participant removed successfully",
      data: {
        eventId: event._id,
        currentParticipants: event.currentParticipants,
        status: event.status,
      },
    });
  }
);

export const canJoinEvent = asyncHandler(
  async (req: Request, res: Response) => {
    const event = await Event.findById(req.params.id);
    const userId = (req as any).user.userId;

    if (!event) {
      throw createError("Event not found", 404);
    }

    const canJoin = {
      canJoin: true,
      reasons: [] as string[],
    };


    if (event.status !== "open") {
      canJoin.canJoin = false;
      canJoin.reasons.push("Event is not open for joining");
    }

    if (event.currentParticipants >= event.maxParticipants) {
      canJoin.canJoin = false;
      canJoin.reasons.push("Event is full");
    }

    if (event.participants.includes(userId as any)) {
      canJoin.canJoin = false;
      canJoin.reasons.push("Already joined this event");
    }

    if (event.host.toString() === userId) {
      canJoin.canJoin = false;
      canJoin.reasons.push("Host cannot join their own event");
    }

    const eventDate = new Date(event.date);
    if (eventDate < new Date()) {
      canJoin.canJoin = false;
      canJoin.reasons.push("Cannot join past events");
    }

    res.json({
      success: true,
      data: canJoin,
    });
  }
);

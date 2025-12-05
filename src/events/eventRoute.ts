import express from "express";
import {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  getEventsByHost,
  getJoinedEvents,
  getMyEvents,
  uploadEventImage,
  uploadImage
} from "./eventController";
import {
  joinEvent,
  leaveEvent,
  getEventParticipants,
  removeParticipant,
  canJoinEvent,
} from "./participationController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/host/:hostId", getEventsByHost);
router.get("/", getEvents);
router.get("/:id", getEvent);

router.use(protect);

router.post("/upload-image", uploadEventImage, uploadImage);

router.get("/my/events", getMyEvents);
router.get("/joined/events", getJoinedEvents);

router.post("/", uploadEventImage, createEvent);
router.put("/:id", uploadEventImage, updateEvent);

router.post("/:id/join", joinEvent);
router.post("/:id/leave", leaveEvent);
router.get("/:id/participants", getEventParticipants);
router.delete("/:id/participants/:userId", removeParticipant);
router.get("/:id/can-join", canJoinEvent);
router.delete("/:id", deleteEvent);

export default router;
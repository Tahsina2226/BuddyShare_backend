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
} from "./eventController";
import { protect } from "../middleware/auth";

const router = express.Router();

// Public routes
router.get("/", getEvents);
router.get("/:id", getEvent);
router.get("/host/:hostId", getEventsByHost);

// Protected routes
router.use(protect);

router.post("/", createEvent);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);
router.get("/joined/events", getJoinedEvents);
router.get("/my/events", getMyEvents);

export default router;

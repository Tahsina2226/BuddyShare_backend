// eventRoutes.ts
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
router.get("/host/:hostId", getEventsByHost);
router.get("/my/events", protect, getMyEvents); 
router.get("/joined/events", protect, getJoinedEvents); 
router.get("/", getEvents);
router.get("/:id", getEvent); 

// Protected routes
router.use(protect);

router.post("/", createEvent);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);

export default router;

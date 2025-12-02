import express from "express";
import {
  searchEvents,
  getNearbyEvents,
  getTrendingEvents,
  getEventsByInterests,
  getEventStats,
} from "./searchController";
import { protect } from "../middleware/auth";

const router = express.Router();

// Public routes
router.get("/events", searchEvents);
router.get("/nearby", getNearbyEvents);
router.get("/trending", getTrendingEvents);
router.get("/stats", getEventStats);

// Protected route
router.get("/interests", protect, getEventsByInterests);

export default router;

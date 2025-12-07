import express from "express";
import {
  getEventReviews,
  checkUserReview,
  createReview,
  updateReview,
  deleteReview,
  getHostReviews,
} from "./reviewController";
import { protect } from "../middleware/auth";

const router = express.Router();

// Public routes
router.get("/events/:eventId/reviews", getEventReviews);
router.get("/host/:hostId/reviews", getHostReviews);

// Protected routes
router.use(protect);

router.get("/events/:eventId/reviews/check", checkUserReview);
router.post("/events/:eventId/reviews", createReview);
router.put("/events/:eventId/reviews/:reviewId", updateReview);
router.delete("/events/:eventId/reviews/:reviewId", deleteReview);

export default router;

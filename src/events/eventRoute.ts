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
  uploadImage,
  getEventsByRating,
  getTopRatedEvents,
  getMyParticipatedEvents,
} from "./eventController";
import {
  joinEvent,
  leaveEvent,
  getEventParticipants,
  removeParticipant,
  canJoinEvent,
} from "./participationController";
import {
  getEventReviews,
  checkUserReview,
  createReview,
  updateReview,
  deleteReview,
} from "../review/reviewController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/", getEvents);
router.get("/host/:hostId", getEventsByHost);
router.get("/:id", getEvent);
router.get("/:id/reviews", getEventReviews);

router.use(protect);

router.get("/my/participated-events", getMyParticipatedEvents);
router.get("/my/events", getMyEvents);
router.get("/joined/events", getJoinedEvents);
router.get("/events/rating", getEventsByRating);
router.get("/events/top-rated", getTopRatedEvents);

router.post("/upload-image", uploadEventImage, uploadImage);
router.post("/", uploadEventImage, createEvent);
router.put("/:id", uploadEventImage, updateEvent);
router.delete("/:id", deleteEvent);

router.post("/:id/join", joinEvent);
router.post("/:id/leave", leaveEvent);
router.get("/:id/participants", getEventParticipants);
router.delete("/:id/participants/:userId", removeParticipant);
router.get("/:id/can-join", canJoinEvent);

router.get("/:id/reviews/check", checkUserReview);
router.post("/:id/reviews", createReview);
router.put("/:id/reviews/:reviewId", updateReview);
router.delete("/:id/reviews/:reviewId", deleteReview);

export default router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reviewController_1 = require("./reviewController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes
router.get("/events/:eventId/reviews", reviewController_1.getEventReviews);
router.get("/host/:hostId/reviews", reviewController_1.getHostReviews);
// Protected routes
router.use(auth_1.protect);
router.get("/events/:eventId/reviews/check", reviewController_1.checkUserReview);
router.post("/events/:eventId/reviews", reviewController_1.createReview);
router.put("/events/:eventId/reviews/:reviewId", reviewController_1.updateReview);
router.delete("/events/:eventId/reviews/:reviewId", reviewController_1.deleteReview);
exports.default = router;

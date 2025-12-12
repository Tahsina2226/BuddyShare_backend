"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHostReviews = exports.deleteReview = exports.updateReview = exports.createReview = exports.checkUserReview = exports.getEventReviews = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Review_1 = __importDefault(require("./Review"));
const event_1 = __importDefault(require("../events/event"));
const user_1 = __importDefault(require("../user/user"));
const asyncHandler_1 = require("../utils/asyncHandler");
const errorResponse_1 = require("../utils/errorResponse");
const updateHostRating = (hostId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reviews = yield Review_1.default.find({ host: hostId });
        if (reviews.length === 0) {
            yield user_1.default.findByIdAndUpdate(hostId, {
                averageRating: 0,
                totalReviews: 0,
            });
            return;
        }
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;
        yield user_1.default.findByIdAndUpdate(hostId, {
            averageRating: parseFloat(averageRating.toFixed(1)),
            totalReviews: reviews.length,
        }, { new: true });
    }
    catch (error) {
        console.error("Error updating host rating:", error);
    }
});
exports.getEventReviews = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    // Validate event ID
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw (0, errorResponse_1.createError)("Invalid event ID", 400);
    }
    const reviews = yield Review_1.default.find({ event: id })
        .populate("user", "name avatar")
        .sort({ createdAt: -1 });
    res.json({
        success: true,
        data: { reviews },
    });
}));
exports.checkUserReview = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = req.user.userId;
    // Validate event ID
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw (0, errorResponse_1.createError)("Invalid event ID", 400);
    }
    const review = yield Review_1.default.findOne({
        event: id,
        user: userId,
    });
    res.json({
        success: true,
        data: { review: review || null },
    });
}));
exports.createReview = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { rating, comment, hostId } = req.body;
    const userId = req.user.userId;
    const { id } = req.params; // Event ID from params
    if (!rating || !comment || !hostId) {
        throw (0, errorResponse_1.createError)("Rating, comment, and host ID are required", 400);
    }
    // Validate IDs
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw (0, errorResponse_1.createError)("Invalid event ID", 400);
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(hostId)) {
        throw (0, errorResponse_1.createError)("Invalid host ID", 400);
    }
    const event = yield event_1.default.findById(id);
    if (!event) {
        throw (0, errorResponse_1.createError)("Event not found", 404);
    }
    const isParticipant = event.participants.some((participant) => participant.toString() === userId);
    if (!isParticipant) {
        throw (0, errorResponse_1.createError)("You must be a participant to review", 400);
    }
    const existingReview = yield Review_1.default.findOne({
        event: id,
        user: userId,
    });
    if (existingReview) {
        throw (0, errorResponse_1.createError)("You have already reviewed this event", 400);
    }
    const host = yield user_1.default.findById(hostId);
    if (!host) {
        throw (0, errorResponse_1.createError)("Host not found", 404);
    }
    const review = yield Review_1.default.create({
        user: userId,
        host: hostId,
        event: id,
        rating,
        comment,
    });
    yield updateHostRating(hostId);
    yield user_1.default.findByIdAndUpdate(userId, {
        $push: { reviews: review._id },
    });
    res.status(201).json({
        success: true,
        message: "Review created successfully",
        data: { review },
    });
}));
exports.updateReview = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { rating, comment } = req.body;
    const { reviewId, id } = req.params;
    const userId = req.user.userId;
    // Validate IDs
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw (0, errorResponse_1.createError)("Invalid event ID", 400);
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(reviewId)) {
        throw (0, errorResponse_1.createError)("Invalid review ID", 400);
    }
    const review = yield Review_1.default.findById(reviewId);
    if (!review) {
        throw (0, errorResponse_1.createError)("Review not found", 404);
    }
    if (review.user.toString() !== userId) {
        throw (0, errorResponse_1.createError)("Not authorized to update this review", 403);
    }
    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    const updatedReview = yield review.save();
    yield updateHostRating(review.host);
    res.json({
        success: true,
        message: "Review updated successfully",
        data: { review: updatedReview },
    });
}));
exports.deleteReview = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { reviewId, id } = req.params;
    const userId = req.user.userId;
    // Validate IDs
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw (0, errorResponse_1.createError)("Invalid event ID", 400);
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(reviewId)) {
        throw (0, errorResponse_1.createError)("Invalid review ID", 400);
    }
    const review = yield Review_1.default.findById(reviewId);
    if (!review) {
        throw (0, errorResponse_1.createError)("Review not found", 404);
    }
    if (review.user.toString() !== userId) {
        throw (0, errorResponse_1.createError)("Not authorized to delete this review", 403);
    }
    const hostId = review.host;
    yield Review_1.default.findByIdAndDelete(reviewId);
    yield user_1.default.findByIdAndUpdate(userId, {
        $pull: { reviews: reviewId },
    });
    yield updateHostRating(hostId);
    res.json({
        success: true,
        message: "Review deleted successfully",
        data: {},
    });
}));
exports.getHostReviews = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { hostId } = req.params;
    // Validate host ID
    if (!mongoose_1.default.Types.ObjectId.isValid(hostId)) {
        throw (0, errorResponse_1.createError)("Invalid host ID", 400);
    }
    const reviews = yield Review_1.default.find({ host: hostId })
        .populate("user", "name avatar")
        .populate("event", "title")
        .sort({ createdAt: -1 });
    res.json({
        success: true,
        data: { reviews },
    });
}));

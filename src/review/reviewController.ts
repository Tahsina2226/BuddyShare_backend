import { Request, Response } from "express";
import mongoose from "mongoose";
import Review from "./Review";
import Event from "../events/event";
import User from "../user/user";
import { asyncHandler } from "../utils/asyncHandler";
import { createError } from "../utils/errorResponse";

const updateHostRating = async (hostId: mongoose.Types.ObjectId) => {
  try {
    const reviews = await Review.find({ host: hostId });

    if (reviews.length === 0) {
      await User.findByIdAndUpdate(hostId, {
        averageRating: 0,
        totalReviews: 0,
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await User.findByIdAndUpdate(
      hostId,
      {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: reviews.length,
      },
      { new: true }
    );
  } catch (error) {
    console.error("Error updating host rating:", error);
  }
};

export const getEventReviews = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate event ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError("Invalid event ID", 400);
    }

    const reviews = await Review.find({ event: id })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { reviews },
    });
  }
);

export const checkUserReview = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // Validate event ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError("Invalid event ID", 400);
    }

    const review = await Review.findOne({
      event: id,
      user: userId,
    });

    res.json({
      success: true,
      data: { review: review || null },
    });
  }
);

export const createReview = asyncHandler(
  async (req: Request, res: Response) => {
    const { rating, comment, hostId } = req.body;
    const userId = (req as any).user.userId;
    const { id } = req.params; // Event ID from params

    if (!rating || !comment || !hostId) {
      throw createError("Rating, comment, and host ID are required", 400);
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError("Invalid event ID", 400);
    }
    if (!mongoose.Types.ObjectId.isValid(hostId)) {
      throw createError("Invalid host ID", 400);
    }

    const event = await Event.findById(id);
    if (!event) {
      throw createError("Event not found", 404);
    }

    const isParticipant = event.participants.some(
      (participant: mongoose.Types.ObjectId) =>
        participant.toString() === userId
    );

    if (!isParticipant) {
      throw createError("You must be a participant to review", 400);
    }

    const existingReview = await Review.findOne({
      event: id,
      user: userId,
    });

    if (existingReview) {
      throw createError("You have already reviewed this event", 400);
    }

    const host = await User.findById(hostId);
    if (!host) {
      throw createError("Host not found", 404);
    }

    const review = await Review.create({
      user: userId,
      host: hostId,
      event: id,
      rating,
      comment,
    });

    await updateHostRating(hostId);

    await User.findByIdAndUpdate(userId, {
      $push: { reviews: review._id },
    });

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: { review },
    });
  }
);

export const updateReview = asyncHandler(
  async (req: Request, res: Response) => {
    const { rating, comment } = req.body;
    const { reviewId, id } = req.params;
    const userId = (req as any).user.userId;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError("Invalid event ID", 400);
    }
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw createError("Invalid review ID", 400);
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      throw createError("Review not found", 404);
    }

    if (review.user.toString() !== userId) {
      throw createError("Not authorized to update this review", 403);
    }

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;

    const updatedReview = await review.save();

    await updateHostRating(review.host);

    res.json({
      success: true,
      message: "Review updated successfully",
      data: { review: updatedReview },
    });
  }
);

export const deleteReview = asyncHandler(
  async (req: Request, res: Response) => {
    const { reviewId, id } = req.params;
    const userId = (req as any).user.userId;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError("Invalid event ID", 400);
    }
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      throw createError("Invalid review ID", 400);
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      throw createError("Review not found", 404);
    }

    if (review.user.toString() !== userId) {
      throw createError("Not authorized to delete this review", 403);
    }

    const hostId = review.host;

    await Review.findByIdAndDelete(reviewId);

    await User.findByIdAndUpdate(userId, {
      $pull: { reviews: reviewId },
    });

    await updateHostRating(hostId);

    res.json({
      success: true,
      message: "Review deleted successfully",
      data: {},
    });
  }
);

export const getHostReviews = asyncHandler(
  async (req: Request, res: Response) => {
    const { hostId } = req.params;

    // Validate host ID
    if (!mongoose.Types.ObjectId.isValid(hostId)) {
      throw createError("Invalid host ID", 400);
    }

    const reviews = await Review.find({ host: hostId })
      .populate("user", "name avatar")
      .populate("event", "title")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { reviews },
    });
  }
);

import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
  user: mongoose.Types.ObjectId;
  host: mongoose.Types.ObjectId;
  event: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot be more than 5"],
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      maxlength: [500, "Comment cannot be more than 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one review per user per event
reviewSchema.index({ user: 1, event: 1 }, { unique: true });

// Index for host to get all reviews
reviewSchema.index({ host: 1 });

// Index for event-based reviews
reviewSchema.index({ event: 1 });

export default mongoose.model<IReview>("Review", reviewSchema);

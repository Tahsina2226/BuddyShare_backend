import mongoose, { Document, Schema } from "mongoose";

export interface IEvent extends Document {
  title: string;
  description: string;
  eventType: string;
  date: Date;
  time: string;
  location: string;
  address: string;
  host: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  maxParticipants: number;
  currentParticipants: number;
  joiningFee: number;
  image: string;
  status: "open" | "full" | "cancelled" | "completed";
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      maxlength: [1000, "Description cannot be more than 1000 characters"],
    },
    eventType: {
      type: String,
      required: [true, "Event type is required"],
      enum: [
        "concert",
        "hiking",
        "dinner",
        "games",
        "sports",
        "tech",
        "art",
        "education",
        "other",
      ],
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
    },
    time: {
      type: String,
      required: [true, "Event time is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    maxParticipants: {
      type: Number,
      required: [true, "Maximum participants is required"],
      min: [1, "Must have at least 1 participant"],
      max: [1000, "Cannot have more than 1000 participants"],
    },
    currentParticipants: {
      type: Number,
      default: 0,
    },
    joiningFee: {
      type: Number,
      required: true,
      min: [0, "Joining fee cannot be negative"],
      default: 0,
    },
    image: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["open", "full", "cancelled", "completed"],
      default: "open",
    },
    category: {
      type: String,
      required: [true, "Category is required"],
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
eventSchema.index({ host: 1 });
eventSchema.index({ eventType: 1 });
eventSchema.index({ location: 1 });
eventSchema.index({ date: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ category: 1 });

// Virtual property
eventSchema.virtual("isFull").get(function () {
  return this.currentParticipants >= this.maxParticipants;
});

// Pre-save hook (NO next() needed)
eventSchema.pre("save", function () {
  if (this.currentParticipants >= this.maxParticipants) {
    this.status = "full";
  } else if (
    this.status === "full" &&
    this.currentParticipants < this.maxParticipants
  ) {
    this.status = "open";
  }
});

export default mongoose.model<IEvent>("Event", eventSchema);



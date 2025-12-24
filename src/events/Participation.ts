import mongoose, { Document, Schema, UpdateQuery } from "mongoose";

export interface IParticipation extends Document {
  userId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  status: "joined" | "attended" | "cancelled";
  paymentStatus: "pending" | "paid" | "free";
  joinedAt: Date;
  attendedAt?: Date;
}

const participationSchema = new Schema<IParticipation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["joined", "attended", "cancelled"],
      default: "joined",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "free"],
      default: "pending",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    attendedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

participationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

participationSchema.post("save", async function (doc) {
  try {
    if (doc.status === "joined") {
      await mongoose.model("Event").findByIdAndUpdate(doc.eventId, {
        $addToSet: { participants: doc.userId },
        $inc: { currentParticipants: 1 },
      });
    }
  } catch (error) {
    console.error("Error updating event participants:", error);
  }
});

participationSchema.post("findOneAndUpdate", async function (doc) {
  try {
    const update = this.getUpdate() as UpdateQuery<IParticipation>;
    
    if (doc && update?.status === "cancelled") {
      await mongoose.model("Event").findByIdAndUpdate(doc.eventId, {
        $pull: { participants: doc.userId },
        $inc: { currentParticipants: -1 },
      });
    }
  } catch (error) {
    console.error("Error updating event on participation cancellation:", error);
  }
});

export default mongoose.model<IParticipation>(
  "Participation",
  participationSchema
);
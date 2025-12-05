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
  hostName: string;
  hostEmail: string;
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
      maxlength: [5000, "Description cannot be more than 5000 characters"],
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
        "workshop",
        "seminar",
        "party",
        "festival",
        "meetup",
        "conference",
        "charity",
        "fitness",
        "travel",
        "food",
        "music",
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
      maxlength: [200, "Location cannot be more than 200 characters"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      maxlength: [500, "Address cannot be more than 500 characters"],
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hostName: {
      type: String,
      required: true,
    },
    hostEmail: {
      type: String,
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
      max: [5000, "Cannot have more than 5000 participants"],
    },
    currentParticipants: {
      type: Number,
      default: 0,
      min: [0, "Current participants cannot be negative"],
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
      validate: {
        validator: function(v: string) {
          if (!v) return true;
          return v.startsWith('http') || v.startsWith('/uploads/') || v.startsWith('data:image');
        },
        message: 'Image must be a valid URL or base64 data URI'
      }
    },
    status: {
      type: String,
      enum: ["open", "full", "cancelled", "completed"],
      default: "open",
      index: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Music",
        "Sports",
        "Education",
        "Food",
        "Travel",
        "Art",
        "Technology",
        "Business",
        "Health",
        "Charity",
        "Social",
        "Fitness",
        "Outdoor",
        "Entertainment",
        "Workshop",
        "Networking",
        "Family",
        "Games",
        "Other",
      ],
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [50, "Tag cannot be more than 50 characters"],
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

eventSchema.index({ eventType: 1 });
eventSchema.index({ location: "text" });
eventSchema.index({ date: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ host: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ joiningFee: 1 });

eventSchema.virtual("isFull").get(function () {
  return this.currentParticipants >= this.maxParticipants;
});

eventSchema.virtual("availableSpots").get(function () {
  return Math.max(0, this.maxParticipants - this.currentParticipants);
});

eventSchema.virtual("isPast").get(function () {
  return this.date < new Date();
});

eventSchema.virtual("formattedDate").get(function () {
  return this.date.toISOString().split('T')[0];
});

eventSchema.virtual("formattedTime").get(function () {
  const [hours, minutes] = this.time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${ampm}`;
});

eventSchema.pre("save", async function() {
  if (this.currentParticipants >= this.maxParticipants) {
    this.status = "full";
  } else if (this.status === "full" && this.currentParticipants < this.maxParticipants) {
    this.status = "open";
  }

  if (this.date < new Date()) {
    if (this.status === "open" || this.status === "full") {
      this.status = "completed";
    }
  }

  if (this.tags && this.tags.length > 0) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim());
    this.tags = [...new Set(this.tags)];
  }
});

eventSchema.pre("findOneAndUpdate", async function() {
  const update = this.getUpdate() as any;
  
  if (update.currentParticipants !== undefined && update.maxParticipants !== undefined) {
    if (update.currentParticipants >= update.maxParticipants) {
      update.status = "full";
    } else if (update.status === "full" && update.currentParticipants < update.maxParticipants) {
      update.status = "open";
    }
  }
  
  if (update.date && new Date(update.date) < new Date()) {
    if (update.status === "open" || update.status === "full") {
      update.status = "completed";
    }
  }

  if (update.tags && Array.isArray(update.tags)) {
    update.tags = update.tags.map((tag: string) => tag.toLowerCase().trim());
    update.tags = [...new Set(update.tags)];
  }

  this.setUpdate(update);
});

eventSchema.methods.checkAndUpdateStatus = function() {
  if (this.currentParticipants >= this.maxParticipants) {
    this.status = "full";
  } else if (this.status === "full" && this.currentParticipants < this.maxParticipants) {
    this.status = "open";
  }
  
  if (this.date < new Date()) {
    if (this.status === "open" || this.status === "full") {
      this.status = "completed";
    }
  }
  
  return this;
};

eventSchema.statics.getAvailableEvents = function() {
  return this.find({
    status: "open",
    date: { $gte: new Date() }
  }).sort({ date: 1 });
};

eventSchema.statics.getEventsByHost = function(hostId: mongoose.Types.ObjectId) {
  return this.find({ host: hostId }).sort({ createdAt: -1 });
};

eventSchema.statics.getUpcomingEvents = function(limit = 10) {
  return this.find({
    status: "open",
    date: { $gte: new Date() }
  })
  .sort({ date: 1 })
  .limit(limit);
};

eventSchema.statics.searchEvents = function(searchTerm: string) {
  return this.find({
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { location: { $regex: searchTerm, $options: 'i' } },
      { category: { $regex: searchTerm, $options: 'i' } },
      { tags: { $regex: searchTerm, $options: 'i' } }
    ],
    status: "open",
    date: { $gte: new Date() }
  }).sort({ date: 1 });
};

export default mongoose.model<IEvent>("Event", eventSchema);
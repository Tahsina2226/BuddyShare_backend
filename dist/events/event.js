"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const eventSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
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
            type: mongoose_1.Schema.Types.ObjectId,
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
            validator: function (v) {
                if (!v)
                    return true;
                return (v.startsWith("http") ||
                    v.startsWith("/uploads/") ||
                    v.startsWith("data:image"));
            },
            message: "Image must be a valid URL or base64 data URI",
        },
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
            "Food & Drink",
            "Travel",
            "Art",
            "Art & Culture",
            "Technology",
            "Tech",
            "Business",
            "Health",
            "Wellness",
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
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Indexes
eventSchema.index({ eventType: 1 });
eventSchema.index({ location: "text" });
eventSchema.index({ date: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ host: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ joiningFee: 1 });
// Virtuals
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
    return this.date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
});
eventSchema.virtual("formattedTime").get(function () {
    const [hours, minutes] = this.time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
});
// Host rating virtuals (for populating from User model)
eventSchema.virtual("hostRating", {
    ref: "User",
    localField: "host",
    foreignField: "_id",
    justOne: true,
    options: {
        select: "name avatar averageRating totalReviews eventsHosted bio location",
    },
});
// Event creation এ host এর eventsHosted increment করার middleware
eventSchema.post("save", function (doc, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Only increment if this is a new event
            if (doc.isNew) {
                yield mongoose_1.default.model("User").findByIdAndUpdate(doc.host, {
                    $inc: { eventsHosted: 1 },
                });
            }
            next();
        }
        catch (error) {
            console.error("Error updating eventsHosted:", error);
            next(error);
        }
    });
});
// Event deletion এ host এর eventsHosted decrement করার middleware
eventSchema.post("findOneAndDelete", function (doc) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (doc) {
                yield mongoose_1.default.model("User").findByIdAndUpdate(doc.host, {
                    $inc: { eventsHosted: -1 },
                });
            }
        }
        catch (error) {
            console.error("Error updating eventsHosted on event delete:", error);
        }
    });
});
// Event update এ participants count update করলে status check করার middleware
eventSchema.pre("save", function () {
    return __awaiter(this, void 0, void 0, function* () {
        // Update status based on participants
        if (this.currentParticipants >= this.maxParticipants) {
            this.status = "full";
        }
        else if (this.status === "full" &&
            this.currentParticipants < this.maxParticipants) {
            this.status = "open";
        }
        // Update status based on date
        if (this.date < new Date()) {
            if (this.status === "open" || this.status === "full") {
                this.status = "completed";
            }
        }
        // Clean up tags
        if (this.tags && this.tags.length > 0) {
            this.tags = this.tags.map((tag) => tag.toLowerCase().trim());
            this.tags = [...new Set(this.tags)];
        }
    });
});
eventSchema.pre("findOneAndUpdate", function () {
    return __awaiter(this, void 0, void 0, function* () {
        const update = this.getUpdate();
        // Update status based on participants
        if (update.currentParticipants !== undefined &&
            update.maxParticipants !== undefined) {
            if (update.currentParticipants >= update.maxParticipants) {
                update.status = "full";
            }
            else if (update.status === "full" &&
                update.currentParticipants < update.maxParticipants) {
                update.status = "open";
            }
        }
        // Update status based on date
        if (update.date && new Date(update.date) < new Date()) {
            if (update.status === "open" || update.status === "full") {
                update.status = "completed";
            }
        }
        // Clean up tags
        if (update.tags && Array.isArray(update.tags)) {
            update.tags = update.tags.map((tag) => tag.toLowerCase().trim());
            update.tags = [...new Set(update.tags)];
        }
        this.setUpdate(update);
    });
});
// Methods
eventSchema.methods.checkAndUpdateStatus = function () {
    if (this.currentParticipants >= this.maxParticipants) {
        this.status = "full";
    }
    else if (this.status === "full" &&
        this.currentParticipants < this.maxParticipants) {
        this.status = "open";
    }
    if (this.date < new Date()) {
        if (this.status === "open" || this.status === "full") {
            this.status = "completed";
        }
    }
    return this;
};
// Statics
eventSchema.statics.getAvailableEvents = function () {
    return this.find({
        status: "open",
        date: { $gte: new Date() },
    })
        .populate("host", "name avatar averageRating totalReviews")
        .sort({ date: 1 });
};
eventSchema.statics.getEventsByHost = function (hostId) {
    return this.find({ host: hostId })
        .populate("host", "name avatar averageRating totalReviews")
        .sort({ createdAt: -1 });
};
eventSchema.statics.getUpcomingEvents = function (limit = 10) {
    return this.find({
        status: "open",
        date: { $gte: new Date() },
    })
        .populate("host", "name avatar averageRating totalReviews")
        .sort({ date: 1 })
        .limit(limit);
};
eventSchema.statics.searchEvents = function (searchTerm) {
    return this.find({
        $or: [
            { title: { $regex: searchTerm, $options: "i" } },
            { description: { $regex: searchTerm, $options: "i" } },
            { location: { $regex: searchTerm, $options: "i" } },
            { category: { $regex: searchTerm, $options: "i" } },
            { tags: { $regex: searchTerm, $options: "i" } },
        ],
        status: "open",
        date: { $gte: new Date() },
    })
        .populate("host", "name avatar averageRating totalReviews")
        .sort({ date: 1 });
};
// Helper method to get event with populated host rating
eventSchema.statics.getEventWithHostRating = function (eventId) {
    return this.findById(eventId)
        .populate("host", "name avatar averageRating totalReviews eventsHosted bio location")
        .populate("participants", "name avatar");
};
exports.default = mongoose_1.default.model("Event", eventSchema);

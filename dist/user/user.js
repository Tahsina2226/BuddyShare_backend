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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    password: {
        type: String,
        minlength: 6,
        select: false,
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    role: {
        type: String,
        enum: ["user", "host", "admin"],
        default: "user",
    },
    avatar: { type: String, default: "" },
    bio: { type: String, maxlength: 500, default: "" },
    interests: [{ type: String, trim: true }],
    location: { type: String, required: true, trim: true },
    isVerified: { type: Boolean, default: false },
    isGoogleUser: { type: Boolean, default: false },
    profileImage: { type: String },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    reviews: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
    eventsHosted: { type: Number, default: 0 },
    hostRequest: {
        requested: { type: Boolean, default: false },
        requestedAt: { type: Date },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        reason: { type: String, maxlength: 1000 },
        approvedAt: { type: Date },
        approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
        rejectedAt: { type: Date },
        rejectedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
        rejectionReason: { type: String, maxlength: 1000 },
    },
}, { timestamps: true });
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ location: 1 });
userSchema.index({ interests: 1 });
userSchema.index({ averageRating: -1 });
userSchema.index({ "hostRequest.status": 1 });
userSchema.index({ "hostRequest.requestedAt": -1 });
userSchema.index({ role: 1, "hostRequest.status": 1 });
userSchema.virtual("formattedRating").get(function () {
    return this.averageRating.toFixed(1);
});
userSchema.virtual("starRating").get(function () {
    const stars = Math.round(this.averageRating);
    return "★".repeat(stars) + "☆".repeat(5 - stars);
});
userSchema.virtual("hostStatus").get(function () {
    var _a;
    if (this.role === "host" || this.role === "admin") {
        return "active_host";
    }
    if ((_a = this.hostRequest) === null || _a === void 0 ? void 0 : _a.requested)
        return this.hostRequest.status;
    return "not_requested";
});
userSchema.virtual("readableHostStatus").get(function () {
    var _a;
    if (this.role === "host")
        return "Host";
    if (this.role === "admin")
        return "Admin";
    if ((_a = this.hostRequest) === null || _a === void 0 ? void 0 : _a.requested) {
        switch (this.hostRequest.status) {
            case "pending":
                return "Pending Approval";
            case "approved":
                return "Host (Approved)";
            case "rejected":
                return "Request Rejected";
            default:
                return "Not a Host";
        }
    }
    return "Not a Host";
});
// Solution 1: Use type assertion for the schema
userSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.isModified("password") || !this.password)
            return next();
        try {
            const salt = yield bcryptjs_1.default.genSalt(12);
            this.password = yield bcryptjs_1.default.hash(this.password, salt);
            next();
        }
        catch (error) {
            next(error);
        }
    });
});
userSchema.methods.comparePassword = function (candidatePassword) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.password)
            return false;
        return bcryptjs_1.default.compare(candidatePassword, this.password);
    });
};
userSchema.methods.requestHostStatus = function (reason) {
    this.hostRequest = Object.assign(Object.assign({}, this.hostRequest), { requested: true, requestedAt: new Date(), status: "pending", reason: reason || "" });
    return this.save();
};
userSchema.methods.approveHostRequest = function (adminId) {
    this.role = "host";
    this.hostRequest = Object.assign(Object.assign({}, this.hostRequest), { status: "approved", approvedAt: new Date(), approvedBy: adminId });
    return this.save();
};
userSchema.methods.rejectHostRequest = function (adminId, reason) {
    this.hostRequest = Object.assign(Object.assign({}, this.hostRequest), { status: "rejected", rejectedAt: new Date(), rejectedBy: adminId, rejectionReason: reason });
    return this.save();
};
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};
exports.default = mongoose_1.default.model("User", userSchema);

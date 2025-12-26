import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  role: "user" | "host" | "admin";
  avatar?: string;
  bio?: string;
  interests: string[];
  location: string;
  isVerified: boolean;
  isGoogleUser?: boolean;
  profileImage?: string;

  averageRating: number;
  totalReviews: number;
  reviews: mongoose.Types.ObjectId[];

  eventsHosted: number;

  hostRequest?: {
    requested: boolean;
    requestedAt?: Date;
    status: "pending" | "approved" | "rejected";
    reason?: string;
    approvedAt?: Date;
    approvedBy?: mongoose.Types.ObjectId;
    rejectedAt?: Date;
    rejectedBy?: mongoose.Types.ObjectId;
    rejectionReason?: string;
  };

  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
  requestHostStatus(reason?: string): Promise<IUser>;
  approveHostRequest(adminId: mongoose.Types.ObjectId): Promise<IUser>;
  rejectHostRequest(
    adminId: mongoose.Types.ObjectId,
    reason?: string
  ): Promise<IUser>;
}

const userSchema = new Schema<IUser>(
  {
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
        type: Schema.Types.ObjectId,
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
      approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      rejectedAt: { type: Date },
      rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
      rejectionReason: { type: String, maxlength: 1000 },
    },
  },
  { timestamps: true }
);

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
  if (this.role === "host" || this.role === "admin") {
    return "active_host";
  }
  if (this.hostRequest?.requested) return this.hostRequest.status;
  return "not_requested";
});

userSchema.virtual("readableHostStatus").get(function () {
  if (this.role === "host") return "Host";
  if (this.role === "admin") return "Admin";

  if (this.hostRequest?.requested) {
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

(userSchema as any).pre("save", async function (this: IUser, next: any) {
  if (!this.isModified("password") || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.requestHostStatus = function (reason?: string) {
  this.hostRequest = {
    ...this.hostRequest,
    requested: true,
    requestedAt: new Date(),
    status: "pending",
    reason: reason || "",
  };

  return this.save();
};

userSchema.methods.approveHostRequest = function (
  adminId: mongoose.Types.ObjectId
) {
  this.role = "host";
  this.hostRequest = {
    ...this.hostRequest,
    status: "approved",
    approvedAt: new Date(),
    approvedBy: adminId,
  };

  return this.save();
};

userSchema.methods.rejectHostRequest = function (
  adminId: mongoose.Types.ObjectId,
  reason?: string
) {
  this.hostRequest = {
    ...this.hostRequest,
    status: "rejected",
    rejectedAt: new Date(),
    rejectedBy: adminId,
    rejectionReason: reason,
  };

  return this.save();
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model<IUser>("User", userSchema);
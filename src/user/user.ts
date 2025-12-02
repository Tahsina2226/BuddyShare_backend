import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

// User interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "host" | "admin";
  avatar?: string;
  bio?: string;
  interests: string[];
  location: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

// User Schema
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
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["user", "host", "admin"], default: "user" },
    avatar: { type: String, default: "" },
    bio: { type: String, maxlength: 500, default: "" },
    interests: [{ type: String, trim: true }],
    location: { type: String, required: true, trim: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ location: 1 });
userSchema.index({ interests: 1 });

// Pre-save hook (password hashing)
userSchema.pre<IUser>("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON response
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model<IUser>("User", userSchema);

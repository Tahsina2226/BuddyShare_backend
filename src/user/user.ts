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
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "host", "admin"],
      default: "user",
    },
    avatar: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot be more than 500 characters"],
      default: "",
    },
    interests: [
      {
        type: String,
        trim: true,
      },
    ],
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);


userSchema.index({ email: 1 });
userSchema.index({ location: 1 });
userSchema.index({ interests: 1 });

//  hash password 
(userSchema.pre as any)(
  "save",
  async function (this: IUser, next: (err?: any) => void) {
    if (!this.isModified("password")) return next();

    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  }
);

// Compare password 
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password 
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};


export default mongoose.model<IUser>("User", userSchema);

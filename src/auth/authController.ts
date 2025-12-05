import { Request, Response } from "express";
import User from "../user/user";
import { generateToken } from "../utils/generateToken";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthRequest } from "../middleware/auth"; // strongly typed request

// Register user
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, location } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email, and password");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists with this email");
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || "user",
    location,
    interests: req.body.interests || [],
  });

  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: { user, token },
  });
});

// Login user
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  res.json({
    success: true,
    message: "Login successful",
    data: { user, token },
  });
});

// Get logged-in user info
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const user = await User.findById(req.user.userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({ success: true, data: user });
});

// Update profile
export const updateProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authorized");
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const { name, bio, location, interests, avatar } = req.body;
    user.name = name ?? user.name;
    user.bio = bio ?? user.bio;
    user.location = location ?? user.location;
    user.interests = interests ?? user.interests;
    user.avatar = avatar ?? user.avatar;

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  }
);

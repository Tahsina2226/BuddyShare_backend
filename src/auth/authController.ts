import { Request, Response } from "express";
import User from "../user/user";
import { generateToken } from "../utils/generateToken";
import { asyncHandler } from "../utils/asyncHandler";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, location } = req.body;

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

  if (user) {
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          location: user.location,
          interests: user.interests,
        },
        token,
      },
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  const user = await User.findOne({ email }).select("+password");

  if (user && (await user.comparePassword(password))) {
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          location: user.location,
          interests: user.interests,
          bio: user.bio,
        },
        token,
      },
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById((req as any).user.userId);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        location: user.location,
        interests: user.interests,
        bio: user.bio,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    },
  });
});

export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await User.findById((req as any).user.userId);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const { name, bio, location, interests, avatar } = req.body;

    user.name = name || user.name;
    user.bio = bio || user.bio;
    user.location = location || user.location;
    user.interests = interests || user.interests;
    user.avatar = avatar || user.avatar;

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          avatar: updatedUser.avatar,
          location: updatedUser.location,
          interests: updatedUser.interests,
          bio: updatedUser.bio,
          isVerified: updatedUser.isVerified,
        },
      },
    });
  }
);

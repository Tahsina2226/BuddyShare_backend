import { Request, Response } from "express";
import User from "./user";
import { asyncHandler } from "../utils/asyncHandler";
import { createError } from "../utils/errorResponse";


export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const users = await User.find()
    .select("-password")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments();

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});


export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    throw createError("User not found", 404);
  }

  res.json({
    success: true,
    data: { user },
  });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw createError("User not found", 404);
  }

  const { name, email, role, isVerified, location, interests, bio } = req.body;


  user.name = name || user.name;
  user.email = email || user.email;
  user.role = role || user.role;
  user.isVerified = isVerified !== undefined ? isVerified : user.isVerified;
  user.location = location || user.location;
  user.interests = interests || user.interests;
  user.bio = bio || user.bio;

  const updatedUser = await user.save();

  res.json({
    success: true,
    message: "User updated successfully",
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
        createdAt: updatedUser.createdAt,
      },
    },
  });
});


export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw createError("User not found", 404);
  }

  await User.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "User deleted successfully",
    data: {},
  });
});


export const getUserStats = asyncHandler(
  async (req: Request, res: Response) => {
    const totalUsers = await User.countDocuments();
    const totalHosts = await User.countDocuments({ role: "host" });
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const verifiedUsers = await User.countDocuments({ isVerified: true });

    // Get users created in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalHosts,
        totalAdmins,
        verifiedUsers,
        newUsers,
        regularUsers: totalUsers - totalHosts - totalAdmins,
      },
    });
  }
);

export const updateUserRole = asyncHandler(
  async (req: Request, res: Response) => {
    const { role } = req.body;

    if (!["user", "host", "admin"].includes(role)) {
      throw createError("Invalid role", 400);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      throw createError("User not found", 404);
    }

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: { user },
    });
  }
);


export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
  const { query, role, location } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  let searchFilter: any = {};

  if (query) {
    searchFilter.$or = [
      { name: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } },
    ];
  }

  if (role) {
    searchFilter.role = role;
  }

  if (location) {
    searchFilter.location = { $regex: location, $options: "i" };
  }

  const users = await User.find(searchFilter)
    .select("-password")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(searchFilter);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

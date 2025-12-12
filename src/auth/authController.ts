import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../user/user";
import { generateToken } from "../utils/generateToken";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthRequest } from "../middleware/auth";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const { token: googleToken, email, name } = req.body;

  if (!googleToken) {
    res.status(400);
    throw new Error("Google token is required");
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401);
      throw new Error("Invalid Google token");
    }
    
    const googleId = payload.sub;
    const userEmail = email || payload.email || "";
    const userName = name || payload.name || "";

    if (!userEmail) {
      res.status(400);
      throw new Error("Email is required for Google authentication");
    }

    let user = await User.findOne({
      $or: [
        { googleId },
        { email: userEmail }
      ]
    });

    if (!user) {
      user = await User.create({
        googleId,
        email: userEmail,
        name: userName,
        role: 'user',
        location: 'Unknown',
        profileImage: payload.picture,
        isGoogleUser: true
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.profileImage = payload.picture;
      user.isGoogleUser = true;
      await user.save();
    }

    const jwtToken = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const userResponse = {
      _id: user._id,
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      location: user.location,
      profileImage: user.profileImage,
      googleId: user.googleId,
      isGoogleUser: user.isGoogleUser
    };
    
    res.json({
      success: true,
      message: "Google authentication successful",
      data: {
        user: userResponse,
        token: jwtToken
      }
    });

  } catch (error: any) {
    console.error("Google auth error:", error);
    
    if (error.message?.includes("Token used too late")) {
      res.status(401).json({
        success: false,
        message: "Google token has expired. Please sign in again."
      });
    } else if (error.message?.includes("audience")) {
      res.status(401).json({
        success: false,
        message: "Invalid Google OAuth client configuration"
      });
    } else {
      res.status(401).json({
        success: false,
        message: error.message || "Google authentication failed"
      });
    }
  }
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400);
    throw new Error("Refresh token is required");
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "") as any;
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const newToken = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    res.status(401);
    throw new Error("Invalid or expired refresh token");
  }
});

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

export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Logout successful"
  });
});
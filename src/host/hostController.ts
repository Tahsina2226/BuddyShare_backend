import { Request, Response } from "express";
import User from "../user/user";
import { asyncHandler } from "../utils/asyncHandler";
import { createError } from "../utils/errorResponse";

// @desc    Request to become a host
// @route   POST /api/host/request
// @access  Private
export const requestToBecomeHost = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    const user = await User.findById(userId);

    if (!user) {
      throw createError("User not found", 404);
    }

    if (user.role === "host" || user.role === "admin") {
      throw createError("Already a host or admin", 400);
    }

    user.hostRequest = {
      requested: true,
      requestedAt: new Date(),
      status: "pending",
      reason: req.body.reason || "",
    };

    await user.save();

    res.json({
      success: true,
      message: "Host request submitted successfully",
      data: {
        requestStatus: "pending",
        requestedAt: user.hostRequest.requestedAt,
      },
    });
  }
);

// @desc    Approve host request (Admin only)
// @route   PUT /api/host/approve/:userId
// @access  Private/Admin
export const approveHostRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await User.findById(req.params.userId);

    if (!user) {
      throw createError("User not found", 404);
    }

    if (!user.hostRequest || !user.hostRequest.requested) {
      throw createError("No host request found", 400);
    }

    if (user.role === "host") {
      throw createError("User is already a host", 400);
    }

    user.role = "host";
    user.hostRequest.status = "approved";
    user.hostRequest.approvedAt = new Date();
    user.hostRequest.approvedBy = (req as any).user.userId;

    await user.save();

    res.json({
      success: true,
      message: "Host request approved successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  }
);

// @desc    Reject host request (Admin only)
// @route   PUT /api/host/reject/:userId
// @access  Private/Admin
export const rejectHostRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await User.findById(req.params.userId);

    if (!user) {
      throw createError("User not found", 404);
    }

    if (!user.hostRequest || !user.hostRequest.requested) {
      throw createError("No host request found", 400);
    }

    if (user.hostRequest.status !== "pending") {
      throw createError(`Host request is already ${user.hostRequest.status}`, 400);
    }

    user.hostRequest.status = "rejected";
    user.hostRequest.rejectedAt = new Date();
    user.hostRequest.rejectedBy = (req as any).user.userId;
    user.hostRequest.rejectionReason = req.body.rejectionReason || "";

    await user.save();

    res.json({
      success: true,
      message: "Host request rejected successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          hostRequest: user.hostRequest
        },
      },
    });
  }
);

// @desc    Get all host requests with filtering (Admin only)
// @route   GET /api/host/requests
// @access  Private/Admin
export const getHostRequests = asyncHandler(
  async (req: Request, res: Response) => {
    const { status, search } = req.query;
    
    // Build query
    const query: any = {
      "hostRequest.requested": true
    };

    // Filter by status if provided
    if (status && status !== 'all') {
      query["hostRequest.status"] = status;
    }

    // Text search across multiple fields
    let usersQuery = User.find(query).select("-password");

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      usersQuery = usersQuery.or([
        { name: searchRegex },
        { email: searchRegex },
        { location: searchRegex },
        { "hostRequest.reason": searchRegex },
        { interests: searchRegex }
      ]);
    }

    // Sort by most recent requests first
    usersQuery = usersQuery.sort({ "hostRequest.requestedAt": -1 });

    const users = await usersQuery;

    res.json({
      success: true,
      data: { 
        requests: users,
        total: users.length,
        pending: users.filter((u: any) => u.hostRequest.status === 'pending').length,
        approved: users.filter((u: any) => u.hostRequest.status === 'approved').length,
        rejected: users.filter((u: any) => u.hostRequest.status === 'rejected').length,
      },
    });
  }
);

// @desc    Get user host status
// @route   GET /api/host/status
// @access  Private
export const getHostStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user.userId;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      throw createError("User not found", 404);
    }

    res.json({
      success: true,
      data: {
        isHost: user.role === "host" || user.role === "admin",
        currentRole: user.role,
        hostRequest: user.hostRequest || null,
      },
    });
  }
);

// @desc    Get host request statistics (Admin only)
// @route   GET /api/host/stats
// @access  Private/Admin
export const getHostStats = asyncHandler(
  async (req: Request, res: Response) => {
    const totalRequests = await User.countDocuments({ "hostRequest.requested": true });
    const pendingRequests = await User.countDocuments({ 
      "hostRequest.requested": true,
      "hostRequest.status": "pending"
    });
    const approvedRequests = await User.countDocuments({ 
      "hostRequest.requested": true,
      "hostRequest.status": "approved"
    });
    const rejectedRequests = await User.countDocuments({ 
      "hostRequest.requested": true,
      "hostRequest.status": "rejected"
    });

    // Get recent requests (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRequests = await User.countDocuments({
      "hostRequest.requested": true,
      "hostRequest.requestedAt": { $gte: sevenDaysAgo }
    });

    res.json({
      success: true,
      data: {
        total: totalRequests,
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
        recent: recentRequests,
      },
    });
  }
);

// @desc    Get single host request details (Admin only)
// @route   GET /api/host/requests/:userId
// @access  Private/Admin
export const getHostRequestDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await User.findById(req.params.userId).select("-password");

    if (!user) {
      throw createError("User not found", 404);
    }

    if (!user.hostRequest || !user.hostRequest.requested) {
      throw createError("No host request found for this user", 404);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          location: user.location,
          interests: user.interests,
          bio: user.bio,
          avatar: user.avatar,
          profileImage: user.profileImage,
          averageRating: user.averageRating,
          totalReviews: user.totalReviews,
          eventsHosted: user.eventsHosted,
          isVerified: user.isVerified,
          isGoogleUser: user.isGoogleUser,
          createdAt: user.createdAt,
          hostRequest: user.hostRequest,
        },
      },
    });
  }
);
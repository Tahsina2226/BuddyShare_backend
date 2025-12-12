"use strict";
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
exports.getHostRequestDetails = exports.getHostStats = exports.getHostStatus = exports.getHostRequests = exports.rejectHostRequest = exports.approveHostRequest = exports.requestToBecomeHost = void 0;
const user_1 = __importDefault(require("../user/user"));
const asyncHandler_1 = require("../utils/asyncHandler");
const errorResponse_1 = require("../utils/errorResponse");
// @desc    Request to become a host
// @route   POST /api/host/request
// @access  Private
exports.requestToBecomeHost = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.userId;
    const user = yield user_1.default.findById(userId);
    if (!user) {
        throw (0, errorResponse_1.createError)("User not found", 404);
    }
    if (user.role === "host" || user.role === "admin") {
        throw (0, errorResponse_1.createError)("Already a host or admin", 400);
    }
    user.hostRequest = {
        requested: true,
        requestedAt: new Date(),
        status: "pending",
        reason: req.body.reason || "",
    };
    yield user.save();
    res.json({
        success: true,
        message: "Host request submitted successfully",
        data: {
            requestStatus: "pending",
            requestedAt: user.hostRequest.requestedAt,
        },
    });
}));
// @desc    Approve host request (Admin only)
// @route   PUT /api/host/approve/:userId
// @access  Private/Admin
exports.approveHostRequest = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_1.default.findById(req.params.userId);
    if (!user) {
        throw (0, errorResponse_1.createError)("User not found", 404);
    }
    if (!user.hostRequest || !user.hostRequest.requested) {
        throw (0, errorResponse_1.createError)("No host request found", 400);
    }
    if (user.role === "host") {
        throw (0, errorResponse_1.createError)("User is already a host", 400);
    }
    user.role = "host";
    user.hostRequest.status = "approved";
    user.hostRequest.approvedAt = new Date();
    user.hostRequest.approvedBy = req.user.userId;
    yield user.save();
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
}));
// @desc    Reject host request (Admin only)
// @route   PUT /api/host/reject/:userId
// @access  Private/Admin
exports.rejectHostRequest = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_1.default.findById(req.params.userId);
    if (!user) {
        throw (0, errorResponse_1.createError)("User not found", 404);
    }
    if (!user.hostRequest || !user.hostRequest.requested) {
        throw (0, errorResponse_1.createError)("No host request found", 400);
    }
    if (user.hostRequest.status !== "pending") {
        throw (0, errorResponse_1.createError)(`Host request is already ${user.hostRequest.status}`, 400);
    }
    user.hostRequest.status = "rejected";
    user.hostRequest.rejectedAt = new Date();
    user.hostRequest.rejectedBy = req.user.userId;
    user.hostRequest.rejectionReason = req.body.rejectionReason || "";
    yield user.save();
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
}));
// @desc    Get all host requests with filtering (Admin only)
// @route   GET /api/host/requests
// @access  Private/Admin
exports.getHostRequests = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status, search } = req.query;
    // Build query
    const query = {
        "hostRequest.requested": true
    };
    // Filter by status if provided
    if (status && status !== 'all') {
        query["hostRequest.status"] = status;
    }
    // Text search across multiple fields
    let usersQuery = user_1.default.find(query).select("-password");
    if (search) {
        const searchRegex = new RegExp(search, 'i');
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
    const users = yield usersQuery;
    res.json({
        success: true,
        data: {
            requests: users,
            total: users.length,
            pending: users.filter((u) => u.hostRequest.status === 'pending').length,
            approved: users.filter((u) => u.hostRequest.status === 'approved').length,
            rejected: users.filter((u) => u.hostRequest.status === 'rejected').length,
        },
    });
}));
// @desc    Get user host status
// @route   GET /api/host/status
// @access  Private
exports.getHostStatus = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.userId;
    const user = yield user_1.default.findById(userId).select("-password");
    if (!user) {
        throw (0, errorResponse_1.createError)("User not found", 404);
    }
    res.json({
        success: true,
        data: {
            isHost: user.role === "host" || user.role === "admin",
            currentRole: user.role,
            hostRequest: user.hostRequest || null,
        },
    });
}));
// @desc    Get host request statistics (Admin only)
// @route   GET /api/host/stats
// @access  Private/Admin
exports.getHostStats = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const totalRequests = yield user_1.default.countDocuments({ "hostRequest.requested": true });
    const pendingRequests = yield user_1.default.countDocuments({
        "hostRequest.requested": true,
        "hostRequest.status": "pending"
    });
    const approvedRequests = yield user_1.default.countDocuments({
        "hostRequest.requested": true,
        "hostRequest.status": "approved"
    });
    const rejectedRequests = yield user_1.default.countDocuments({
        "hostRequest.requested": true,
        "hostRequest.status": "rejected"
    });
    // Get recent requests (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentRequests = yield user_1.default.countDocuments({
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
}));
// @desc    Get single host request details (Admin only)
// @route   GET /api/host/requests/:userId
// @access  Private/Admin
exports.getHostRequestDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_1.default.findById(req.params.userId).select("-password");
    if (!user) {
        throw (0, errorResponse_1.createError)("User not found", 404);
    }
    if (!user.hostRequest || !user.hostRequest.requested) {
        throw (0, errorResponse_1.createError)("No host request found for this user", 404);
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
}));

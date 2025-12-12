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
exports.searchUsers = exports.updateUserRole = exports.getUserStats = exports.deleteUser = exports.updateUser = exports.getUser = exports.getUsers = void 0;
const user_1 = __importDefault(require("./user"));
const asyncHandler_1 = require("../utils/asyncHandler");
const errorResponse_1 = require("../utils/errorResponse");
exports.getUsers = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const users = yield user_1.default.find()
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
    const total = yield user_1.default.countDocuments();
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
}));
exports.getUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_1.default.findById(req.params.id).select("-password");
    if (!user) {
        throw (0, errorResponse_1.createError)("User not found", 404);
    }
    res.json({
        success: true,
        data: { user },
    });
}));
exports.updateUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_1.default.findById(req.params.id);
    if (!user) {
        throw (0, errorResponse_1.createError)("User not found", 404);
    }
    const { name, email, role, isVerified, location, interests, bio } = req.body;
    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.isVerified = isVerified !== undefined ? isVerified : user.isVerified;
    user.location = location || user.location;
    user.interests = interests || user.interests;
    user.bio = bio || user.bio;
    const updatedUser = yield user.save();
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
}));
exports.deleteUser = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_1.default.findById(req.params.id);
    if (!user) {
        throw (0, errorResponse_1.createError)("User not found", 404);
    }
    yield user_1.default.findByIdAndDelete(req.params.id);
    res.json({
        success: true,
        message: "User deleted successfully",
        data: {},
    });
}));
exports.getUserStats = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const totalUsers = yield user_1.default.countDocuments();
    const totalHosts = yield user_1.default.countDocuments({ role: "host" });
    const totalAdmins = yield user_1.default.countDocuments({ role: "admin" });
    const verifiedUsers = yield user_1.default.countDocuments({ isVerified: true });
    // Get users created in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsers = yield user_1.default.countDocuments({
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
}));
exports.updateUserRole = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { role } = req.body;
    if (!["user", "host", "admin"].includes(role)) {
        throw (0, errorResponse_1.createError)("Invalid role", 400);
    }
    const user = yield user_1.default.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).select("-password");
    if (!user) {
        throw (0, errorResponse_1.createError)("User not found", 404);
    }
    res.json({
        success: true,
        message: `User role updated to ${role}`,
        data: { user },
    });
}));
exports.searchUsers = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { query, role, location } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    let searchFilter = {};
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
    const users = yield user_1.default.find(searchFilter)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
    const total = yield user_1.default.countDocuments(searchFilter);
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
}));

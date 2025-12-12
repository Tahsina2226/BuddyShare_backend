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
exports.logout = exports.updateProfile = exports.getMe = exports.refreshToken = exports.googleAuth = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const google_auth_library_1 = require("google-auth-library");
const user_1 = __importDefault(require("../user/user"));
const generateToken_1 = require("../utils/generateToken");
const asyncHandler_1 = require("../utils/asyncHandler");
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.register = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, role, location } = req.body;
    if (!name || !email || !password) {
        res.status(400);
        throw new Error("Please provide name, email, and password");
    }
    const userExists = yield user_1.default.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error("User already exists with this email");
    }
    const user = yield user_1.default.create({
        name,
        email,
        password,
        role: role || "user",
        location,
        interests: req.body.interests || [],
    });
    const token = (0, generateToken_1.generateToken)({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
    });
    res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: { user, token },
    });
}));
exports.login = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400);
        throw new Error("Please provide email and password");
    }
    const user = yield user_1.default.findOne({ email }).select("+password");
    if (!user || !(yield user.comparePassword(password))) {
        res.status(401);
        throw new Error("Invalid email or password");
    }
    const token = (0, generateToken_1.generateToken)({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
    });
    res.json({
        success: true,
        message: "Login successful",
        data: { user, token },
    });
}));
exports.googleAuth = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { token: googleToken, email, name } = req.body;
    if (!googleToken) {
        res.status(400);
        throw new Error("Google token is required");
    }
    try {
        const ticket = yield client.verifyIdToken({
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
        let user = yield user_1.default.findOne({
            $or: [
                { googleId },
                { email: userEmail }
            ]
        });
        if (!user) {
            user = yield user_1.default.create({
                googleId,
                email: userEmail,
                name: userName,
                role: 'user',
                location: 'Unknown',
                profileImage: payload.picture,
                isGoogleUser: true
            });
        }
        else if (!user.googleId) {
            user.googleId = googleId;
            user.profileImage = payload.picture;
            user.isGoogleUser = true;
            yield user.save();
        }
        const jwtToken = (0, generateToken_1.generateToken)({
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
    }
    catch (error) {
        console.error("Google auth error:", error);
        if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("Token used too late")) {
            res.status(401).json({
                success: false,
                message: "Google token has expired. Please sign in again."
            });
        }
        else if ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("audience")) {
            res.status(401).json({
                success: false,
                message: "Invalid Google OAuth client configuration"
            });
        }
        else {
            res.status(401).json({
                success: false,
                message: error.message || "Google authentication failed"
            });
        }
    }
}));
exports.refreshToken = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        res.status(400);
        throw new Error("Refresh token is required");
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "");
        const user = yield user_1.default.findById(decoded.userId);
        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }
        const newToken = (0, generateToken_1.generateToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });
        const newRefreshToken = jsonwebtoken_1.default.sign({ userId: user._id.toString() }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "", { expiresIn: "7d" });
        res.json({
            success: true,
            data: {
                token: newToken,
                refreshToken: newRefreshToken
            }
        });
    }
    catch (error) {
        res.status(401);
        throw new Error("Invalid or expired refresh token");
    }
}));
exports.getMe = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        res.status(401);
        throw new Error("Not authorized");
    }
    const user = yield user_1.default.findById(req.user.userId);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    res.json({ success: true, data: user });
}));
exports.updateProfile = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        res.status(401);
        throw new Error("Not authorized");
    }
    const user = yield user_1.default.findById(req.user.userId);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }
    const { name, bio, location, interests, avatar } = req.body;
    user.name = name !== null && name !== void 0 ? name : user.name;
    user.bio = bio !== null && bio !== void 0 ? bio : user.bio;
    user.location = location !== null && location !== void 0 ? location : user.location;
    user.interests = interests !== null && interests !== void 0 ? interests : user.interests;
    user.avatar = avatar !== null && avatar !== void 0 ? avatar : user.avatar;
    yield user.save();
    res.json({
        success: true,
        message: "Profile updated successfully",
        data: user,
    });
}));
exports.logout = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({
        success: true,
        message: "Logout successful"
    });
}));

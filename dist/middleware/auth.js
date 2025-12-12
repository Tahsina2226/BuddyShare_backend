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
exports.testAuth = exports.authorize = exports.protect = void 0;
const generateToken_1 = require("../utils/generateToken");
const user_1 = __importDefault(require("../user/user")); // Add this import
// Protect middleware with detailed error handling
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let token;
        // 1. Check Authorization header first
        const authHeader = req.headers.authorization;
        console.log("Authorization header:", authHeader);
        if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
        // 2. Check cookies as fallback
        else if ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token) {
            token = req.cookies.token;
        }
        // 3. Check for token in query params (for testing)
        else if (req.query.token) {
            token = req.query.token;
        }
        // If no token found
        if (!token) {
            console.error("No token provided from any source");
            return res.status(401).json({
                success: false,
                message: "Not authorized, please login",
            });
        }
        // Clean the token - remove any quotes and trim whitespace
        const cleanToken = token.replace(/^['"]|['"]$/g, "").trim();
        // Log token length for debugging (first 10 chars only)
        console.log(`Token length: ${cleanToken.length} chars`);
        console.log(`Token sample: ${cleanToken.substring(0, 20)}...`);
        // Verify token
        let decoded;
        try {
            decoded = (0, generateToken_1.verifyToken)(cleanToken);
            console.log("Token decoded successfully for user:", decoded.email);
        }
        catch (err) {
            console.error("Token verification failed:", {
                name: err.name,
                message: err.message,
                stack: err.stack,
            });
            if (err.name === "JsonWebTokenError") {
                console.error("Token string that caused error:", cleanToken);
                return res.status(401).json({
                    success: false,
                    message: "Invalid token format",
                    error: err.message,
                });
            }
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Session expired, please login again",
                });
            }
            return res.status(401).json({
                success: false,
                message: "Authentication failed",
                error: err.message,
            });
        }
        // Optional: Verify user still exists in database
        try {
            const user = yield user_1.default.findById(decoded.userId).select("_id email role");
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "User no longer exists",
                });
            }
            // Attach user info to request
            req.user = {
                userId: user._id.toString(),
                email: user.email,
                role: user.role,
            };
            console.log(`User authenticated: ${user.email} (${user.role})`);
        }
        catch (dbError) {
            console.error("Database error during authentication:", dbError);
            return res.status(500).json({
                success: false,
                message: "Authentication service error",
            });
        }
        next();
    }
    catch (error) {
        console.error("Unexpected error in protect middleware:", {
            error: error.message,
            stack: error.stack,
        });
        res.status(500).json({
            success: false,
            message: "Internal server error during authentication",
        });
    }
});
exports.protect = protect;
// Authorize middleware (role-based access)
const authorize = (...roles) => {
    return (req, res, next) => {
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        if (!roles.includes(authReq.user.role)) {
            console.warn(`Access denied for user ${authReq.user.email} (role: ${authReq.user.role}). Required roles: ${roles.join(", ")}`);
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this resource",
            });
        }
        next();
    };
};
exports.authorize = authorize;
// Optional: Add a simple test endpoint to verify auth is working
const testAuth = (req, res) => {
    const authReq = req;
    if (!authReq.user) {
        return res.json({
            success: false,
            message: "No user found in request",
        });
    }
    res.json({
        success: true,
        message: "Authentication is working",
        user: authReq.user,
        headers: {
            authorization: req.headers.authorization,
        },
    });
};
exports.testAuth = testAuth;

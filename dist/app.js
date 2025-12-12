"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const authRoute_1 = __importDefault(require("./auth/authRoute"));
const userRoute_1 = __importDefault(require("./user/userRoute"));
const eventRoute_1 = __importDefault(require("./events/eventRoute"));
const searchRoute_1 = __importDefault(require("./events/searchRoute"));
const reviewRoutes_1 = __importDefault(require("./review/reviewRoutes"));
const paymentRoutes_1 = __importDefault(require("./payment/paymentRoutes"));
const host_1 = __importDefault(require("./host/host"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
app.get("/", (req, res) => {
    res.send(`
    <h1>BuddyShare API</h1>
    <p>Welcome to your Events & Activities Backend</p>
  `);
});
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString(),
        uploadsPath: path_1.default.join(process.cwd(), "uploads"),
        routes: {
            auth: "/api/auth",
            users: "/api/users",
            events: "/api/events",
            search: "/api/search",
            reviews: "/api/reviews",
            payments: "/api/payments",
            host: "/api/host",
        },
    });
});
app.use("/api/auth", authRoute_1.default);
app.use("/api/users", userRoute_1.default);
app.use("/api/events", eventRoute_1.default);
app.use("/api/search", searchRoute_1.default);
app.use("/api/reviews", reviewRoutes_1.default);
app.use("/api/payments", paymentRoutes_1.default);
app.use("/api/host", host_1.default);
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        availableRoutes: [
            "/api/auth",
            "/api/users",
            "/api/events",
            "/api/search",
            "/api/reviews",
            "/api/payments",
            "/api/host",
        ], // Added missing closing bracket for the array
    });
});
app.use((err, req, res, next) => {
    console.error("🔥 Error:", err.message);
    console.error(err.stack);
    if (err.name === "MulterError") {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "File size is too large. Maximum size is 5MB",
            });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
                success: false,
                message: "Too many files. Only one file is allowed",
            });
        }
        return res.status(400).json({
            success: false,
            message: `File upload error: ${err.message}`,
        });
    }
    if (err.code === "ENOENT") {
        return res.status(404).json({
            success: false,
            message: "File not found",
        });
    }
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(statusCode).json(Object.assign({ success: false, message }, (process.env.NODE_ENV === "development" && { stack: err.stack })));
});
exports.default = app;

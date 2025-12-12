import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./auth/authRoute";
import userRoutes from "./user/userRoute";
import eventRoutes from "./events/eventRoute";
import searchRoutes from "./events/searchRoute";
import reviewRoutes from "./review/reviewRoutes";
import paymentRoutes from "./payment/paymentRoutes";
import hostRoutes from "./host/host";
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req: Request, res: Response) => {
  res.send(`
    <h1>BuddyShare API</h1>
    <p>Welcome to your Events & Activities Backend</p>
  `);
});

app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uploadsPath: path.join(process.cwd(), "uploads"),
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

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/host", hostRoutes);

app.use((req: Request, res: Response) => {
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

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;

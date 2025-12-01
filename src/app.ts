import express from "express";
import cors from "cors";
import authRoutes from "./auth/authRoute";
import userRoutes from "./user/userRoute";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
  res.send(`
    <h1>BuddyShare API</h1>
    <p>Welcome to your Events & Activities Backend</p>
  `);
});

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// 404 handler 
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("🔥 Error:", err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }
);

export default app;

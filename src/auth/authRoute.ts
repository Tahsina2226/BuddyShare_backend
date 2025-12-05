import express from "express";
import { register, login, getMe, updateProfile } from "./authController";
import { protect, AuthRequest } from "../middleware/auth";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/me", protect as unknown as express.RequestHandler, getMe);
router.put(
  "/profile",
  protect as unknown as express.RequestHandler,
  updateProfile
);

export default router;

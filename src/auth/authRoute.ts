import express from "express";
import {
  register,
  login,
  googleAuth,
  refreshToken,
  getMe,
  updateProfile,
  logout,
} from "./authController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/refresh-token", refreshToken);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.post("/logout", logout);

export default router;
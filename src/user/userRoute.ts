import express from "express";
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserStats,
  updateUserRole,
  searchUsers,
} from "./userController";
import { protect, authorize } from "../middleware/auth";

const router = express.Router();

router.use(protect);

// Admin Only Routes

router.get("/", authorize("admin"), getUsers);
router.get("/stats", authorize("admin"), getUserStats);
router.get("/search", authorize("admin"), searchUsers);
router.patch("/:id/role", authorize("admin"), updateUserRole);
router.put("/:id", authorize("admin"), updateUser);
router.delete("/:id", authorize("admin"), deleteUser);

router.get("/:id", getUser);

export default router;

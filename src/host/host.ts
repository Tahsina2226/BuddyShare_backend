import express from "express";
import {
  requestToBecomeHost,
  approveHostRequest,
  rejectHostRequest,
  getHostRequests,
  getHostStatus,
  getHostStats,
  getHostRequestDetails,
} from "./hostController";
import { protect, authorize } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(protect);

// User routes
router.get("/status", getHostStatus);
router.post("/request", requestToBecomeHost);

// Admin only routes
router.get("/requests", authorize("admin"), getHostRequests);
router.get("/requests/:userId", authorize("admin"), getHostRequestDetails);
router.get("/stats", authorize("admin"), getHostStats);
router.put("/approve/:userId", authorize("admin"), approveHostRequest);
router.put("/reject/:userId", authorize("admin"), rejectHostRequest);

export default router;
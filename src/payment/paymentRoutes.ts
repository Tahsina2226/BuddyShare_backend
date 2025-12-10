import express from "express";
import {
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
  getPaymentDetails,
  freeEventJoin,
  handleWebhook,
  cleanupDuplicatePayments,
  deletePendingPayment,
  getSucceededPayments,
} from "./paymentController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

router.use(protect);

router.post("/create-intent", createPaymentIntent);
router.post("/confirm", confirmPayment);
router.post("/free-join", freeEventJoin);
router.get("/history", getPaymentHistory);
router.get("/cleanup-duplicates", cleanupDuplicatePayments);
router.get("/succeeded", getSucceededPayments);
router.delete("/pending/:id", deletePendingPayment);
router.get("/:id", getPaymentDetails);

export default router;

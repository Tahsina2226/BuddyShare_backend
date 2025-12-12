"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const hostController_1 = require("./hostController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.protect);
// User routes
router.get("/status", hostController_1.getHostStatus);
router.post("/request", hostController_1.requestToBecomeHost);
// Admin only routes
router.get("/requests", (0, auth_1.authorize)("admin"), hostController_1.getHostRequests);
router.get("/requests/:userId", (0, auth_1.authorize)("admin"), hostController_1.getHostRequestDetails);
router.get("/stats", (0, auth_1.authorize)("admin"), hostController_1.getHostStats);
router.put("/approve/:userId", (0, auth_1.authorize)("admin"), hostController_1.approveHostRequest);
router.put("/reject/:userId", (0, auth_1.authorize)("admin"), hostController_1.rejectHostRequest);
exports.default = router;

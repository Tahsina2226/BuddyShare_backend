"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const searchController_1 = require("./searchController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes
router.get("/events", searchController_1.searchEvents);
router.get("/nearby", searchController_1.getNearbyEvents);
router.get("/trending", searchController_1.getTrendingEvents);
router.get("/stats", searchController_1.getEventStats);
// Protected route
router.get("/interests", auth_1.protect, searchController_1.getEventsByInterests);
exports.default = router;

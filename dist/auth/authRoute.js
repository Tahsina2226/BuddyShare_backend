"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("./authController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post("/register", authController_1.register);
router.post("/login", authController_1.login);
router.post("/google", authController_1.googleAuth);
router.post("/refresh-token", authController_1.refreshToken);
router.get("/me", auth_1.protect, authController_1.getMe);
router.put("/profile", auth_1.protect, authController_1.updateProfile);
router.post("/logout", authController_1.logout);
exports.default = router;

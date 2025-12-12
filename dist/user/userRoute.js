"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("./userController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.protect);
// Admin Only Routes
router.get("/", (0, auth_1.authorize)("admin"), userController_1.getUsers);
router.get("/stats", (0, auth_1.authorize)("admin"), userController_1.getUserStats);
router.get("/search", (0, auth_1.authorize)("admin"), userController_1.searchUsers);
router.patch("/:id/role", (0, auth_1.authorize)("admin"), userController_1.updateUserRole);
router.put("/:id", (0, auth_1.authorize)("admin"), userController_1.updateUser);
router.delete("/:id", (0, auth_1.authorize)("admin"), userController_1.deleteUser);
router.get("/:id", userController_1.getUser);
exports.default = router;

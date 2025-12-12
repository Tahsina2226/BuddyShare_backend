"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canJoinEvent = exports.removeParticipant = exports.getEventParticipants = exports.leaveEvent = exports.joinEvent = void 0;
const event_1 = __importDefault(require("./event"));
const asyncHandler_1 = require("../utils/asyncHandler");
const errorResponse_1 = require("../utils/errorResponse");
exports.joinEvent = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const event = yield event_1.default.findById(req.params.id);
    const userId = req.user.userId;
    if (!event) {
        throw (0, errorResponse_1.createError)("Event not found", 404);
    }
    if (event.status !== "open") {
        throw (0, errorResponse_1.createError)("Event is not open for joining", 400);
    }
    if (event.currentParticipants >= event.maxParticipants) {
        throw (0, errorResponse_1.createError)("Event is full", 400);
    }
    if (event.participants.includes(userId)) {
        throw (0, errorResponse_1.createError)("Already joined this event", 400);
    }
    if (event.host.toString() === userId) {
        throw (0, errorResponse_1.createError)("Host cannot join their own event", 400);
    }
    const eventDate = new Date(event.date);
    if (eventDate < new Date()) {
        throw (0, errorResponse_1.createError)("Cannot join past events", 400);
    }
    event.participants.push(userId);
    event.currentParticipants = event.participants.length;
    if (event.currentParticipants >= event.maxParticipants) {
        event.status = "full";
    }
    yield event.save();
    res.json({
        success: true,
        message: "Successfully joined the event",
        data: {
            eventId: event._id,
            currentParticipants: event.currentParticipants,
            status: event.status,
        },
    });
}));
exports.leaveEvent = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const event = yield event_1.default.findById(req.params.id);
    const userId = req.user.userId;
    if (!event) {
        throw (0, errorResponse_1.createError)("Event not found", 404);
    }
    if (!event.participants.includes(userId)) {
        throw (0, errorResponse_1.createError)("You are not a participant of this event", 400);
    }
    const eventDate = new Date(event.date);
    const now = new Date();
    const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilEvent < 24) {
        throw (0, errorResponse_1.createError)("Cannot leave event within 24 hours of start time", 400);
    }
    event.participants = event.participants.filter((participantId) => participantId.toString() !== userId);
    event.currentParticipants = event.participants.length;
    if (event.status === "full" &&
        event.currentParticipants < event.maxParticipants) {
        event.status = "open";
    }
    yield event.save();
    res.json({
        success: true,
        message: "Successfully left the event",
        data: {
            eventId: event._id,
            currentParticipants: event.currentParticipants,
            status: event.status,
        },
    });
}));
exports.getEventParticipants = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const event = yield event_1.default.findById(req.params.id)
        .populate("participants", "name avatar email location interests")
        .select("participants");
    if (!event) {
        throw (0, errorResponse_1.createError)("Event not found", 404);
    }
    const userId = req.user.userId;
    const isHost = event.host.toString() === userId;
    const isParticipant = event.participants.some((participant) => participant._id.toString() === userId);
    if (!isHost && !isParticipant) {
        throw (0, errorResponse_1.createError)("Not authorized to view participants", 403);
    }
    res.json({
        success: true,
        data: {
            participants: event.participants,
            total: event.participants.length,
        },
    });
}));
exports.removeParticipant = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const event = yield event_1.default.findById(req.params.id);
    const userId = req.params.userId;
    if (!event) {
        throw (0, errorResponse_1.createError)("Event not found", 404);
    }
    if (event.host.toString() !== req.user.userId) {
        throw (0, errorResponse_1.createError)("Only host can remove participants", 403);
    }
    if (!event.participants.includes(userId)) {
        throw (0, errorResponse_1.createError)("User is not a participant of this event", 400);
    }
    event.participants = event.participants.filter((participantId) => participantId.toString() !== userId);
    event.currentParticipants = event.participants.length;
    if (event.status === "full" &&
        event.currentParticipants < event.maxParticipants) {
        event.status = "open";
    }
    yield event.save();
    res.json({
        success: true,
        message: "Participant removed successfully",
        data: {
            eventId: event._id,
            currentParticipants: event.currentParticipants,
            status: event.status,
        },
    });
}));
exports.canJoinEvent = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const event = yield event_1.default.findById(req.params.id);
    const userId = req.user.userId;
    if (!event) {
        throw (0, errorResponse_1.createError)("Event not found", 404);
    }
    const canJoin = {
        canJoin: true,
        reasons: [],
    };
    if (event.status !== "open") {
        canJoin.canJoin = false;
        canJoin.reasons.push("Event is not open for joining");
    }
    if (event.currentParticipants >= event.maxParticipants) {
        canJoin.canJoin = false;
        canJoin.reasons.push("Event is full");
    }
    if (event.participants.includes(userId)) {
        canJoin.canJoin = false;
        canJoin.reasons.push("Already joined this event");
    }
    if (event.host.toString() === userId) {
        canJoin.canJoin = false;
        canJoin.reasons.push("Host cannot join their own event");
    }
    const eventDate = new Date(event.date);
    if (eventDate < new Date()) {
        canJoin.canJoin = false;
        canJoin.reasons.push("Cannot join past events");
    }
    res.json({
        success: true,
        data: canJoin,
    });
}));

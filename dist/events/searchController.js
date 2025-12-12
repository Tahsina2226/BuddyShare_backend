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
exports.getEventStats = exports.getEventsByInterests = exports.getTrendingEvents = exports.getNearbyEvents = exports.searchEvents = void 0;
const event_1 = __importDefault(require("./event"));
const user_1 = __importDefault(require("../user/user"));
const asyncHandler_1 = require("../utils/asyncHandler");
const errorResponse_1 = require("../utils/errorResponse");
const getQueryString = (value) => {
    if (!value)
        return undefined;
    if (Array.isArray(value))
        return value[0];
    return value;
};
exports.searchEvents = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { keyword, category, eventType, location, dateFrom, dateTo, minFee, maxFee, minParticipants, maxParticipants, sortBy, sortOrder = "asc", page = "1", limit = "12", } = req.query;
    const pageNum = parseInt(getQueryString(page) || "1");
    const limitNum = parseInt(getQueryString(limit) || "12");
    const skip = (pageNum - 1) * limitNum;
    const filter = {};
    // Keyword filter
    const keywordStr = getQueryString(keyword);
    if (keywordStr) {
        filter.$or = [
            { title: { $regex: keywordStr, $options: "i" } },
            { description: { $regex: keywordStr, $options: "i" } },
            { tags: { $in: [new RegExp(keywordStr, "i")] } },
        ];
    }
    // Category filter
    const categoryStr = getQueryString(category);
    if (categoryStr) {
        filter.category = categoryStr;
    }
    // Event type filter
    const eventTypeStr = getQueryString(eventType);
    if (eventTypeStr) {
        filter.eventType = eventTypeStr;
    }
    // Location filter
    const locationStr = getQueryString(location);
    if (locationStr) {
        filter.location = { $regex: locationStr, $options: "i" };
    }
    // Date range filter
    const dateFromStr = getQueryString(dateFrom);
    const dateToStr = getQueryString(dateTo);
    if (dateFromStr || dateToStr) {
        filter.date = {};
        if (dateFromStr)
            filter.date.$gte = new Date(dateFromStr);
        if (dateToStr)
            filter.date.$lte = new Date(dateToStr);
    }
    // Fee range filter
    const minFeeStr = getQueryString(minFee);
    const maxFeeStr = getQueryString(maxFee);
    if (minFeeStr !== undefined || maxFeeStr !== undefined) {
        filter.joiningFee = {};
        if (minFeeStr !== undefined)
            filter.joiningFee.$gte = parseFloat(minFeeStr);
        if (maxFeeStr !== undefined)
            filter.joiningFee.$lte = parseFloat(maxFeeStr);
    }
    // Participants range filter
    const minParticipantsStr = getQueryString(minParticipants);
    const maxParticipantsStr = getQueryString(maxParticipants);
    if (minParticipantsStr !== undefined || maxParticipantsStr !== undefined) {
        filter.currentParticipants = {};
        if (minParticipantsStr !== undefined)
            filter.currentParticipants.$gte = parseInt(minParticipantsStr);
        if (maxParticipantsStr !== undefined)
            filter.currentParticipants.$lte = parseInt(maxParticipantsStr);
    }
    // Status filter
    const statusStr = getQueryString(req.query.status);
    if (!statusStr) {
        filter.status = "open";
    }
    else if (statusStr !== "all") {
        filter.status = statusStr;
    }
    // Build sort object
    let sort = {};
    const sortByStr = getQueryString(sortBy);
    const sortOrderStr = getQueryString(sortOrder);
    if (sortByStr) {
        const order = sortOrderStr === "desc" ? -1 : 1;
        switch (sortByStr) {
            case "date":
                sort.date = order;
                break;
            case "fee":
                sort.joiningFee = order;
                break;
            case "participants":
                sort.currentParticipants = order;
                break;
            case "created":
                sort.createdAt = order;
                break;
            default:
                sort.createdAt = -1;
        }
    }
    else {
        sort.date = 1;
    }
    // Execute query
    const events = yield event_1.default.find(filter)
        .populate("host", "name avatar rating")
        .skip(skip)
        .limit(limitNum)
        .sort(sort);
    const total = yield event_1.default.countDocuments(filter);
    // Get categories for filter suggestions
    const categories = yield event_1.default.distinct("category");
    const locations = yield event_1.default.distinct("location");
    const eventTypes = yield event_1.default.distinct("eventType");
    res.json({
        success: true,
        data: {
            events,
            filters: {
                categories,
                locations,
                eventTypes,
            },
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        },
    });
}));
// @desc    Get events near location
exports.getNearbyEvents = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { location, radius = "10" } = req.query;
    const locationStr = getQueryString(location);
    if (!locationStr) {
        throw (0, errorResponse_1.createError)("Location is required", 400);
    }
    const events = yield event_1.default.find({
        location: { $regex: locationStr, $options: "i" },
        status: "open",
        date: { $gte: new Date() },
    })
        .populate("host", "name avatar")
        .limit(20)
        .sort({ date: 1 });
    res.json({
        success: true,
        data: { events },
    });
}));
// @desc    Get trending events
exports.getTrendingEvents = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const events = yield event_1.default.find({
        createdAt: { $gte: sevenDaysAgo },
        status: "open",
    })
        .populate("host", "name avatar")
        .sort({ currentParticipants: -1 })
        .limit(10);
    res.json({
        success: true,
        data: { events },
    });
}));
// @desc    Get events by interests
exports.getEventsByInterests = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_1.default.findById(req.user.userId);
    if (!user || !user.interests || user.interests.length === 0) {
        return res.json({
            success: true,
            data: { events: [] },
        });
    }
    const events = yield event_1.default.find({
        $or: [
            { tags: { $in: user.interests } },
            { category: { $in: user.interests } },
        ],
        status: "open",
        date: { $gte: new Date() },
    })
        .populate("host", "name avatar")
        .limit(20)
        .sort({ date: 1 });
    res.json({
        success: true,
        data: { events },
    });
}));
// @desc    Get event statistics
exports.getEventStats = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const totalEvents = yield event_1.default.countDocuments();
    const upcomingEvents = yield event_1.default.countDocuments({
        status: "open",
        date: { $gte: new Date() },
    });
    // Get start and end of today
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    const eventsToday = yield event_1.default.countDocuments({
        date: {
            $gte: startOfDay,
            $lte: endOfDay,
        },
    });
    // Get events by category
    const eventsByCategory = yield event_1.default.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
    ]);
    // Get events by type
    const eventsByType = yield event_1.default.aggregate([
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);
    res.json({
        success: true,
        data: {
            totalEvents,
            upcomingEvents,
            eventsToday,
            eventsByCategory,
            eventsByType,
        },
    });
}));

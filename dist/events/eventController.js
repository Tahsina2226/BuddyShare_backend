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
exports.getTopRatedEvents = exports.getEventsByRating = exports.uploadImage = exports.getMyEvents = exports.getJoinedEvents = exports.getMyParticipatedEvents = exports.getEventsByHost = exports.deleteEvent = exports.updateEvent = exports.getEvent = exports.getEvents = exports.createEvent = exports.uploadEventImage = void 0;
const event_1 = __importDefault(require("../events/event"));
const user_1 = __importDefault(require("../user/user"));
const asyncHandler_1 = require("../utils/asyncHandler");
const errorResponse_1 = require("../utils/errorResponse");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path_1.default.join(process.cwd(), "uploads/events");
        if (!fs_1.default.existsSync(uploadPath)) {
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "event-" + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    }
    else {
        cb(new Error("Only image files are allowed"));
    }
};
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
    fileFilter: fileFilter,
});
exports.uploadEventImage = upload.single("image");
const getFullUrl = (req, path) => {
    if (!path)
        return "";
    if (path.startsWith("http"))
        return path;
    if (path.startsWith("/")) {
        return `${req.protocol}://${req.get("host")}${path}`;
    }
    return path;
};
const transformEventWithFullUrls = (req, event) => {
    var _a, _b;
    const eventObj = event.toObject ? event.toObject() : event;
    return Object.assign(Object.assign({}, eventObj), { image: getFullUrl(req, eventObj.image), host: eventObj.host && typeof eventObj.host === "object"
            ? Object.assign(Object.assign({}, eventObj.host), { avatar: getFullUrl(req, ((_a = eventObj.host) === null || _a === void 0 ? void 0 : _a.avatar) || ""), averageRating: eventObj.host.averageRating || 0, totalReviews: eventObj.host.totalReviews || 0, eventsHosted: eventObj.host.eventsHosted || 0 }) : eventObj.host, participants: ((_b = eventObj.participants) === null || _b === void 0 ? void 0 : _b.map((participant) => participant && typeof participant === "object"
            ? Object.assign(Object.assign({}, participant), { avatar: getFullUrl(req, participant.avatar || "") }) : participant)) || [] });
};
const mapCategoryToSchema = (category) => {
    const categoryMap = {
        Tech: "Technology",
        tech: "Technology",
        "Tech Event": "Technology",
        "Technology Event": "Technology",
        Coding: "Technology",
        Programming: "Technology",
        Software: "Technology",
        IT: "Technology",
        webdev: "Technology",
        devops: "Technology",
        ai: "Technology",
        ml: "Technology",
        blockchain: "Technology",
        cybersecurity: "Technology",
        cloud: "Technology",
    };
    return categoryMap[category] || category;
};
exports.createEvent = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, description, eventType, date, time, location, address, maxParticipants, joiningFee, category, tags, image: imageUrl, } = req.body;
    const user = yield user_1.default.findById(req.user.userId);
    if (!["host", "admin"].includes(user.role)) {
        throw (0, errorResponse_1.createError)("Only hosts can create events", 403);
    }
    let image = imageUrl;
    if (req.file) {
        const imagePath = `/uploads/events/${req.file.filename}`;
        image = `${req.protocol}://${req.get("host")}${imagePath}`;
    }
    const mappedCategory = mapCategoryToSchema(category);
    const event = yield event_1.default.create({
        title,
        description,
        eventType,
        date,
        time,
        location,
        address,
        host: req.user.userId,
        hostName: user.name,
        hostEmail: user.email,
        maxParticipants: parseInt(maxParticipants),
        currentParticipants: 0,
        joiningFee: parseFloat(joiningFee) || 0,
        category: mappedCategory,
        tags: tags
            ? Array.isArray(tags)
                ? tags.map((t) => t.toLowerCase().trim())
                : tags.split(",").map((t) => t.trim().toLowerCase())
            : [],
        image,
        status: "open",
    });
    const eventWithFullUrls = transformEventWithFullUrls(req, event);
    res.status(201).json({
        success: true,
        message: "Event created successfully",
        data: { event: eventWithFullUrls },
    });
}));
exports.getEvents = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const filter = {};
    if (req.query.category) {
        const mappedCategory = mapCategoryToSchema(req.query.category);
        filter.category = mappedCategory;
    }
    if (req.query.eventType)
        filter.eventType = req.query.eventType;
    if (req.query.location)
        filter.location = { $regex: req.query.location, $options: "i" };
    if (req.query.status)
        filter.status = req.query.status;
    if (req.query.dateFrom) {
        filter.date = Object.assign(Object.assign({}, filter.date), { $gte: new Date(req.query.dateFrom) });
    }
    if (req.query.dateTo) {
        filter.date = Object.assign(Object.assign({}, filter.date), { $lte: new Date(req.query.dateTo) });
    }
    const sort = {};
    if (req.query.sortBy === "date")
        sort.date = 1;
    if (req.query.sortBy === "participants")
        sort.currentParticipants = -1;
    if (!req.query.sortBy)
        sort.createdAt = -1;
    let events = yield event_1.default.find(filter)
        .populate("host", "name email avatar averageRating totalReviews eventsHosted")
        .skip(skip)
        .limit(limit)
        .sort(sort);
    const total = yield event_1.default.countDocuments(filter);
    if (req.query.sortBy === "rating") {
        events = events.sort((a, b) => {
            var _a, _b;
            const ratingA = ((_a = a.host) === null || _a === void 0 ? void 0 : _a.averageRating) || 0;
            const ratingB = ((_b = b.host) === null || _b === void 0 ? void 0 : _b.averageRating) || 0;
            return ratingB - ratingA;
        });
    }
    const eventsWithFullUrls = events.map((event) => transformEventWithFullUrls(req, event));
    res.json({
        success: true,
        data: {
            events: eventsWithFullUrls,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        },
    });
}));
exports.getEvent = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const event = yield event_1.default.findById(req.params.id)
        .populate("host", "name email avatar bio location averageRating totalReviews eventsHosted")
        .populate("participants", "name avatar");
    if (!event) {
        throw (0, errorResponse_1.createError)("Event not found", 404);
    }
    const eventWithFullUrls = transformEventWithFullUrls(req, event);
    res.json({
        success: true,
        data: { event: eventWithFullUrls },
    });
}));
exports.updateEvent = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let event = yield event_1.default.findById(req.params.id);
    if (!event) {
        throw (0, errorResponse_1.createError)("Event not found", 404);
    }
    const userId = req.user.userId;
    const userRole = req.user.role;
    const isHost = event.host.toString() === userId;
    const isAdmin = userRole === "admin";
    if (!isHost && !isAdmin) {
        throw (0, errorResponse_1.createError)("Not authorized to update this event", 403);
    }
    let image = req.body.image;
    if (req.file) {
        const imagePath = `/uploads/events/${req.file.filename}`;
        image = `${req.protocol}://${req.get("host")}${imagePath}`;
        if (event.image && event.image.includes("/uploads/events/")) {
            try {
                const oldImageFilename = event.image.split("/").pop();
                const oldImagePath = path_1.default.join(process.cwd(), "uploads/events", oldImageFilename || "");
                if (fs_1.default.existsSync(oldImagePath)) {
                    fs_1.default.unlinkSync(oldImagePath);
                }
            }
            catch (error) {
                console.error("Error deleting old image:", error);
            }
        }
    }
    const updateData = Object.assign({}, req.body);
    if (req.body.category) {
        updateData.category = mapCategoryToSchema(req.body.category);
    }
    if (image) {
        updateData.image = image;
    }
    if (req.body.tags) {
        updateData.tags = Array.isArray(req.body.tags)
            ? req.body.tags.map((t) => t.toLowerCase().trim())
            : req.body.tags.split(",").map((t) => t.trim().toLowerCase());
    }
    if (req.body.maxParticipants) {
        updateData.maxParticipants = parseInt(req.body.maxParticipants);
    }
    if (req.body.joiningFee) {
        updateData.joiningFee = parseFloat(req.body.joiningFee);
    }
    event = yield event_1.default.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
    }).populate("host", "name email avatar averageRating totalReviews eventsHosted");
    const eventWithFullUrls = transformEventWithFullUrls(req, event);
    res.json({
        success: true,
        message: "Event updated successfully",
        data: { event: eventWithFullUrls },
    });
}));
exports.deleteEvent = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const event = yield event_1.default.findById(req.params.id);
    if (!event) {
        throw (0, errorResponse_1.createError)("Event not found", 404);
    }
    const userId = req.user.userId;
    const userRole = req.user.role;
    const isHost = event.host.toString() === userId;
    const isAdmin = userRole === "admin";
    if (!isHost && !isAdmin) {
        throw (0, errorResponse_1.createError)("Not authorized to delete this event", 403);
    }
    if (event.image && event.image.includes("/uploads/events/")) {
        try {
            const imageFilename = event.image.split("/").pop();
            const imagePath = path_1.default.join(process.cwd(), "uploads/events", imageFilename || "");
            if (fs_1.default.existsSync(imagePath)) {
                fs_1.default.unlinkSync(imagePath);
            }
        }
        catch (error) {
            console.error("Error deleting image:", error);
        }
    }
    yield event_1.default.findByIdAndDelete(req.params.id);
    res.json({
        success: true,
        message: "Event deleted successfully",
        data: {},
    });
}));
exports.getEventsByHost = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const events = yield event_1.default.find({ host: req.params.hostId })
        .populate("host", "name avatar averageRating totalReviews eventsHosted")
        .sort({ date: 1 });
    const eventsWithFullUrls = events.map((event) => transformEventWithFullUrls(req, event));
    res.json({
        success: true,
        data: { events: eventsWithFullUrls },
    });
}));
exports.getMyParticipatedEvents = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const status = req.query.status || "all";
    const search = req.query.search || "";
    const userId = req.user.userId;
    const filter = { participants: userId };
    const now = new Date();
    if (status === "upcoming") {
        filter.date = { $gt: now };
    }
    else if (status === "past") {
        filter.date = { $lte: now };
    }
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
            { location: { $regex: search, $options: "i" } },
        ];
    }
    const total = yield event_1.default.countDocuments(filter);
    const events = yield event_1.default.find(filter)
        .populate("host", "name email avatar averageRating totalReviews eventsHosted")
        .skip(skip)
        .limit(limit)
        .sort({ date: 1 });
    const eventsWithInfo = events.map((event) => {
        const eventObj = event.toObject();
        return Object.assign(Object.assign({}, eventObj), { isParticipant: true, participationDate: event.createdAt });
    });
    const eventsWithFullUrls = eventsWithInfo.map((event) => transformEventWithFullUrls(req, event));
    res.json({
        success: true,
        data: {
            events: eventsWithFullUrls,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        },
    });
}));
exports.getJoinedEvents = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const events = yield event_1.default.find({ participants: req.user.userId })
        .populate("host", "name avatar averageRating totalReviews eventsHosted")
        .sort({ date: 1 });
    const eventsWithFullUrls = events.map((event) => transformEventWithFullUrls(req, event));
    res.json({
        success: true,
        data: { events: eventsWithFullUrls },
    });
}));
exports.getMyEvents = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const events = yield event_1.default.find({ host: req.user.userId })
        .populate("participants", "name avatar")
        .sort({ createdAt: -1 });
    const eventsWithFullUrls = events.map((event) => transformEventWithFullUrls(req, event));
    res.json({
        success: true,
        data: { events: eventsWithFullUrls },
    });
}));
exports.uploadImage = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.file) {
        throw (0, errorResponse_1.createError)("No image uploaded", 400);
    }
    const imagePath = `/uploads/events/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get("host")}${imagePath}`;
    res.json({
        success: true,
        message: "Image uploaded successfully",
        data: {
            url: imagePath,
            fullUrl: fullUrl,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
        },
    });
}));
exports.getEventsByRating = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const minRating = parseFloat(req.query.minRating) || 0;
    const highRatedHosts = yield user_1.default.find({
        averageRating: { $gte: minRating },
        role: "host",
    }).select("_id");
    const hostIds = highRatedHosts.map((host) => host._id);
    const events = yield event_1.default.find({
        host: { $in: hostIds },
        status: "open",
        date: { $gte: new Date() },
    })
        .populate("host", "name email avatar averageRating totalReviews eventsHosted")
        .skip(skip)
        .limit(limit)
        .sort({ date: 1 });
    const total = yield event_1.default.countDocuments({
        host: { $in: hostIds },
        status: "open",
        date: { $gte: new Date() },
    });
    const eventsWithFullUrls = events.map((event) => transformEventWithFullUrls(req, event));
    res.json({
        success: true,
        data: {
            events: eventsWithFullUrls,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        },
    });
}));
exports.getTopRatedEvents = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const limit = parseInt(req.query.limit) || 5;
    const topHosts = yield user_1.default.find({
        role: "host",
        averageRating: { $gte: 4.0 },
        totalReviews: { $gte: 5 },
    })
        .sort({ averageRating: -1 })
        .limit(10)
        .select("_id");
    const hostIds = topHosts.map((host) => host._id);
    const events = yield event_1.default.find({
        host: { $in: hostIds },
        status: "open",
        date: { $gte: new Date() },
    })
        .populate("host", "name email avatar averageRating totalReviews eventsHosted")
        .limit(limit)
        .sort({ date: 1 });
    const eventsWithFullUrls = events.map((event) => transformEventWithFullUrls(req, event));
    res.json({
        success: true,
        data: { events: eventsWithFullUrls },
    });
}));

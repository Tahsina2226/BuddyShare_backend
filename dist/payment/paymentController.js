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
exports.getSucceededPayments = exports.handleWebhook = exports.freeEventJoin = exports.deletePendingPayment = exports.cleanupDuplicatePayments = exports.getPaymentDetails = exports.getPaymentHistory = exports.confirmPayment = exports.createPaymentIntent = void 0;
const payment_1 = __importDefault(require("./payment"));
const event_1 = __importDefault(require("../events/event"));
const user_1 = __importDefault(require("../user/user"));
const stripe_1 = require("../config/stripe");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorResponse_1 = require("../utils/errorResponse");
exports.createPaymentIntent = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { eventId } = req.body;
    const userId = req.user.userId;
    if (!eventId) {
        throw (0, errorResponse_1.createError)('Event ID is required', 400);
    }
    const event = yield event_1.default.findById(eventId);
    if (!event) {
        throw (0, errorResponse_1.createError)('Event not found', 404);
    }
    if (event.joiningFee <= 0) {
        throw (0, errorResponse_1.createError)('This event is free, no payment required', 400);
    }
    if (event.participants.includes(userId)) {
        throw (0, errorResponse_1.createError)('Already joined this event', 400);
    }
    if (event.status !== 'open') {
        throw (0, errorResponse_1.createError)('Event is not open for joining', 400);
    }
    if (event.currentParticipants >= event.maxParticipants) {
        throw (0, errorResponse_1.createError)('Event is full', 400);
    }
    const existingPendingPayment = yield payment_1.default.findOne({
        user: userId,
        event: eventId,
        status: 'pending'
    });
    if (existingPendingPayment) {
        try {
            const existingIntent = yield stripe_1.stripe.paymentIntents.retrieve(existingPendingPayment.stripePaymentIntentId);
            if (existingIntent.status === 'requires_payment_method' ||
                existingIntent.status === 'requires_confirmation' ||
                existingIntent.status === 'requires_action') {
                return res.json({
                    success: true,
                    data: {
                        clientSecret: existingIntent.client_secret,
                        paymentId: existingPendingPayment._id,
                        amount: existingPendingPayment.amount,
                        event: {
                            id: event._id,
                            title: event.title,
                            date: event.date,
                            location: event.location
                        },
                        isExisting: true
                    }
                });
            }
        }
        catch (error) {
            console.log('Existing payment intent is invalid, creating new one');
        }
        yield payment_1.default.findByIdAndDelete(existingPendingPayment._id);
        console.log(`Deleted old pending payment: ${existingPendingPayment._id}`);
    }
    const amount = Math.round(event.joiningFee * 100);
    let customerId;
    const user = yield user_1.default.findById(userId);
    if (user && user.email) {
        const customers = yield stripe_1.stripe.customers.list({
            email: user.email,
            limit: 1
        });
        if (customers.data.length > 0) {
            customerId = customers.data[0].id;
        }
        else {
            const customer = yield stripe_1.stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: {
                    userId: userId,
                    userEmail: user.email
                }
            });
            customerId = customer.id;
        }
    }
    else {
        throw (0, errorResponse_1.createError)('User email not found', 400);
    }
    const paymentIntent = yield stripe_1.stripe.paymentIntents.create({
        amount,
        currency: stripe_1.CURRENCY,
        customer: customerId,
        metadata: {
            eventId: event._id.toString(),
            eventTitle: event.title,
            userId: userId,
            userName: user.name
        },
        description: `Payment for event: ${event.title}`,
        receipt_email: user.email,
        automatic_payment_methods: {
            enabled: true,
        },
    });
    const payment = yield payment_1.default.create({
        user: userId,
        event: event._id,
        amount: event.joiningFee,
        currency: stripe_1.CURRENCY.toUpperCase(),
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customerId,
        status: 'pending'
    });
    res.json({
        success: true,
        data: {
            clientSecret: paymentIntent.client_secret,
            paymentId: payment._id,
            amount: event.joiningFee,
            event: {
                id: event._id,
                title: event.title,
                date: event.date,
                location: event.location
            }
        }
    });
}));
function getReceiptUrl(paymentIntentId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const charges = yield stripe_1.stripe.charges.list({
                payment_intent: paymentIntentId,
                limit: 1
            });
            if (charges.data.length > 0) {
                return charges.data[0].receipt_url || '';
            }
            return '';
        }
        catch (error) {
            console.error('Error fetching receipt URL:', error);
            return '';
        }
    });
}
exports.confirmPayment = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { paymentIntentId } = req.body;
    const userId = req.user.userId;
    if (!paymentIntentId) {
        throw (0, errorResponse_1.createError)('Payment intent ID is required', 400);
    }
    const paymentIntent = yield stripe_1.stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
        throw (0, errorResponse_1.createError)('Payment not completed', 400);
    }
    const payment = yield payment_1.default.findOne({
        stripePaymentIntentId: paymentIntentId,
        user: userId
    });
    if (!payment) {
        throw (0, errorResponse_1.createError)('Payment record not found', 404);
    }
    if (payment.status === 'succeeded') {
        throw (0, errorResponse_1.createError)('Payment already processed', 400);
    }
    const event = yield event_1.default.findById(payment.event);
    if (!event) {
        throw (0, errorResponse_1.createError)('Event not found', 404);
    }
    const receiptUrl = yield getReceiptUrl(paymentIntentId);
    payment.status = 'succeeded';
    payment.receiptUrl = receiptUrl;
    yield payment.save();
    if (!event.participants.includes(userId)) {
        event.participants.push(userId);
        event.currentParticipants = event.participants.length;
        if (event.currentParticipants >= event.maxParticipants) {
            event.status = 'full';
        }
        yield event.save();
    }
    res.json({
        success: true,
        message: 'Payment confirmed and event joined successfully',
        data: {
            payment: {
                id: payment._id,
                amount: payment.amount,
                status: payment.status,
                receiptUrl: payment.receiptUrl,
                createdAt: payment.createdAt
            },
            event: {
                id: event._id,
                title: event.title,
                date: event.date,
                participants: event.currentParticipants
            }
        }
    });
}));
exports.getPaymentHistory = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    try {
        const payments = yield payment_1.default.find({
            user: userId,
            status: { $in: ['succeeded', 'completed'] }
        })
            .populate({
            path: 'event',
            select: 'title date time location hostName joiningFee status image category',
        })
            .sort({ createdAt: -1 });
        const uniquePayments = [];
        const seenKeys = new Set();
        for (const payment of payments) {
            const key = `${payment.event._id}_${payment.amount}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniquePayments.push(payment);
            }
        }
        const paginatedPayments = uniquePayments.slice(skip, skip + limit);
        const total = uniquePayments.length;
        res.json({
            success: true,
            data: {
                payments: paginatedPayments,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    }
    catch (error) {
        console.error('Error in getPaymentHistory:', error);
        throw (0, errorResponse_1.createError)(`Failed to fetch payment history: ${error.message}`, 500);
    }
}));
exports.getPaymentDetails = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const payment = yield payment_1.default.findById(req.params.id)
        .populate('event', 'title date location host')
        .populate('user', 'name email');
    if (!payment) {
        throw (0, errorResponse_1.createError)('Payment not found', 404);
    }
    const userId = req.user.userId;
    if (payment.user.toString() !== userId && req.user.role !== 'admin') {
        throw (0, errorResponse_1.createError)('Not authorized to view this payment', 403);
    }
    res.json({
        success: true,
        data: { payment }
    });
}));
exports.cleanupDuplicatePayments = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.userId;
    const allPayments = yield payment_1.default.find({ user: userId });
    const paymentsToKeep = [];
    const paymentsToDelete = [];
    const seenKeys = new Set();
    for (const payment of allPayments) {
        const key = `${payment.event}_${payment.status}_${payment.amount}`;
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            paymentsToKeep.push(payment);
        }
        else {
            paymentsToDelete.push(payment._id);
        }
    }
    if (paymentsToDelete.length > 0) {
        yield payment_1.default.deleteMany({ _id: { $in: paymentsToDelete } });
    }
    const cleanedPayments = yield payment_1.default.find({ user: userId })
        .populate('event', 'title')
        .sort({ createdAt: -1 });
    res.json({
        success: true,
        message: `Removed ${paymentsToDelete.length} duplicate payments`,
        data: {
            removed: paymentsToDelete.length,
            kept: paymentsToKeep.length,
            payments: cleanedPayments
        }
    });
}));
exports.deletePendingPayment = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const paymentId = req.params.id;
    const userId = req.user.userId;
    const payment = yield payment_1.default.findOne({
        _id: paymentId,
        user: userId,
        status: 'pending'
    });
    if (!payment) {
        throw (0, errorResponse_1.createError)('Pending payment not found or not authorized', 404);
    }
    yield payment_1.default.findByIdAndDelete(paymentId);
    res.json({
        success: true,
        message: 'Pending payment deleted successfully'
    });
}));
exports.freeEventJoin = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { eventId } = req.body;
    const userId = req.user.userId;
    if (!eventId) {
        throw (0, errorResponse_1.createError)('Event ID is required', 400);
    }
    const event = yield event_1.default.findById(eventId);
    if (!event) {
        throw (0, errorResponse_1.createError)('Event not found', 404);
    }
    if (event.joiningFee > 0) {
        throw (0, errorResponse_1.createError)('This event requires payment', 400);
    }
    if (event.participants.includes(userId)) {
        throw (0, errorResponse_1.createError)('Already joined this event', 400);
    }
    if (event.status !== 'open') {
        throw (0, errorResponse_1.createError)('Event is not open for joining', 400);
    }
    if (event.currentParticipants >= event.maxParticipants) {
        throw (0, errorResponse_1.createError)('Event is full', 400);
    }
    event.participants.push(userId);
    event.currentParticipants = event.participants.length;
    if (event.currentParticipants >= event.maxParticipants) {
        event.status = 'full';
    }
    yield event.save();
    const payment = yield payment_1.default.create({
        user: userId,
        event: event._id,
        amount: 0,
        currency: 'USD',
        stripePaymentIntentId: 'free-join',
        status: 'succeeded',
        paymentMethod: 'free'
    });
    res.json({
        success: true,
        message: 'Successfully joined free event',
        data: {
            event: {
                id: event._id,
                title: event.title,
                date: event.date,
                participants: event.currentParticipants
            },
            payment: {
                id: payment._id,
                amount: 0,
                status: 'succeeded'
            }
        }
    });
}));
exports.handleWebhook = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe_1.stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            let receiptUrl = '';
            try {
                if (paymentIntent.latest_charge) {
                    const charge = yield stripe_1.stripe.charges.retrieve(paymentIntent.latest_charge);
                    receiptUrl = charge.receipt_url || '';
                }
            }
            catch (error) {
                console.error('Error fetching charge for receipt URL:', error);
            }
            yield payment_1.default.findOneAndUpdate({ stripePaymentIntentId: paymentIntent.id }, {
                status: 'succeeded',
                receiptUrl: receiptUrl
            });
            console.log(`Payment succeeded: ${paymentIntent.id}`);
            break;
        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            yield payment_1.default.findOneAndUpdate({ stripePaymentIntentId: failedPayment.id }, { status: 'failed' });
            console.log(`Payment failed: ${failedPayment.id}`);
            break;
        case 'charge.succeeded':
            const charge = event.data.object;
            if (charge.payment_intent) {
                yield payment_1.default.findOneAndUpdate({ stripePaymentIntentId: charge.payment_intent }, {
                    status: 'succeeded',
                    receiptUrl: charge.receipt_url || ''
                });
                console.log(`Charge succeeded for payment intent: ${charge.payment_intent}`);
            }
            break;
        case 'charge.failed':
            const failedCharge = event.data.object;
            if (failedCharge.payment_intent) {
                yield payment_1.default.findOneAndUpdate({ stripePaymentIntentId: failedCharge.payment_intent }, { status: 'failed' });
                console.log(`Charge failed for payment intent: ${failedCharge.payment_intent}`);
            }
            break;
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }
    res.json({ received: true });
}));
exports.getSucceededPayments = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.userId;
    try {
        const payments = yield payment_1.default.find({
            user: userId,
            status: { $in: ['succeeded', 'completed'] }
        })
            .populate({
            path: 'event',
            select: 'title date time location hostName joiningFee status image category',
        })
            .sort({ createdAt: -1 });
        const uniquePayments = [];
        const seenKeys = new Set();
        for (const payment of payments) {
            const key = `${payment.event._id}_${payment.amount}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniquePayments.push(payment);
            }
        }
        res.json({
            success: true,
            data: {
                payments: uniquePayments
            }
        });
    }
    catch (error) {
        console.error('Error in getSucceededPayments:', error);
        throw (0, errorResponse_1.createError)(`Failed to fetch succeeded payments: ${error.message}`, 500);
    }
}));

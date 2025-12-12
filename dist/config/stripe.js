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
exports.WEBHOOK_EVENTS = exports.verifyStripeConnection = exports.MINIMUM_CHARGE = exports.CURRENCY = exports.TEST_CARDS = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}
// Latest Stripe API version (November 2025)
exports.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover', // Use this exact version
    typescript: true,
});
// Test card numbers for development
exports.TEST_CARDS = {
    success: '4242424242424242',
    fail: '4000000000000002',
    authentication: '4000002500003155'
};
// Currency configuration
exports.CURRENCY = process.env.STRIPE_CURRENCY || 'usd';
exports.MINIMUM_CHARGE = 50; // $0.50 in cents
// Test Stripe connection
const verifyStripeConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield exports.stripe.balance.retrieve();
        console.log('✅ Stripe connection successful');
        console.log('Stripe API Version:', '2025-11-17.clover');
        return true;
    }
    catch (error) {
        console.error('❌ Stripe connection failed:', error.message);
        console.error('Error details:', error);
        // Helpful error messages
        if (error.type === 'StripeAuthenticationError') {
            console.error('💡 Please check your STRIPE_SECRET_KEY in .env file');
            console.error('💡 Make sure it starts with "sk_test_" or "sk_live_"');
        }
        throw error;
    }
});
exports.verifyStripeConnection = verifyStripeConnection;
// Get supported events for webhook
exports.WEBHOOK_EVENTS = [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'charge.succeeded',
    'charge.failed',
    'customer.created',
    'customer.updated'
];

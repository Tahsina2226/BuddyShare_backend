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
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51PsJx708wvAHGkIcZsPbOoJV9l7J8uIu8fMwJW6Ck3STSstRf9PYtlv01p7CttTKJ4vWinlXCENv1f2onNiXFVyE00FucqsECI';
exports.stripe = new stripe_1.default(stripeSecretKey, {
    apiVersion: '2025-11-17.clover',
    typescript: true,
});
exports.TEST_CARDS = {
    success: '4242424242424242',
    fail: '4000000000000002',
    authentication: '4000002500003155'
};
exports.CURRENCY = process.env.STRIPE_CURRENCY || 'usd';
exports.MINIMUM_CHARGE = 50;
const verifyStripeConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield exports.stripe.balance.retrieve();
        console.log('✅ Stripe connection successful');
        return true;
    }
    catch (error) {
        console.error('❌ Stripe connection failed:', error.message);
        throw error;
    }
});
exports.verifyStripeConnection = verifyStripeConnection;
exports.WEBHOOK_EVENTS = [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'charge.succeeded',
    'charge.failed',
    'customer.created',
    'customer.updated'
];

import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

// Latest Stripe API version (November 2025)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover', // Use this exact version
  typescript: true,
});

// Test card numbers for development
export const TEST_CARDS = {
  success: '4242424242424242',
  fail: '4000000000000002',
  authentication: '4000002500003155'
};

// Currency configuration
export const CURRENCY = process.env.STRIPE_CURRENCY || 'usd';
export const MINIMUM_CHARGE = 50; // $0.50 in cents

// Test Stripe connection
export const verifyStripeConnection = async () => {
  try {
    await stripe.balance.retrieve();
    console.log('✅ Stripe connection successful');
    console.log('Stripe API Version:', '2025-11-17.clover');
    return true;
  } catch (error: any) {
    console.error('❌ Stripe connection failed:', error.message);
    console.error('Error details:', error);
    
    // Helpful error messages
    if (error.type === 'StripeAuthenticationError') {
      console.error('💡 Please check your STRIPE_SECRET_KEY in .env file');
      console.error('💡 Make sure it starts with "sk_test_" or "sk_live_"');
    }
    
    throw error;
  }
};

// Get supported events for webhook
export const WEBHOOK_EVENTS = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.succeeded',
  'charge.failed',
  'customer.created',
  'customer.updated'
];
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51PsJx708wvAHGkIcZsPbOoJV9l7J8uIu8fMwJW6Ck3STSstRf9PYtlv01p7CttTKJ4vWinlXCENv1f2onNiXFVyE00FucqsECI';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover',
  typescript: true,
});

export const TEST_CARDS = {
  success: '4242424242424242',
  fail: '4000000000000002',
  authentication: '4000002500003155'
};

export const CURRENCY = process.env.STRIPE_CURRENCY || 'usd';
export const MINIMUM_CHARGE = 50;

export const verifyStripeConnection = async () => {
  try {
    await stripe.balance.retrieve();
    console.log('✅ Stripe connection successful');
    return true;
  } catch (error: any) {
    console.error('❌ Stripe connection failed:', error.message);
    throw error;
  }
};

export const WEBHOOK_EVENTS = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.succeeded',
  'charge.failed',
  'customer.created',
  'customer.updated'
];
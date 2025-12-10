import { Request, Response } from 'express';
import Stripe from 'stripe';
import mongoose from 'mongoose';

import Payment from './payment';
import Event from "../events/event";
import User from "../user/user"
import { stripe, CURRENCY } from '../config/stripe';
import { asyncHandler } from '../utils/asyncHandler';
import { createError } from '../utils/errorResponse';

export const createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.body;
  const userId = (req as any).user.userId;

  if (!eventId) {
    throw createError('Event ID is required', 400);
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw createError('Event not found', 404);
  }

  if (event.joiningFee <= 0) {
    throw createError('This event is free, no payment required', 400);
  }

  if (event.participants.includes(userId as any)) {
    throw createError('Already joined this event', 400);
  }

  if (event.status !== 'open') {
    throw createError('Event is not open for joining', 400);
  }

  if (event.currentParticipants >= event.maxParticipants) {
    throw createError('Event is full', 400);
  }

  const amount = Math.round(event.joiningFee * 100);

  let customerId: string;
  const user = await User.findById(userId);
  
  if (user && user.email) {
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: userId,
          userEmail: user.email
        }
      });
      customerId = customer.id;
    }
  } else {
    throw createError('User email not found', 400);
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: CURRENCY,
    customer: customerId,
    metadata: {
      eventId: event._id.toString(),
      eventTitle: event.title,
      userId: userId,
      userName: user!.name
    },
    description: `Payment for event: ${event.title}`,
    receipt_email: user!.email,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  const payment = await Payment.create({
    user: userId,
    event: event._id,
    amount: event.joiningFee,
    currency: CURRENCY.toUpperCase(),
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
});

async function getReceiptUrl(paymentIntentId: string): Promise<string> {
  try {
    const charges = await stripe.charges.list({
      payment_intent: paymentIntentId,
      limit: 1
    });

    if (charges.data.length > 0) {
      return charges.data[0].receipt_url || '';
    }
    
    return '';
  } catch (error) {
    console.error('Error fetching receipt URL:', error);
    return '';
  }
}

export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const { paymentIntentId } = req.body;
  const userId = (req as any).user.userId;

  if (!paymentIntentId) {
    throw createError('Payment intent ID is required', 400);
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw createError('Payment not completed', 400);
  }

  const payment = await Payment.findOne({ 
    stripePaymentIntentId: paymentIntentId,
    user: userId
  });

  if (!payment) {
    throw createError('Payment record not found', 404);
  }

  if (payment.status === 'succeeded') {
    throw createError('Payment already processed', 400);
  }

  const event = await Event.findById(payment.event);
  if (!event) {
    throw createError('Event not found', 404);
  }

  const receiptUrl = await getReceiptUrl(paymentIntentId);

  payment.status = 'succeeded';
  payment.receiptUrl = receiptUrl;
  await payment.save();

  if (!event.participants.includes(userId as any)) {
    event.participants.push(userId as any);
    event.currentParticipants = event.participants.length;

    if (event.currentParticipants >= event.maxParticipants) {
      event.status = 'full';
    }

    await event.save();
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
});

export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const payments = await Payment.find({ user: userId })
      .populate({
        path: 'event',
        select: 'title date time location hostName joiningFee status image category',
        options: {
          transform: (doc: any) => {
            if (!doc) return null;
            const eventObj = doc.toObject ? doc.toObject() : doc;
            return {
              ...eventObj,
              formattedDate: eventObj.date ? new Date(eventObj.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : null
            };
          }
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments({ user: userId });

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    console.error('Error in getPaymentHistory:', error);
    throw createError(`Failed to fetch payment history: ${error.message}`, 500);
  }
});

export const getPaymentDetails = asyncHandler(async (req: Request, res: Response) => {
  const payment = await Payment.findById(req.params.id)
    .populate('event', 'title date location host')
    .populate('user', 'name email');

  if (!payment) {
    throw createError('Payment not found', 404);
  }

  const userId = (req as any).user.userId;
  if (payment.user.toString() !== userId && (req as any).user.role !== 'admin') {
    throw createError('Not authorized to view this payment', 403);
  }

  res.json({
    success: true,
    data: { payment }
  });
});

export const freeEventJoin = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.body;
  const userId = (req as any).user.userId;

  if (!eventId) {
    throw createError('Event ID is required', 400);
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw createError('Event not found', 404);
  }

  if (event.joiningFee > 0) {
    throw createError('This event requires payment', 400);
  }

  if (event.participants.includes(userId as any)) {
    throw createError('Already joined this event', 400);
  }

  if (event.status !== 'open') {
    throw createError('Event is not open for joining', 400);
  }

  if (event.currentParticipants >= event.maxParticipants) {
    throw createError('Event is full', 400);
  }

  event.participants.push(userId as any);
  event.currentParticipants = event.participants.length;

  if (event.currentParticipants >= event.maxParticipants) {
    event.status = 'full';
  }

  await event.save();

  const payment = await Payment.create({
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
});

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      let receiptUrl = '';
      try {
        if (paymentIntent.latest_charge) {
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
          receiptUrl = charge.receipt_url || '';
        }
      } catch (error) {
        console.error('Error fetching charge for receipt URL:', error);
      }

      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        { 
          status: 'succeeded',
          receiptUrl: receiptUrl
        }
      );
      console.log(`Payment succeeded: ${paymentIntent.id}`);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: failedPayment.id },
        { status: 'failed' }
      );
      console.log(`Payment failed: ${failedPayment.id}`);
      break;

    case 'charge.succeeded':
      const charge = event.data.object as Stripe.Charge;
      if (charge.payment_intent) {
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: charge.payment_intent as string },
          { 
            status: 'succeeded',
            receiptUrl: charge.receipt_url || ''
          }
        );
        console.log(`Charge succeeded for payment intent: ${charge.payment_intent}`);
      }
      break;

    case 'charge.failed':
      const failedCharge = event.data.object as Stripe.Charge;
      if (failedCharge.payment_intent) {
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: failedCharge.payment_intent as string },
          { status: 'failed' }
        );
        console.log(`Charge failed for payment intent: ${failedCharge.payment_intent}`);
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});
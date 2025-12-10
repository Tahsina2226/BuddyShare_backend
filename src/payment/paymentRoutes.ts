import express from 'express';
import {
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
  getPaymentDetails,
  freeEventJoin,
  handleWebhook
} from './paymentController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Webhook route (must be before body parser)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.use(protect);

router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);
router.post('/free-join', freeEventJoin);
router.get('/history', getPaymentHistory);
router.get('/:id', getPaymentDetails);

export default router;
import { Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  Event,
  EventRegistration,
  Payment,
  Notification,
  User,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateTicketQR } from '../services/qrService';
import { addStudentToEventGroup } from '../services/eventGroupService';
import { sendRegistrationSuccessEmail } from '../services/emailService';

/**
 * STEP 1: BACKEND - Create Order
 * - Endpoint: POST /api/create-order or /api/payments/create-order
 * - Call Razorpay API: POST https://api.razorpay.com/v1/orders
 * - Request: { amount (paise), currency, receipt } or { registrationId }
 * - Return: { order_id, amount, currency }
 * - Minimum amount: 100 paise
 */
export async function createPaymentOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay credentials not configured on server (RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing).',
      });
    }

    const { registrationId, currency: reqCurrency, receipt: reqReceipt, notes: reqNotes } = req.body;
    let registration: any = null;
    let event: any = null;

    if (registrationId) {
      registration = await EventRegistration.findOne({ registrationId });
      if (!registration) {
        return res.status(404).json({ success: false, message: 'Registration not found' });
      }

      event = await Event.findById(registration.eventId);
      if (!event) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
    }

    // Determine amount in paise
    let amountInPaise: number;
    if (req.body.amount !== undefined && req.body.amount !== null) {
      amountInPaise = Number(req.body.amount);
    } else if (event) {
      amountInPaise = Math.round((event.registrationFee || 0) * 100);
    } else {
      amountInPaise = 0;
    }

    // Validation: Minimum amount: 100 paise
    if (!amountInPaise || typeof amountInPaise !== 'number' || isNaN(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Minimum amount is 100 paise (₹1.00).',
      });
    }

    const currency = (reqCurrency || 'INR').toUpperCase();
    const receipt =
      reqReceipt ||
      (registration
        ? `rcpt_${registration.registrationId}`
        : `rcpt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`);

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const orderOptions: any = {
      amount: Math.round(amountInPaise),
      currency,
      receipt,
      notes: {
        registrationId: registration ? registration.registrationId : '',
        eventId: event ? String(event._id) : '',
        eventTitle: event ? event.title : '',
        ...(reqNotes || {}),
      },
    };

    const razorpayOrder = await razorpay.orders.create(orderOptions);

    // Persist Payment document
    try {
      await Payment.create({
        orderId: razorpayOrder.id,
        paymentId: '',
        registrationId: registration ? registration.registrationId : '',
        eventId: event ? String(event._id) : '',
        studentId: registration ? String(registration.studentId) : '',
        amount: Number(razorpayOrder.amount) / 100,
        currency: razorpayOrder.currency,
        gatewayStatus: 'Created',
        verificationStatus: 'Pending',
        paymentMethod: 'RAZORPAY',
      });
    } catch (dbErr) {
      console.warn('[PAYMENT] Non-fatal: could not create initial Payment record:', dbErr);
    }

    // Return required fields: order_id, amount, currency
    return res.status(200).json({
      success: true,
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      key_id: keyId,
      key: keyId,
      // Field aliases for compatibility with diverse clients
      orderId: razorpayOrder.id,
      id: razorpayOrder.id,
      order: {
        orderId: razorpayOrder.id,
        amount: Number(razorpayOrder.amount) / 100,
        amount_paise: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        eventTitle: event?.title,
        registrationId: registration?.registrationId,
        payeeConfig: event?.paymentConfig || {},
      },
    });
  } catch (error: any) {
    console.error('[RAZORPAY CREATE ORDER ERROR]:', error);
    const status = error.statusCode || error.status;
    if (
      status === 401 ||
      (error.error && error.error.code === 'BAD_REQUEST_ERROR' && error.error.description?.toLowerCase().includes('auth'))
    ) {
      return res.status(401).json({
        success: false,
        message: error.error?.description || 'Razorpay authentication failed. Please check API credentials.',
      });
    }
    return res.status(500).json({
      success: false,
      message: error.error?.description || error.message || 'Failed to create Razorpay order.',
    });
  }
}

/**
 * STEP 3: BACKEND - Verify Signature
 * - Endpoint: POST /api/verify-payment or /api/payments/verify
 * - Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * - Compare generated signature with razorpay_signature
 * - Return success only if signatures match
 * - Signature mismatch: return 400, do NOT mark as paid
 * - Missing fields: return 400
 */
export async function verifyPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const orderId =
      req.body.order_id ||
      req.body.razorpay_order_id ||
      req.body.orderId;

    const paymentId =
      req.body.payment_id ||
      req.body.razorpay_payment_id ||
      req.body.paymentId;

    const signature =
      req.body.signature ||
      req.body.razorpay_signature;

    // Validate missing fields
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields. order_id, payment_id, and signature are required.',
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay secret key not configured on server.',
      });
    }

    // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Compare generated signature with razorpay_signature
    if (generatedSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Verification failed.',
      });
    }

    // Signature match verified! Update payment records
    const payment = await Payment.findOne({ orderId });
    if (payment) {
      await Payment.findByIdAndUpdate(payment._id, {
        paymentId,
        gatewayStatus: 'Captured',
        verificationStatus: 'Verified',
      });
    }

    let registration: any = null;
    let event: any = null;
    let qrDataUrl = '';

    const registrationId = req.body.registrationId || (payment ? payment.registrationId : null);
    if (registrationId) {
      registration = await EventRegistration.findOne({ registrationId });
      if (registration) {
        event = await Event.findById(registration.eventId);

        if (registration.paymentStatus !== 'Completed') {
          // Generate QR ticket
          try {
            const qrRes = await generateTicketQR(registration);
            qrDataUrl = qrRes.qrDataUrl;
          } catch (qrErr) {
            console.warn('[PAYMENT] Error generating ticket QR:', qrErr);
          }

          // Update registration to Confirmed and Completed payment
          await EventRegistration.findByIdAndUpdate(registration._id, {
            paymentStatus: 'Completed',
            status: 'Confirmed',
            paymentId,
            qrCodeUrl: qrDataUrl || registration.qrCodeUrl,
          });

          // Increment event registration count
          if (event) {
            await Event.updateOne({ _id: event._id }, { $inc: { registeredCount: 1 } });
            if (registration.studentUserId) {
              await addStudentToEventGroup(event._id, registration.studentUserId);
            }
          }

          // Send notifications
          if (registration.studentUserId) {
            await Notification.create({
              recipientUserId: registration.studentUserId,
              type: 'PAYMENT',
              title: 'Payment Confirmed & Ticket Issued!',
              message: `Your payment for "${event?.title || 'Event'}" was verified via Razorpay. Your ticket QR is now available!`,
              link: `/student/ticket/${registration.registrationId}`,
              read: false,
            });
          }

          // Send confirmation email
          if (registration.studentEmail && event) {
            try {
              await sendRegistrationSuccessEmail({
                recipientEmail: registration.studentEmail,
                studentName: registration.studentName || 'Student',
                eventTitle: event.title,
                collegeName: event.hostCollegeName || 'EventHub College',
                registrationId: registration.registrationId,
                eventDate: event.eventDate,
                venue: event.venue || event.meetingPlatform || 'Campus',
                ticketUrl: `/student/ticket/${registration.registrationId}`,
              });
            } catch (emailErr: any) {
              console.warn('[PAYMENT] Could not send confirmation email:', emailErr.message);
            }
          }
        } else {
          qrDataUrl = registration.qrCodeUrl;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      order_id: orderId,
      payment_id: paymentId,
      registrationId: registration?.registrationId,
      ticketUrl: registration ? `/student/ticket/${registration.registrationId}` : undefined,
      qrCodeUrl: qrDataUrl,
    });
  } catch (error: any) {
    console.error('[RAZORPAY VERIFY PAYMENT ERROR]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Payment verification error.' });
  }
}

import { Response } from 'express';
import crypto from 'crypto';
import {
  Event,
  EventRegistration,
  Payment,
  Notification,
  User,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateTicketQR } from '../services/qrService';

export async function createPaymentOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { registrationId } = req.body;
    if (!registrationId) {
      return res.status(400).json({ success: false, message: 'Registration ID required' });
    }

    const registration = await EventRegistration.findOne({ registrationId });
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    const event = await Event.findById(registration.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const orderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const amount = event.registrationFee;

    const payment = await Payment.create({
      orderId,
      paymentId: '',
      registrationId: registration.registrationId,
      eventId: event._id,
      studentId: registration.studentId,
      amount,
      currency: 'USD',
      gatewayStatus: 'Created',
      verificationStatus: 'Pending',
      paymentMethod: 'GATEWAY_CARD_UPI',
    });

    return res.json({
      success: true,
      order: {
        orderId: payment.orderId,
        amount,
        currency: 'USD',
        eventTitle: event.title,
        registrationId: registration.registrationId,
        payeeConfig: event.paymentConfig || {},
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function verifyPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      orderId,
      paymentId = `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      signature,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment order not found.' });
    }

    const registration = await EventRegistration.findOne({ registrationId: payment.registrationId });
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Associated registration not found.' });
    }

    const event = await Event.findById(payment.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Mark payment as verified
    await Payment.findByIdAndUpdate(payment._id, {
      paymentId,
      gatewayStatus: 'Captured',
      verificationStatus: 'Verified',
    });

    // Generate QR ticket
    const { qrDataUrl } = await generateTicketQR(registration);

    // Update registration to Confirmed and Completed payment
    await EventRegistration.findByIdAndUpdate(registration._id, {
      paymentStatus: 'Completed',
      status: 'Confirmed',
      paymentId,
      qrCodeUrl: qrDataUrl,
    });

    // Increment event registration count
    await Event.updateOne({ _id: event._id }, { $inc: { registeredCount: 1 } });

    // Send notifications
    await Notification.create({
      recipientUserId: registration.studentUserId,
      type: 'PAYMENT',
      title: 'Payment Confirmed & Ticket Issued!',
      message: `Your payment of $${payment.amount} for "${event.title}" was verified. Your ticket QR is now available!`,
      link: `/student/ticket/${registration.registrationId}`,
      read: false,
    });

    return res.json({
      success: true,
      message: 'Payment verified and ticket generated successfully!',
      registrationId: registration.registrationId,
      ticketUrl: `/student/ticket/${registration.registrationId}`,
      qrCodeUrl: qrDataUrl,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

import { Response } from 'express';
import crypto from 'crypto';
import {
  Event,
  EventRegistration,
  StudentProfile,
  Notification,
  College,
  IEventRegistration,
  User,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateTicketQR } from '../services/qrService';

export async function registerForEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || user.role !== 'Student') {
      return res.status(403).json({ success: false, message: 'Only students can register for events.' });
    }

    const {
      eventId,
      registrationType = 'Individual',
      teamName,
      teamMembers,
      customResponses = {},
    } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (event.status !== 'Published') {
      return res.status(400).json({ success: false, message: 'This event is not accepting registrations.' });
    }

    // Check deadline
    const deadline = new Date(event.registrationDeadline).getTime();
    if (Date.now() > deadline) {
      return res.status(400).json({ success: false, message: 'Registration deadline for this event has passed.' });
    }

    // Check capacity
    if ((event.registeredCount || 0) >= event.capacity) {
      return res.status(400).json({ success: false, message: 'Event is fully booked. Capacity reached.' });
    }

    // Get student profile
    const studentProfile = await StudentProfile.findOne({ userId: user._id });
    if (!studentProfile) {
      return res.status(400).json({ success: false, message: 'Please complete your student profile first.' });
    }

    // Check existing registration
    const existing = await EventRegistration.findOne({
      eventId: event._id,
      studentUserId: user._id,
      status: { $in: ['Confirmed', 'Pending'] },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already registered for this event.',
        registrationId: existing.registrationId,
      });
    }

    // Validate required questions
    if (event.registrationQuestions && event.registrationQuestions.length > 0) {
      for (const q of event.registrationQuestions) {
        if (q.required && (!customResponses[q.id] || String(customResponses[q.id]).trim() === '')) {
          return res.status(400).json({ success: false, message: `Please answer required question: "${q.label}"` });
        }
      }
    }

    // Generate readable unique registration ID
    const regCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const registrationId = `EH-2026-${regCode}`;
    const secureToken = crypto.randomBytes(20).toString('hex');

    const isFree = event.isFree;
    const amount = isFree ? 0 : (event.registrationFee || 0);

    const newReg: Partial<IEventRegistration> = {
      registrationId,
      eventId: event._id,
      studentId: studentProfile._id,
      studentUserId: user._id,
      collegeId: event.hostCollegeId,
      studentName: studentProfile.fullName,
      studentEmail: studentProfile.email,
      studentPhone: studentProfile.phoneNumber,
      studentCollege: studentProfile.collegeName,
      studentDepartment: studentProfile.department,
      studentYear: studentProfile.yearOfStudy,
      registrationType,
      teamName: registrationType === 'Team' ? teamName : undefined,
      teamMembers: registrationType === 'Team' ? teamMembers : undefined,
      customResponses,
      isFree,
      amount,
      paymentStatus: isFree ? 'Waived' : 'Pending',
      status: isFree ? 'Confirmed' : 'Pending',
      attended: false,
      certificateIssued: false,
      qrToken: secureToken,
    };

    const registration = await EventRegistration.create(newReg);

    if (isFree) {
      // Free event: Immediately confirmed! Generate QR code & update stats
      const { qrDataUrl } = await generateTicketQR(registration);
      await EventRegistration.findByIdAndUpdate(registration._id, { qrCodeUrl: qrDataUrl });
      await Event.updateOne({ _id: event._id }, { $inc: { registeredCount: 1 } });

      // Notify student
      await Notification.create({
        recipientUserId: user._id,
        type: 'REGISTRATION',
        title: 'Registration Confirmed!',
        message: `Your registration for "${event.title}" is confirmed. Your Registration ID is ${registrationId}.`,
        link: `/student/ticket/${registration.registrationId}`,
        read: false,
      });

      // Notify college organizer
      const collegeAdmins = await User.find({ collegeId: event.hostCollegeId });
      for (const admin of collegeAdmins) {
        await Notification.create({
          recipientUserId: admin._id,
          type: 'REGISTRATION',
          title: 'New Event Registration',
          message: `${studentProfile.fullName} registered for "${event.title}".`,
          link: `/college/events?eventId=${event._id}&tab=registrations`,
          read: false,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Registration successful! Your ticket QR is ready.',
        isFree: true,
        registration: {
          ...registration,
          qrCodeUrl: qrDataUrl,
        },
      });
    }

    // Paid event: Return pending registration for checkout flow
    return res.status(201).json({
      success: true,
      message: 'Registration initiated. Please proceed to payment.',
      isFree: false,
      registrationId: registration.registrationId,
      amount,
      registration,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getStudentRegistrations(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const registrations = await EventRegistration.find({ studentUserId: user._id })
      .sort({ createdAt: -1 })
      .exec();

    // Attach event details
    const populated = await Promise.all(
      registrations.map(async (reg) => {
        const event = await Event.findById(reg.eventId);
        return {
          ...reg,
          event: event || null,
        };
      })
    );

    return res.json({ success: true, registrations: populated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getCollegeRegistrations(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { eventId, search, paymentStatus, attended } = req.query;

    const filter: any = {};

    // Allow student organizers to access registrations for events they created
    if (user.role === 'Student') {
      if (!eventId) {
        return res.status(400).json({ success: false, message: 'Event ID is required' });
      }
      const event = await Event.findById(eventId);
      if (!event || event.creatorUserId !== user._id) {
        return res.status(403).json({ success: false, message: 'You are not the organizer of this event' });
      }
      filter.eventId = eventId;
    } else {
      if (!user.collegeId) return res.status(403).json({ success: false, message: 'College account required' });
      filter.collegeId = user.collegeId;
      if (eventId) filter.eventId = eventId;
    }

    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (attended !== undefined && attended !== '') filter.attended = attended === 'true';

    let registrations = await EventRegistration.find(filter).sort({ createdAt: -1 }).exec();

    if (search) {
      const s = String(search).toLowerCase();
      registrations = registrations.filter(
        (r) =>
          r.studentName.toLowerCase().includes(s) ||
          r.registrationId.toLowerCase().includes(s) ||
          r.studentEmail.toLowerCase().includes(s) ||
          r.studentDepartment.toLowerCase().includes(s)
      );
    }

    // Attach event info
    const enriched = await Promise.all(
      registrations.map(async (reg) => {
        const event = await Event.findById(reg.eventId);
        return {
          ...reg,
          eventTitle: event?.title || 'Unknown Event',
          eventDate: event?.eventDate || '',
        };
      })
    );

    return res.json({ success: true, total: enriched.length, registrations: enriched });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getRegistrationTicket(req: AuthenticatedRequest, res: Response) {
  try {
    const { registrationId } = req.params;
    const registration = await EventRegistration.findOne({ registrationId });
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const event = await Event.findById(registration.eventId);
    const hostCollege = await College.findById(registration.collegeId);

    // Make sure QR code is cached and consistent
    let qrCodeUrl = registration.qrCodeUrl;
    if (!qrCodeUrl) {
      const qrRes = await generateTicketQR(registration);
      qrCodeUrl = qrRes.qrDataUrl;
      await EventRegistration.findByIdAndUpdate(registration._id, { qrCodeUrl });
    }

    return res.json({
      success: true,
      ticket: {
        registrationId: registration.registrationId,
        eventId: registration.eventId,
        eventTitle: event?.title,
        eventPoster: event?.poster,
        eventDate: event?.eventDate,
        startTime: event?.startTime,
        endTime: event?.endTime,
        eventMode: event?.eventMode,
        venue: event?.venue || event?.meetingPlatform,
        hallRoom: event?.hallRoom,
        studentName: registration.studentName,
        studentEmail: registration.studentEmail,
        studentCollege: registration.studentCollege,
        studentDepartment: registration.studentDepartment,
        studentYear: registration.studentYear,
        registrationType: registration.registrationType,
        teamName: registration.teamName,
        paymentStatus: registration.paymentStatus,
        status: registration.status,
        attended: registration.attended,
        hostCollegeName: hostCollege?.name,
        hostCollegeLogo: hostCollege?.logo,
        qrToken: registration.qrToken,
        passId: registration.qrToken,
        customResponses: registration.customResponses || {},
        qrCodeUrl,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

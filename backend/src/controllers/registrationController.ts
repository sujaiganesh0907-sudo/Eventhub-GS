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
  CollegeAdminMembership,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';
import { generateTicketQR } from '../services/qrService';
import {
  addStudentToEventGroup,
  removeStudentFromEventGroup,
} from '../services/eventGroupService';

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
      return res.status(400).json({ success: false, message: 'Registration Closed. The registration deadline for this event has passed.' });
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

    // Validate default registration fields
    const studentName = (req.body.studentName || studentProfile.fullName || user.fullName || '').trim();
    const studentEmail = (req.body.studentEmail || studentProfile.email || user.email || '').trim();
    const rawPhone = (req.body.studentPhone || req.body.phone || studentProfile.phoneNumber || '').trim();
    const studentPhone = rawPhone.replace(/[\s\-()]/g, '');
    const studentCollege = (req.body.studentCollege || req.body.collegeName || studentProfile.collegeName || '').trim();

    if (!studentName) {
      return res.status(400).json({ success: false, message: 'Full Name is required for registration.' });
    }
    if (!studentEmail) {
      return res.status(400).json({ success: false, message: 'Email Address is required for registration.' });
    }
    if (!studentCollege) {
      return res.status(400).json({ success: false, message: 'College Name is required for registration.' });
    }
    if (!studentPhone || (!/^[6-9]\d{9}$/.test(studentPhone) && !/^\d{10}$/.test(studentPhone))) {
      return res.status(400).json({ success: false, message: 'A valid 10-digit mobile number is required for registration.' });
    }

    // Save phone to profile if profile currently has no phone
    if (!studentProfile.phoneNumber && studentPhone) {
      await StudentProfile.findByIdAndUpdate(studentProfile._id, { phoneNumber: studentPhone });
    }

    // Validate custom registration questions
    if (event.registrationQuestions && event.registrationQuestions.length > 0) {
      for (const q of event.registrationQuestions) {
        const val = customResponses[q.id];
        const isEmpty = val === undefined || val === null || String(val).trim() === '';
        if (q.required && isEmpty) {
          return res.status(400).json({ success: false, message: `Please answer required question: "${q.label}"` });
        }
        if (!isEmpty && (q.type === 'Link' || (q as any).type === 'URL')) {
          if (!/^https?:\/\/.+/i.test(String(val).trim())) {
            return res.status(400).json({ success: false, message: `Answer for "${q.label}" must be a valid URL.` });
          }
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
      studentName,
      studentEmail,
      studentPhone,
      studentCollege,
      studentDepartment: studentProfile.department || req.body.studentDepartment || 'General',
      studentYear: studentProfile.yearOfStudy || req.body.studentYear || '1st Year',
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

      // PART 5C: Automatically add confirmed student to Event Group
      await addStudentToEventGroup(event._id, user._id);

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
    let targetCollegeId =
      (req.headers['x-college-id'] as string) ||
      (req.query.collegeId as string) ||
      user.collegeId;

    if (!targetCollegeId && (user.role === 'College Super Admin' || user.role === 'College Admin')) {
      if (user.role === 'College Super Admin') {
        const c = await College.findOne({ superAdminId: user._id });
        if (c) targetCollegeId = c._id;
      }
      if (!targetCollegeId) {
        const m = await CollegeAdminMembership.findOne({ userId: user._id, status: 'Active' });
        if (m) targetCollegeId = m.collegeId;
      }
    }

    const filter: any = {};

    // Check if user is operating as an authorized College Administrator
    let isAuthorizedCollegeAdmin = false;
    if (targetCollegeId) {
      if (user.role === 'College Super Admin') {
        const c = await College.findById(targetCollegeId);
        if (c && (c.superAdminId === user._id || user.collegeId === targetCollegeId)) {
          isAuthorizedCollegeAdmin = true;
        }
      }
      if (!isAuthorizedCollegeAdmin) {
        const membership = await CollegeAdminMembership.findOne({
          collegeId: targetCollegeId,
          userId: user._id,
          status: 'Active',
        });
        if (membership) {
          if (
            membership.role === 'College Super Admin' ||
            membership.permissions.includes('manageRegistrations') ||
            membership.permissions.includes('ALL_PERMISSIONS') ||
            membership.permissions.includes('manageAttendance')
          ) {
            isAuthorizedCollegeAdmin = true;
          } else {
            return res.status(403).json({
              success: false,
              message: "Access denied. You lack the 'manageRegistrations' permission for this institution.",
            });
          }
        }
      }
    }

    if (isAuthorizedCollegeAdmin && targetCollegeId) {
      filter.collegeId = targetCollegeId;
      if (eventId) filter.eventId = eventId;
    } else if (user.role === 'Student') {
      // Student organizer viewing registrations for their own event
      if (!eventId) {
        return res.status(400).json({ success: false, message: 'Event ID is required' });
      }
      const event = await Event.findById(String(eventId));
      if (!event || event.creatorUserId !== user._id) {
        return res.status(403).json({ success: false, message: 'You are not the organizer of this event' });
      }
      filter.eventId = eventId;
    } else {
      return res.status(403).json({ success: false, message: 'College administrator privileges required.' });
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
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { registrationId } = req.params;
    const registration = await EventRegistration.findOne({ registrationId });
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const event = await Event.findById(registration.eventId);
    const hostCollege = await College.findById(registration.collegeId);

    // Privacy & Security (Requirement STEP 10):
    // Only the ticket owner OR host college organizers can access private ticket QR and responses
    const isOwner = registration.studentUserId === user._id;
    const isHostCollege = user.collegeId && (user.collegeId === registration.collegeId || (event && event.hostCollegeId === user.collegeId));
    const isSuperAdmin = user.role === 'College Super Admin' && user.collegeId === registration.collegeId;

    if (!isOwner && !isHostCollege && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You cannot view another student’s private ticket, QR code, or registration details.',
      });
    }

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

/**
 * Cancel Registration (Part 5C: Removes student from Event Group automatically)
 */
export async function cancelRegistration(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const reg = (await EventRegistration.findOne({ registrationId: id })) || (await EventRegistration.findById(id));
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });

    const isOwner = reg.studentUserId === user._id;
    let isCollegeAdmin = false;
    if (user.collegeId && user.collegeId === reg.collegeId) {
      if (user.role === 'College Super Admin' || user.role === 'College Admin') {
        isCollegeAdmin = true;
      }
    }

    if (!isOwner && !isCollegeAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this registration' });
    }

    if (reg.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Registration is already cancelled' });
    }

    await EventRegistration.findByIdAndUpdate(reg._id, { status: 'Cancelled' });
    await Event.updateOne({ _id: reg.eventId }, { $inc: { registeredCount: -1 } });

    // Revoke Event Group access immediately (Requirement 7)
    await removeStudentFromEventGroup(reg.eventId, reg.studentUserId);

    return res.json({
      success: true,
      message: 'Registration cancelled successfully and event group access revoked.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Reject Registration (College Admin action)
 */
export async function rejectRegistration(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const { reason = 'Cancelled by administrator' } = req.body;
    const reg = (await EventRegistration.findOne({ registrationId: id })) || (await EventRegistration.findById(id));
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });

    if (user.collegeId !== reg.collegeId && user.role !== 'College Super Admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await EventRegistration.findByIdAndUpdate(reg._id, { status: 'Rejected' });
    await Event.updateOne({ _id: reg.eventId }, { $inc: { registeredCount: -1 } });

    // Revoke Event Group access immediately (Requirement 7)
    await removeStudentFromEventGroup(reg.eventId, reg.studentUserId);

    return res.json({
      success: true,
      message: 'Registration rejected and event group access revoked.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

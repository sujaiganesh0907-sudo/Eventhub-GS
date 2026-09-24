import { Response } from 'express';
import {
  Event,
  EventRegistration,
  Attendance,
  RegistrationQR,
  Notification,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

export async function verifyAndScanQR(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { eventId, qrData, rawToken } = req.body;
    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    let parsedPayload: any = null;
    let token = rawToken;

    if (qrData) {
      try {
        parsedPayload = typeof qrData === 'object' ? qrData : JSON.parse(qrData);
        token = token || parsedPayload.token;
      } catch (e) {
        // Not JSON, may be raw registrationId or token
        token = token || qrData;
      }
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Find registration either by qrPayload token, or registrationId
    let registration: any = null;

    if (parsedPayload && parsedPayload.regId) {
      registration = await EventRegistration.findOne({ registrationId: parsedPayload.regId });
    } else if (token) {
      const qrRecord = await RegistrationQR.findOne({ secureToken: token });
      if (qrRecord) {
        registration = await EventRegistration.findOne({ registrationId: qrRecord.registrationId });
      } else {
        registration = await EventRegistration.findOne({ registrationId: token });
      }
    }

    if (!registration) {
      return res.status(404).json({
        success: false,
        errorType: 'INVALID_TICKET',
        message: 'Invalid ticket. No corresponding registration found.',
      });
    }

    // Validate Event Match
    if (registration.eventId !== eventId) {
      return res.status(400).json({
        success: false,
        errorType: 'WRONG_EVENT',
        message: 'Wrong event! This ticket is for a different event.',
        ticketEventId: registration.eventId,
      });
    }

    // Validate Registration Status
    if (registration.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        errorType: 'CANCELLED_REGISTRATION',
        message: 'Registration was cancelled.',
      });
    }

    // Validate Payment
    if (!registration.isFree && registration.paymentStatus !== 'Completed') {
      return res.status(400).json({
        success: false,
        errorType: 'PAYMENT_NOT_VERIFIED',
        message: `Payment is not completed. Current status: ${registration.paymentStatus}`,
      });
    }

    // Check if already scanned/marked
    if (registration.attended) {
      return res.status(400).json({
        success: false,
        errorType: 'ALREADY_SCANNED',
        message: `Attendance already marked for this participant at ${registration.attendedAt || 'earlier today'}.`,
        participant: {
          name: registration.studentName,
          registrationId: registration.registrationId,
          attendedAt: registration.attendedAt,
        },
      });
    }

    // Return valid participant details for organizer review & confirmation
    return res.json({
      success: true,
      valid: true,
      message: 'Valid ticket. Ready to mark attendance.',
      participant: {
        registrationId: registration.registrationId,
        studentName: registration.studentName,
        studentCollege: registration.studentCollege,
        studentDepartment: registration.studentDepartment,
        studentYear: registration.studentYear,
        registrationType: registration.registrationType,
        teamName: registration.teamName,
        paymentStatus: registration.paymentStatus,
        eventId: registration.eventId,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function markAttendance(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { eventId, registrationId, status = 'Present', method = 'QR_SCAN' } = req.body;
    if (!eventId || !registrationId) {
      return res.status(400).json({ success: false, message: 'Event ID and Registration ID required.' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const registration = await EventRegistration.findOne({ registrationId, eventId });
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration record not found for this event.' });
    }

    const isPresent = status === 'Present';
    const now = new Date().toISOString();

    // Check existing attendance record
    const existingAttendance = await Attendance.findOne({ eventId, registrationId });

    if (isPresent) {
      if (!existingAttendance) {
        await Attendance.create({
          eventId,
          registrationId,
          studentId: registration.studentId,
          studentName: registration.studentName,
          studentCollege: registration.studentCollege,
          method: method as any,
          markedByUserId: user._id,
          status: 'Present',
          markedAt: now,
        });

        // Update registration record
        await EventRegistration.findByIdAndUpdate(registration._id, {
          attended: true,
          attendedAt: now,
        });

        // Increment event attendance count
        await Event.updateOne({ _id: eventId }, { $inc: { attendanceCount: 1 } });

        // Notify student
        await Notification.create({
          recipientUserId: registration.studentUserId,
          type: 'ATTENDANCE',
          title: 'Attendance Marked!',
          message: `Your attendance for "${event.title}" has been marked as Present.`,
          link: `/student/events?tab=completed`,
          read: false,
        });
      }
    } else {
      // Mark as Absent
      if (existingAttendance && existingAttendance.status === 'Present') {
        await Attendance.findByIdAndUpdate(existingAttendance._id, {
          status: 'Absent',
          markedAt: now,
        });

        await EventRegistration.findByIdAndUpdate(registration._id, {
          attended: false,
          attendedAt: undefined,
        });

        await Event.updateOne({ _id: eventId }, { $inc: { attendanceCount: -1 } });
      } else if (!existingAttendance) {
        await Attendance.create({
          eventId,
          registrationId,
          studentId: registration.studentId,
          studentName: registration.studentName,
          studentCollege: registration.studentCollege,
          method: 'MANUAL',
          markedByUserId: user._id,
          status: 'Absent',
          markedAt: now,
        });
      }
    }

    return res.json({
      success: true,
      message: `Attendance marked as ${status} for ${registration.studentName}.`,
      registrationId,
      status,
      timestamp: now,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getEventAttendanceList(req: AuthenticatedRequest, res: Response) {
  try {
    const { eventId } = req.params;
    const { search } = req.query;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    let registrations = await EventRegistration.find({ eventId }).sort({ createdAt: -1 }).exec();

    if (search) {
      const s = String(search).toLowerCase();
      registrations = registrations.filter(
        (r) =>
          r.studentName.toLowerCase().includes(s) ||
          r.registrationId.toLowerCase().includes(s) ||
          r.studentCollege.toLowerCase().includes(s)
      );
    }

    const registered = registrations.length;
    const present = registrations.filter((r) => r.attended).length;
    const absent = registrations.filter((r) => !r.attended && r.status === 'Confirmed').length;

    return res.json({
      success: true,
      counts: {
        registered,
        present,
        absent,
        pending: registered - present,
      },
      list: registrations.map((r) => ({
        registrationId: r.registrationId,
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        studentCollege: r.studentCollege,
        studentDepartment: r.studentDepartment,
        studentYear: r.studentYear,
        status: r.attended ? 'Present' : 'Absent',
        attendedAt: r.attendedAt || null,
        certificateIssued: r.certificateIssued,
        paymentStatus: r.paymentStatus,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

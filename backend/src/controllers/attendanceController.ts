import { Response } from 'express';
import crypto from 'crypto';
import {
  Event,
  EventRegistration,
  Attendance,
  RegistrationQR,
  Notification,
  StudentProfile,
  College,
  CollegeAdminMembership,
  Certificate,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';
import { generatePdfCertificate } from '../services/certificateService';
import { sendCertificateEmail } from '../services/emailService';

/**
 * Helper to check whether user has event management / attendance access.
 * Allowed:
 * 1. College Super Admin (for this college's events)
 * 2. College Admin with ATTENDANCE_SCAN, ATTENDANCE_MANAGE, or EVENTS_MANAGE permission
 * 3. Approved Student Event Creator (for their own approved event)
 */
export async function isUserAuthorizedForEventAttendance(user: any, event: any): Promise<boolean> {
  if (!user || !event) return false;

  // 1. Student Creator check
  if (user.role === 'Student') {
    const isApprovedOrCompleted = ['Published', 'Approved', 'Completed'].includes(event.status);
    return event.creatorUserId === user._id && isApprovedOrCompleted;
  }

  // 2. College Super Admin check
  if (user.role === 'College Super Admin') {
    return event.hostCollegeId === user.collegeId;
  }

  // 3. College Admin check
  if (user.role === 'College Admin' && event.hostCollegeId === user.collegeId) {
    const membership = await CollegeAdminMembership.findOne({
      collegeId: user.collegeId,
      userId: user._id,
    });
    if (!membership) return true; // fallback
    const perms = membership.permissions || [];
    return (
      perms.includes('ATTENDANCE_SCAN') ||
      perms.includes('ATTENDANCE_MANAGE') ||
      perms.includes('EVENTS_MANAGE') ||
      perms.length === 0
    );
  }

  return false;
}

export async function verifyAndScanQR(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { eventId, qrData, rawToken, qrToken } = req.body;
    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required.' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Permission check
    const authorized = await isUserAuthorizedForEventAttendance(user, event);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to manage check-in or scan passes for this event.',
      });
    }

    let parsedPayload: any = null;
    let token = rawToken || qrToken;

    if (qrData) {
      try {
        parsedPayload = typeof qrData === 'object' ? qrData : JSON.parse(qrData);
        token = token || parsedPayload.token || parsedPayload.regId;
      } catch (e) {
        token = token || qrData;
      }
    }

    if (!token && !parsedPayload) {
      return res.status(400).json({ success: false, message: 'No QR pass or token provided.' });
    }

    // Find registration either by qrPayload token, secureToken in RegistrationQR, qrToken, or registrationId
    let registration: any = null;

    if (parsedPayload && parsedPayload.regId) {
      registration = await EventRegistration.findOne({ registrationId: parsedPayload.regId });
    }

    if (!registration && token) {
      const qrRecord = await RegistrationQR.findOne({ secureToken: token });
      if (qrRecord) {
        registration = await EventRegistration.findOne({ registrationId: qrRecord.registrationId });
      } else {
        registration =
          (await EventRegistration.findOne({ qrToken: token })) ||
          (await EventRegistration.findOne({ registrationId: token }));
      }
    }

    if (!registration) {
      return res.status(404).json({
        success: false,
        errorType: 'INVALID_TICKET',
        message: 'Invalid pass. No registration found matching this QR code or Pass ID.',
      });
    }

    // 1. Verify Event Match
    if (registration.eventId !== eventId) {
      return res.status(400).json({
        success: false,
        errorType: 'WRONG_EVENT',
        message: 'Wrong event! This ticket pass belongs to a different event.',
        ticketEventId: registration.eventId,
      });
    }

    // 2. Verify Registration Status
    if (registration.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        errorType: 'CANCELLED_REGISTRATION',
        message: 'This registration has been cancelled.',
      });
    }

    // 3. Verify Payment
    if (!registration.isFree && registration.paymentStatus !== 'Completed') {
      return res.status(400).json({
        success: false,
        errorType: 'PAYMENT_NOT_VERIFIED',
        message: `Payment is not completed. Current status: ${registration.paymentStatus}`,
      });
    }

    // 4. Check if already checked in
    if (registration.attended) {
      return res.status(400).json({
        success: false,
        errorType: 'ALREADY_SCANNED',
        message: `Already Checked In! Attendance was marked for ${registration.studentName} at ${
          registration.attendedAt ? new Date(registration.attendedAt).toLocaleTimeString() : 'an earlier session'
        }.`,
        participant: {
          name: registration.studentName,
          registrationId: registration.registrationId,
          attendedAt: registration.attendedAt,
        },
      });
    }

    // Get student profile for photo & additional details
    const studentProfile = await StudentProfile.findById(registration.studentId);

    return res.json({
      success: true,
      valid: true,
      message: 'Valid ticket pass. Verified and ready to mark Present.',
      participant: {
        _id: registration._id,
        registrationId: registration.registrationId,
        passId: registration.qrToken,
        studentName: registration.studentName,
        studentEmail: registration.studentEmail,
        studentPhone: registration.studentPhone,
        studentCollege: registration.studentCollege,
        studentDepartment: registration.studentDepartment,
        studentYear: registration.studentYear,
        profilePhoto: studentProfile?.profilePhoto || null,
        registrationType: registration.registrationType,
        teamName: registration.teamName,
        teamMembers: registration.teamMembers,
        paymentStatus: registration.paymentStatus,
        registrationDate: registration.createdAt,
        attended: registration.attended,
        attendedAt: registration.attendedAt,
        customResponses: registration.customResponses || {},
        eventTitle: event.title,
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
    if (!registrationId) {
      return res.status(400).json({ success: false, message: 'Registration ID required.' });
    }

    let registration = await EventRegistration.findOne({ registrationId });
    if (!registration) {
      registration = await EventRegistration.findById(registrationId);
    }
    if (!registration) {
      registration = await EventRegistration.findOne({ qrToken: registrationId });
    }
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration record not found.' });
    }

    const event = await Event.findById(eventId || registration.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    // Authorization check
    const authorized = await isUserAuthorizedForEventAttendance(user, event);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You do not have permission to mark attendance for this event.',
      });
    }

    // Check finalization lock
    if (event.attendanceFinalized && user.role !== 'College Super Admin') {
      return res.status(400).json({
        success: false,
        message: 'Attendance for this event has been finalized and locked. Only a College Super Admin can make corrections.',
      });
    }

    const isPresent = status === 'Present';
    const now = new Date().toISOString();

    const existingAttendance = await Attendance.findOne({
      eventId: event._id,
      registrationId: registration.registrationId,
    });

    if (isPresent) {
      if (!existingAttendance || existingAttendance.status !== 'Present') {
        if (!existingAttendance) {
          await Attendance.create({
            eventId: event._id,
            registrationId: registration.registrationId,
            studentId: registration.studentId,
            studentName: registration.studentName,
            studentCollege: registration.studentCollege,
            method: method as any,
            markedByUserId: user._id,
            status: 'Present',
            markedAt: now,
          });
        } else {
          await Attendance.findByIdAndUpdate(existingAttendance._id, {
            status: 'Present',
            method: method as any,
            markedByUserId: user._id,
            markedAt: now,
          });
        }

        // Update registration record
        await EventRegistration.findByIdAndUpdate(registration._id, {
          attended: true,
          attendedAt: now,
          attendanceMethod: method,
          certificateStatus: event.attendanceFinalized ? 'Pending' : registration.certificateStatus,
        });

        // Increment event attendance count
        await Event.updateOne({ _id: event._id }, { $inc: { attendanceCount: 1 } });

        // Notify student
        await Notification.create({
          recipientUserId: registration.studentUserId,
          type: 'ATTENDANCE',
          title: 'Attendance Confirmed!',
          message: `Your check-in for "${event.title}" was marked as Present (${method === 'QR_SCAN' ? 'Scanned Pass' : 'Manual Entry'}).`,
          link: `/events`,
          read: false,
        });
      }
    } else {
      // Mark as Absent
      if (existingAttendance && existingAttendance.status === 'Present') {
        await Attendance.findByIdAndUpdate(existingAttendance._id, {
          status: 'Absent',
          markedByUserId: user._id,
          markedAt: now,
        });

        await EventRegistration.findByIdAndUpdate(registration._id, {
          attended: false,
          attendedAt: undefined,
          attendanceMethod: undefined,
          certificateStatus: 'Not Eligible',
        });

        await Event.updateOne(
          { _id: event._id },
          { $set: { attendanceCount: Math.max(0, (event.attendanceCount || 1) - 1) } }
        );
      } else if (!existingAttendance) {
        await Attendance.create({
          eventId: event._id,
          registrationId: registration.registrationId,
          studentId: registration.studentId,
          studentName: registration.studentName,
          studentCollege: registration.studentCollege,
          method: 'MANUAL',
          markedByUserId: user._id,
          status: 'Absent',
          markedAt: now,
        });

        await EventRegistration.findByIdAndUpdate(registration._id, {
          attended: false,
          certificateStatus: 'Not Eligible',
        });
      }
    }

    const updatedReg = await EventRegistration.findById(registration._id);

    return res.json({
      success: true,
      message: `Attendance marked as ${status} for ${registration.studentName}.`,
      registrationId: registration.registrationId,
      status,
      timestamp: now,
      registration: updatedReg,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getEventAttendanceList(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { eventId } = req.params;
    const { search } = req.query;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    // Authorization check
    const authorized = await isUserAuthorizedForEventAttendance(user, event);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You do not have permission to view attendance for this event.',
      });
    }

    let registrations = await EventRegistration.find({ eventId }).sort({ createdAt: -1 }).exec();

    if (search) {
      const s = String(search).toLowerCase();
      registrations = registrations.filter(
        (r) =>
          r.studentName.toLowerCase().includes(s) ||
          r.registrationId.toLowerCase().includes(s) ||
          r.studentCollege.toLowerCase().includes(s) ||
          r.studentEmail.toLowerCase().includes(s) ||
          r.qrToken.toLowerCase().includes(s)
      );
    }

    const registered = registrations.length;
    const present = registrations.filter((r) => r.attended).length;
    const absent = registrations.filter((r) => !r.attended).length;

    return res.json({
      success: true,
      attendanceFinalized: Boolean(event.attendanceFinalized),
      finalizedAt: event.attendanceFinalizedAt || null,
      finalizedBy: event.attendanceFinalizedBy || null,
      counts: {
        registered,
        present,
        absent,
        pending: registered - present,
      },
      list: registrations.map((r) => ({
        _id: r._id,
        registrationId: r.registrationId,
        passId: r.qrToken,
        qrToken: r.qrToken,
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        studentPhone: r.studentPhone,
        studentCollege: r.studentCollege,
        studentDepartment: r.studentDepartment,
        studentYear: r.studentYear,
        status: r.attended ? 'Present' : 'Absent',
        attended: r.attended,
        attendedAt: r.attendedAt || null,
        attendanceMethod: r.attendanceMethod || (r.attended ? 'QR_SCAN' : undefined),
        paymentStatus: r.paymentStatus,
        certificateIssued: r.certificateIssued,
        certificateStatus: r.certificateStatus || (r.attended ? (r.certificateIssued ? 'Generated' : 'Pending') : 'Not Eligible'),
        certificateId: r.certificateId,
        certificateFileUrl: r.certificateFileUrl,
        certificateEmailSent: r.certificateEmailSent,
        customResponses: r.customResponses || {},
        qrCodeUrl: r.qrCodeUrl,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function finishAttendance(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    // Authorization check
    const authorized = await isUserAuthorizedForEventAttendance(user, event);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You do not have permission to finalize attendance for this event.',
      });
    }

    const now = new Date().toISOString();

    // Mark event attendance as finalized
    await Event.updateOne(
      { _id: event._id },
      {
        $set: {
          attendanceFinalized: true,
          attendanceFinalizedAt: now,
          attendanceFinalizedBy: user._id,
        },
      }
    );

    // Get all registrations
    const registrations = await EventRegistration.find({ eventId: event._id }).exec();
    const college = await College.findById(event.hostCollegeId);
    const hostCollegeName = college ? college.name : event.hostCollegeName;

    let certificatesGenerated = 0;
    let certificatesSent = 0;

    for (const reg of registrations) {
      if (!reg.attended) {
        // Absent participants are marked Not Eligible
        await EventRegistration.findByIdAndUpdate(reg._id, {
          certificateStatus: 'Not Eligible',
        });
        continue;
      }

      // Participant attended (Present) -> Automate Participation Certificate!
      try {
        // Generate or reuse certificate ID
        const certCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const certificateId = reg.certificateId || `EH-CERT-${new Date().getFullYear()}-${certCode}`;

        // Generate high quality PDF certificate
        const { fileUrl, buffer } = await generatePdfCertificate({
          certificateId,
          studentName: reg.studentName,
          studentCollege: reg.studentCollege,
          studentDepartment: reg.studentDepartment,
          studentYear: reg.studentYear,
          eventTitle: event.title,
          eventDate: event.eventDate,
          issuingCollegeName: hostCollegeName,
          category: event.category,
          eventMode: event.eventMode,
          venue: event.venue,
        });

        // Create or update Certificate in DB
        const existingCert = await Certificate.findOne({ certificateId });
        if (!existingCert) {
          await Certificate.create({
            certificateId,
            title: `Certificate of Participation - ${event.title}`,
            eventId: event._id,
            registrationId: reg.registrationId,
            studentId: reg.studentId,
            studentUserId: reg.studentUserId,
            collegeId: event.hostCollegeId,
            issuingOrganization: hostCollegeName,
            achievementType: 'Participation',
            issueDate: new Date().toISOString().split('T')[0],
            eventName: event.title,
            description: `Official Certificate of Participation awarded to ${reg.studentName} for active participation in ${event.title}.`,
            fileUrl,
            credentialUrl: `https://eventhub.edu/verify/${certificateId}`,
            visibility: 'Public',
            tags: [event.category, 'Participation', 'EventHub Verified'],
            isDraft: false,
            profilePublished: true,
            emailStatus: 'Pending',
          });
        }

        certificatesGenerated++;

        // Send email with attached PDF certificate
        const emailResult = await sendCertificateEmail({
          recipientEmail: reg.studentEmail,
          studentName: reg.studentName,
          eventTitle: event.title,
          issuingCollegeName: hostCollegeName,
          certificateId,
          certificateUrl: fileUrl,
          pdfBuffer: buffer,
        });

        const emailSent = emailResult.success;
        if (emailSent) certificatesSent++;

        // Update registration record
        await EventRegistration.findByIdAndUpdate(reg._id, {
          certificateIssued: true,
          certificateId,
          certificateFileUrl: fileUrl,
          certificateEmailSent: emailSent,
          certificateProfilePublished: true,
          certificateStatus: emailSent ? 'Sent' : 'Generated',
        });

        // Notify student in-app
        await Notification.create({
          recipientUserId: reg.studentUserId,
          type: 'CERTIFICATE',
          title: 'Participation Certificate Issued!',
          message: `Your participation certificate for "${event.title}" is now available in your Student Profile.`,
          link: `/profile?tab=certificates`,
          read: false,
          metadata: { certificateId, eventId: event._id },
        });
      } catch (certErr: any) {
        console.error(`Failed to generate certificate for ${reg.studentName}:`, certErr.message);
        await EventRegistration.findByIdAndUpdate(reg._id, {
          certificateStatus: 'Failed',
        });
      }
    }

    // Update event counter
    await Event.updateOne(
      { _id: event._id },
      { $inc: { certificatesIssuedCount: certificatesGenerated } }
    );

    return res.json({
      success: true,
      message: `Attendance finalized successfully. ${certificatesGenerated} participation certificates generated (${certificatesSent} sent via email).`,
      finalizedAt: now,
      certificatesGenerated,
      certificatesSent,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function downloadAttendanceReport(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    // Authorization check
    const authorized = await isUserAuthorizedForEventAttendance(user, event);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You do not have permission to export attendance for this event.',
      });
    }

    const registrations = await EventRegistration.find({ eventId }).sort({ createdAt: -1 }).exec();

    // Generate CSV
    const headers = [
      'Student Name',
      'Email',
      'Phone',
      'College',
      'Department',
      'Year',
      'Registration ID',
      'Pass ID',
      'Payment Status',
      'Attendance Status',
      'Check-In Time',
      'Check-In Method',
      'Certificate Eligibility',
      'Certificate Generated',
      'Certificate Email Sent',
      'Certificate Profile Published',
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = registrations.map((r) => {
      const isPresent = Boolean(r.attended);
      const isEligible = isPresent ? 'Eligible' : 'Not Eligible';
      const certGen = r.certificateIssued ? 'Yes' : 'No';
      const certEmail = r.certificateEmailSent ? 'Yes' : 'No';
      const certProfile = r.certificateProfilePublished ? 'Yes' : 'No';
      const checkInTime = r.attendedAt ? new Date(r.attendedAt).toLocaleString() : 'N/A';
      const checkInMethod = r.attendanceMethod || (isPresent ? 'QR_SCAN' : 'N/A');

      return [
        escapeCsv(r.studentName),
        escapeCsv(r.studentEmail),
        escapeCsv(r.studentPhone || 'N/A'),
        escapeCsv(r.studentCollege),
        escapeCsv(r.studentDepartment || 'N/A'),
        escapeCsv(r.studentYear || 'N/A'),
        escapeCsv(r.registrationId),
        escapeCsv(r.qrToken),
        escapeCsv(r.paymentStatus),
        escapeCsv(isPresent ? 'Present' : 'Absent'),
        escapeCsv(checkInTime),
        escapeCsv(checkInMethod),
        escapeCsv(isEligible),
        escapeCsv(certGen),
        escapeCsv(certEmail),
        escapeCsv(certProfile),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${eventId}.csv"`
    );

    return res.status(200).send(csvContent);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

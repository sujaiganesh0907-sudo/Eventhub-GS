import { Request, Response } from 'express';
import crypto from 'crypto';
import {
  Certificate,
  Event,
  EventRegistration,
  StudentProfile,
  Notification,
  College,
  ICertificate,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

export async function issueCertificate(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      eventId,
      registrationId,
      title,
      achievementType = 'Participation',
      issueDate = new Date().toISOString().split('T')[0],
      fileUrl,
      description,
      credentialUrl,
      tags = [],
    } = req.body;

    if (!eventId || !registrationId || !title || !fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Event ID, Registration ID, Certificate Title, and Certificate File URL are required.',
      });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    // Authorization check
    let authorized = false;
    if (user.role === 'Student') {
      authorized = event.creatorUserId === user._id && ['Published', 'Approved', 'Completed'].includes(event.status);
    } else if (user.collegeId && user.collegeId === event.hostCollegeId) {
      authorized = true;
    }

    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to issue certificates for this event.',
      });
    }

    const registration = await EventRegistration.findOne({ registrationId, eventId });
    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found.' });

    const college = user.collegeId ? await College.findById(user.collegeId) : null;
    const issuingOrg = college ? college.name : event.hostCollegeName;

    // Generate unique Certificate ID
    const certCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const certificateId = `EH-CERT-${new Date().getFullYear()}-${certCode}`;

    const certificate = await Certificate.create({
      certificateId,
      title,
      eventId: event._id,
      registrationId: registration.registrationId,
      studentId: registration.studentId,
      collegeId: college?._id,
      issuingOrganization: issuingOrg,
      achievementType: achievementType as any,
      issueDate,
      location: event.venue || college?.location || 'Campus',
      eventName: event.title,
      description: description || `Certificate of ${achievementType} for successful participation in ${event.title}.`,
      fileUrl,
      credentialUrl: credentialUrl || `https://eventhub.edu/verify/${certificateId}`,
      visibility: 'Public',
      tags: Array.isArray(tags) && tags.length > 0 ? tags : [event.category, achievementType, 'EventHub Verified'],
      isDraft: false,
    });

    // Update registration
    await EventRegistration.findByIdAndUpdate(registration._id, {
      certificateIssued: true,
      certificateId: certificate.certificateId,
    });

    // Increment event certificates counter
    await Event.updateOne({ _id: event._id }, { $inc: { certificatesIssuedCount: 1 } });

    // Notify the student
    await Notification.create({
      recipientUserId: registration.studentUserId,
      type: 'CERTIFICATE',
      title: 'New Certificate Issued!',
      message: `${issuingOrg} has issued your certificate "${title}" for ${event.title}. View it in your Student ID.`,
      link: `/student/profile?tab=certificates`,
      read: false,
      metadata: { certificateId: certificate.certificateId },
    });

    return res.status(201).json({
      success: true,
      message: 'Certificate issued successfully! The student profile has been automatically updated.',
      certificate,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function addStudentCertificate(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || user.role !== 'Student') {
      return res.status(403).json({ success: false, message: 'Student account required.' });
    }

    const studentProfile = await StudentProfile.findOne({ userId: user._id });
    if (!studentProfile) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const {
      title,
      issuingOrganization,
      achievementType = 'Completion',
      issueDate = new Date().toISOString().split('T')[0],
      location,
      eventName,
      description,
      fileUrl,
      credentialId,
      credentialUrl,
      visibility = 'Public',
      tags = [],
      isDraft = false,
    } = req.body;

    if (!title || !issuingOrganization || !fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Title, Issuing Organization, and Certificate File are required.',
      });
    }

    const certCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const finalCertId = credentialId || `EH-AWARD-${new Date().getFullYear()}-${certCode}`;

    const certificate = await Certificate.create({
      certificateId: finalCertId,
      title,
      studentId: studentProfile._id,
      issuingOrganization,
      achievementType: achievementType as any,
      issueDate,
      location: location || '',
      eventName: eventName || '',
      description: description || '',
      fileUrl,
      credentialUrl: credentialUrl || '',
      visibility: visibility as any,
      tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
      isDraft: Boolean(isDraft),
    });

    return res.status(201).json({
      success: true,
      message: isDraft ? 'Award saved as draft.' : 'Award / Certificate published to your profile!',
      certificate,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getMyCertificates(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const studentProfile = await StudentProfile.findOne({ userId: user._id });
    if (!studentProfile) {
      return res.json({ success: true, total: 0, certificates: [] });
    }

    const { includeDrafts } = req.query;
    const filter: any = {
      $or: [
        { studentId: studentProfile._id },
        { studentUserId: user._id },
      ],
    };
    if (includeDrafts !== 'true') {
      filter.isDraft = false;
    }

    const certificates = await Certificate.find(filter).sort({ issueDate: -1, createdAt: -1 }).exec();
    return res.json({ success: true, total: certificates.length, certificates });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getStudentCertificates(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const { includeDrafts } = req.query;

    const student = await StudentProfile.findById(studentId);
    const authHeader = req.headers['authorization'];
    // Check if the requester is the owner student
    let isOwner = false;
    if ((req as any).user && student && (req as any).user._id === student.userId) {
      isOwner = true;
    }

    const filter: any = { studentId };
    if (includeDrafts !== 'true') {
      filter.isDraft = false;
    }
    // Privacy: other users only see non-private credentials (Requirement 45)
    if (!isOwner) {
      filter.visibility = { $ne: 'Private' };
    }

    const certificates = await Certificate.find(filter).sort({ issueDate: -1, createdAt: -1 }).exec();
    return res.json({ success: true, total: certificates.length, certificates });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteCertificate(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { id } = req.params;
    const cert = await Certificate.findById(id);
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });

    // Requirement 40 & 41: College-Issued verified credentials are permanent and cannot be deleted by students!
    if (cert.isCollegeVerified) {
      return res.status(403).json({
        success: false,
        message: 'College-Issued verified credentials cannot be deleted from student records. They can only be revoked by the issuing institution.',
      });
    }

    // Owner check for self-uploaded certificates
    if (cert.studentUserId && cert.studentUserId !== user._id && user.role !== 'College Super Admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this certificate.' });
    }

    await Certificate.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Self-uploaded certificate deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateCertificate(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { id } = req.params;
    const cert = await Certificate.findById(id);
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });

    // Authorization check
    if (cert.studentUserId && cert.studentUserId !== user._id && user.role !== 'College Super Admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this certificate.' });
    }

    // Requirement 41: Immutable verified credential details
    if (cert.isCollegeVerified) {
      // Students can ONLY update visibility or personal notes, NOT core verified metadata!
      const allowedUpdates: any = {};
      if (req.body.visibility) allowedUpdates.visibility = req.body.visibility;
      if (req.body.description !== undefined) allowedUpdates.description = req.body.description;

      const updated = await Certificate.findByIdAndUpdate(id, { $set: allowedUpdates });
      return res.json({
        success: true,
        message: 'Certificate visibility updated. Official collegiate verified details remain immutable.',
        certificate: updated,
      });
    }

    const updated = await Certificate.findByIdAndUpdate(id, { $set: req.body });
    return res.json({ success: true, message: 'Certificate updated.', certificate: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function retryCertificateEmail(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    let cert = await Certificate.findOne({
      $or: [{ _id: id }, { certificateId: id }, { registrationId: id }],
    });

    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    const reg = await EventRegistration.findOne({
      $or: [{ certificateId: cert.certificateId }, { registrationId: cert.registrationId }],
    });

    if (!reg) {
      return res.status(404).json({ success: false, message: 'Registration record not found for certificate.' });
    }

    const { sendCertificateEmail } = await import('../services/emailService');
    const emailRes = await sendCertificateEmail({
      recipientEmail: reg.studentEmail,
      studentName: reg.studentName,
      eventTitle: cert.eventName || 'Collegiate Event',
      issuingCollegeName: cert.issuingOrganization,
      certificateId: cert.certificateId,
      certificateUrl: cert.fileUrl,
    });

    if (emailRes.success) {
      await Certificate.findByIdAndUpdate(cert._id, { emailStatus: 'Sent' });
      await EventRegistration.findByIdAndUpdate(reg._id, {
        certificateEmailSent: true,
        certificateStatus: 'Sent',
      });
      return res.json({ success: true, message: `Certificate email successfully dispatched to ${reg.studentEmail}.` });
    } else {
      await Certificate.findByIdAndUpdate(cert._id, { emailStatus: 'Failed', emailError: emailRes.error });
      await EventRegistration.findByIdAndUpdate(reg._id, {
        certificateEmailSent: false,
        certificateStatus: 'Failed',
      });
      return res.status(500).json({ success: false, message: emailRes.error || 'Failed to send certificate email.' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}


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
    if (!user || !user.collegeId) {
      return res.status(403).json({ success: false, message: 'Only authorized college organizers can issue certificates.' });
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

    const registration = await EventRegistration.findOne({ registrationId, eventId });
    if (!registration) return res.status(404).json({ success: false, message: 'Registration not found.' });

    const college = await College.findById(user.collegeId);
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

export async function getStudentCertificates(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const { includeDrafts } = req.query;

    const filter: any = { studentId };
    if (includeDrafts !== 'true') {
      filter.isDraft = false;
    }

    const certificates = await Certificate.find(filter).sort({ issueDate: -1, createdAt: -1 }).exec();
    return res.json({ success: true, total: certificates.length, certificates });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteCertificate(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const cert = await Certificate.findById(id);
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });

    await Certificate.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Certificate deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateCertificate(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const cert = await Certificate.findById(id);
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });

    const updated = await Certificate.findByIdAndUpdate(id, { $set: req.body });
    return res.json({ success: true, message: 'Certificate updated.', certificate: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

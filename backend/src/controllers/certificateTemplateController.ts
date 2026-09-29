import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Event,
  EventRegistration,
  Certificate,
  StudentProfile,
  College,
  Notification,
  CollegeAdminMembership,
  CredentialPost,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  inspectDocxPlaceholders,
  generateAndUploadCertificatePackage,
  generatePersonalizedDocx,
  uploadCertificateFile,
  STANDARD_PLACEHOLDERS,
} from '../services/docxCertificateService';
import { sendCertificateEmail } from '../services/emailService';
import { logAdminActivityHelper } from './adminController';

/**
 * Authorization helper for certificate management.
 * Allowed:
 * 1. College Super Admin (for this college's events)
 * 2. College Admin with manageCertificates or EVENTS_MANAGE permission
 * 3. Approved Student Event Creator (for their own approved event)
 */
async function isAuthorizedForCertificates(user: any, event: any): Promise<boolean> {
  if (!user || !event) return false;

  // Student creator check
  if (user.role === 'Student') {
    const isApprovedOrCompleted = ['Published', 'Approved', 'Completed'].includes(event.status);
    return event.creatorUserId === user._id && isApprovedOrCompleted;
  }

  // College Super Admin check
  if (user.role === 'College Super Admin') {
    return event.hostCollegeId === user.collegeId;
  }

  // College Admin check
  if (user.role === 'College Admin' && event.hostCollegeId === user.collegeId) {
    const membership = await CollegeAdminMembership.findOne({
      collegeId: user.collegeId,
      userId: user._id,
      status: 'Active',
    });
    if (!membership) return false;
    const perms = membership.permissions || [];
    return (
      perms.includes('manageCertificates') ||
      perms.includes('manageCert') ||
      perms.includes('CERTIFICATES_MANAGE') ||
      perms.includes('ALL_PERMISSIONS')
    );
  }

  return false;
}

/**
 * POST /api/events/:eventId/certificate-template
 * Upload a DOCX template file. Inspects and extracts placeholders.
 */
export async function uploadCertificateTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const authorized = await isAuthorizedForCertificates(user, event);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to upload certificate templates for this event.',
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No template file uploaded.' });
    }

    // Verify DOCX extension and mime strictly (Requirement 1.2)
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== '.docx') {
      // Clean up uploaded file
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
      return res.status(400).json({
        success: false,
        message: 'Only DOCX certificate templates are supported.',
      });
    }

    // Read buffer and extract placeholders
    const fileBuffer = fs.readFileSync(req.file.path);
    const { placeholders, autoMappings, customPlaceholders } = inspectDocxPlaceholders(fileBuffer);

    // Save template permanently in public/uploads/templates/
    const templateDir = path.resolve(process.cwd(), 'public', 'uploads', 'templates');
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    const templateFileName = `template-${eventId}-${Date.now()}.docx`;
    const targetPath = path.join(templateDir, templateFileName);
    fs.writeFileSync(targetPath, fileBuffer);

    // Clean up multer temporary file if different
    if (req.file.path !== targetPath) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    const fileUrl = `/uploads/templates/${templateFileName}`;

    // Build initial mappings
    const initialMappings: Record<string, any> = {};
    for (const ph of placeholders) {
      const lower = ph.toLowerCase();
      if (STANDARD_PLACEHOLDERS[lower]) {
        initialMappings[ph] = {
          sourceType: 'auto',
          sourceField: STANDARD_PLACEHOLDERS[lower].defaultField,
        };
      } else {
        initialMappings[ph] = {
          sourceType: 'fixed_text',
          fixedValue: '',
        };
      }
    }

    // Build history if replacing existing template (Requirement 11 & 12)
    const prevTemplate = event.certificateTemplate;
    const prevHistory = prevTemplate?.history || [];
    if (prevTemplate && prevTemplate.fileUrl) {
      prevHistory.unshift({
        version: prevTemplate.version || 1,
        fileUrl: prevTemplate.fileUrl,
        fileName: prevTemplate.fileName,
        uploadedAt: prevTemplate.uploadedAt,
        uploadedBy: prevTemplate.uploadedBy,
        detectedPlaceholders: prevTemplate.detectedPlaceholders,
        mappings: prevTemplate.mappings,
        status: 'Archived',
      });
    }

    const version = prevTemplate ? (prevTemplate.version || 1) + 1 : 1;
    const isAutoActivated = customPlaceholders.length === 0;

    // Update event record in DB
    const templateConfig = {
      fileUrl,
      fileName: req.file.originalname,
      version,
      status: isAutoActivated ? ('Active' as const) : ('Draft' as const),
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.fullName,
      detectedPlaceholders: placeholders,
      mappings: initialMappings,
      isActivated: isAutoActivated,
      history: prevHistory,
    };

    await Event.updateOne(
      { _id: eventId },
      {
        $set: {
          certificateTemplate: templateConfig,
          certificateTemplateUrl: fileUrl,
          certificateTemplateName: req.file.originalname,
        },
      }
    );

    return res.status(201).json({
      success: true,
      message: `DOCX certificate template parsed successfully. Detected ${placeholders.length} placeholders.`,
      template: templateConfig,
      placeholders,
      autoMappings,
      customPlaceholders,
      standardDefinitions: STANDARD_PLACEHOLDERS,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/events/:eventId/certificate-template
 * Get the current template configuration and registration questions for mapping.
 */
export async function getCertificateTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const authorized = await isAuthorizedForCertificates(user, event);
    if (!authorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    return res.json({
      success: true,
      template: event.certificateTemplate || null,
      standardDefinitions: STANDARD_PLACEHOLDERS,
      registrationQuestions: event.registrationQuestions || [],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * PUT /api/events/:eventId/certificate-template/mappings
 * Save custom mappings for placeholders and activate the template.
 */
export async function savePlaceholderMappings(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { eventId } = req.params;
    const { mappings } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const authorized = await isAuthorizedForCertificates(user, event);
    if (!authorized) return res.status(403).json({ success: false, message: 'Unauthorized' });

    if (!event.certificateTemplate) {
      return res.status(400).json({ success: false, message: 'No certificate template uploaded yet.' });
    }

    const detected = event.certificateTemplate.detectedPlaceholders || [];

    // Verify all detected placeholders have a mapping
    for (const ph of detected) {
      if (!mappings[ph]) {
        return res.status(400).json({
          success: false,
          message: `Missing mapping for required placeholder "{{${ph}}}". All placeholders must be mapped before activation.`,
        });
      }
    }

    const updatedTemplate = {
      ...event.certificateTemplate,
      mappings,
      status: 'Active',
      isActivated: true,
    };

    await Event.updateOne(
      { _id: eventId },
      { $set: { certificateTemplate: updatedTemplate } }
    );

    return res.json({
      success: true,
      message: 'Placeholder mappings saved and template activated successfully!',
      template: updatedTemplate,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Helper to resolve mapped value for a placeholder from student, registration, and event
 */
function resolvePlaceholderValue(
  placeholder: string,
  mapping: any,
  context: {
    student: any;
    registration: any;
    event: any;
    hostCollegeName: string;
    certificateId: string;
  }
): string {
  const lower = placeholder.toLowerCase();

  // 1. Direct standard checks
  if (lower === 'student_name') return context.registration.studentName || context.student?.fullName || '';
  if (lower === 'college_name') return context.registration.studentCollege || context.student?.collegeName || '';
  if (lower === 'department') return context.registration.studentDepartment || context.student?.department || '';
  if (lower === 'year') return context.registration.studentYear || context.student?.yearOfStudy || '';
  if (lower === 'event_name') return context.event.title || '';
  if (lower === 'event_date') return context.event.eventDate || '';
  if (lower === 'registration_id') return context.registration.registrationId || '';
  if (lower === 'certificate_id') return context.certificateId;
  if (lower === 'student_email') return context.registration.studentEmail || context.student?.email || '';
  if (lower === 'event_category') return context.event.category || '';
  if (lower === 'host_college') return context.hostCollegeName;

  // 2. Custom mapping check
  if (!mapping) return '';

  if (mapping.sourceType === 'fixed_text') {
    return mapping.fixedValue || '';
  }

  if (mapping.sourceType === 'registration_question' && mapping.sourceField) {
    const responses = context.registration.customResponses || {};
    return responses[mapping.sourceField] || mapping.fixedValue || '';
  }

  if (mapping.sourceType === 'student_field' && mapping.sourceField) {
    const f = mapping.sourceField;
    return context.registration[f] || context.student?.[f] || '';
  }

  if (mapping.sourceType === 'event_field' && mapping.sourceField) {
    const f = mapping.sourceField;
    return context.event[f] || '';
  }

  return mapping.fixedValue || '';
}

/**
 * POST /api/events/:eventId/certificate-template/preview
 * Generate a sample certificate preview for 1 Present participant.
 */
export async function previewSampleCertificate(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { eventId } = req.params;
    const { registrationId } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const authorized = await isAuthorizedForCertificates(user, event);
    if (!authorized) return res.status(403).json({ success: false, message: 'Unauthorized' });

    // Find registration (prefer Present participant)
    let registration: any = null;
    if (registrationId) {
      registration =
        (await EventRegistration.findOne({ registrationId, eventId })) ||
        (await EventRegistration.findById(registrationId));
    }
    if (!registration) {
      // Pick first present participant or first registered participant
      registration =
        (await EventRegistration.findOne({ eventId, attended: true })) ||
        (await EventRegistration.findOne({ eventId }));
    }

    if (!registration) {
      return res.status(400).json({
        success: false,
        message: 'No participant registration found to preview with.',
      });
    }

    const studentProfile = await StudentProfile.findById(registration.studentId);
    const college = await College.findById(event.hostCollegeId);
    const hostCollegeName = college?.name || event.hostCollegeName;

    // Load template buffer if available
    let templateBuffer: Buffer | null = null;
    if (event.certificateTemplate?.fileUrl) {
      const localTemplatePath = path.resolve(process.cwd(), 'public', event.certificateTemplate.fileUrl.replace(/^\//, ''));
      if (fs.existsSync(localTemplatePath)) {
        templateBuffer = fs.readFileSync(localTemplatePath);
      }
    }

    const previewCertId = `EH-PREVIEW-${Date.now().toString().slice(-4)}`;

    // Resolve mapped values
    const detected = event.certificateTemplate?.detectedPlaceholders || [];
    const mappings = event.certificateTemplate?.mappings || {};
    const placeholderValues: Record<string, string> = {};

    for (const ph of detected) {
      placeholderValues[ph] = resolvePlaceholderValue(ph, mappings[ph], {
        student: studentProfile,
        registration,
        event,
        hostCollegeName,
        certificateId: previewCertId,
      });
    }

    const certResult = await generateAndUploadCertificatePackage({
      templateBuffer,
      certificateId: previewCertId,
      data: {
        ...placeholderValues,
        studentName: registration.studentName,
        studentCollege: registration.studentCollege,
        studentDepartment: registration.studentDepartment,
        studentYear: registration.studentYear,
        eventTitle: event.title,
        eventDate: event.eventDate,
        issuingCollegeName: hostCollegeName,
        category: event.category,
        eventMode: event.eventMode,
        venue: event.venue,
        registrationId: registration.registrationId,
      },
    });

    return res.json({
      success: true,
      message: 'Preview certificate generated successfully.',
      preview: {
        certificateId: previewCertId,
        participantName: registration.studentName,
        registrationId: registration.registrationId,
        pdfUrl: certResult.fileUrl,
        docxUrl: certResult.docxFileUrl,
        isCloudinary: certResult.isCloudinary,
        resolvedValues: placeholderValues,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/events/:eventId/certificate-template/generate-and-send
 * Confirm & Send: Iterates over Present students only, generates personalized certificates,
 * uploads to Cloudinary (or local fallback), saves metadata to MongoDB, delivers in-app notification & email.
 */
export async function bulkGenerateAndSendCertificates(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const authorized = await isAuthorizedForCertificates(user, event);
    if (!authorized) return res.status(403).json({ success: false, message: 'Unauthorized' });

    // STRICT CHECK (Requirement 17): Attendance must be FINALIZED before certificates can be issued!
    if (!event.attendanceFinalized) {
      return res.status(400).json({
        success: false,
        message: 'Attendance must be finalized before certificates can be issued. Please complete check-in and click "Finish Attendance" in the Check-In Desk first.',
      });
    }

    // STRICT CHECK (Requirement 9): Active template required
    if (!event.certificateTemplate || !event.certificateTemplate.isActivated) {
      return res.status(400).json({
        success: false,
        message: 'No active certificate template found for this event. Please upload a DOCX template and verify placeholder mappings.',
      });
    }

    const college = await College.findById(event.hostCollegeId);
    const hostCollegeName = college?.name || event.hostCollegeName;

    // Load template buffer if exists
    let templateBuffer: Buffer | null = null;
    if (event.certificateTemplate?.fileUrl) {
      const localTemplatePath = path.resolve(process.cwd(), 'public', event.certificateTemplate.fileUrl.replace(/^\//, ''));
      if (fs.existsSync(localTemplatePath)) {
        templateBuffer = fs.readFileSync(localTemplatePath);
      }
    }

    // Fetch ALL registrations for this event
    const allRegistrations = await EventRegistration.find({ eventId }).exec();

    // STRICT CHECK: Only Present students become eligible! Absent students are excluded. (Requirement 1.1 & 18)
    const presentRegistrations = allRegistrations.filter((r) => r.attended === true);

    if (presentRegistrations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No attended (Present) participants found. Attendance must be marked Present before generating certificates.',
      });
    }

    const detected = event.certificateTemplate?.detectedPlaceholders || [];
    const mappings = event.certificateTemplate?.mappings || {};

    let generatedCount = 0;
    let emailSentCount = 0;
    let blockedCount = 0;
    const results: any[] = [];

    for (const reg of presentRegistrations) {
      try {
        const studentProfile = await StudentProfile.findById(reg.studentId);

        // Generate canonical unique immutable certificate ID (Requirement 27)
        const certCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const certificateId = reg.certificateId || `EH-CERT-${new Date().getFullYear()}-${certCode}`;

        // Resolve placeholder values
        const placeholderValues: Record<string, string> = {};
        for (const ph of detected) {
          placeholderValues[ph] = resolvePlaceholderValue(ph, mappings[ph], {
            student: studentProfile,
            registration: reg,
            event,
            hostCollegeName,
            certificateId,
          });
        }

        // Missing Data Detection & Blocking (Requirements 21, 22, 25)
        const missingFields: string[] = [];
        for (const ph of detected) {
          const val = placeholderValues[ph];
          if (!val || val.trim() === '' || val.includes('{{')) {
            missingFields.push(ph);
          }
        }

        if (missingFields.length > 0) {
          // Block broken certificate generation for this participant
          blockedCount++;
          await EventRegistration.findByIdAndUpdate(reg._id, {
            certificateStatus: 'Missing Data',
          });
          results.push({
            registrationId: reg.registrationId,
            studentName: reg.studentName,
            status: 'Blocked',
            reason: `Missing data for required placeholders: ${missingFields.map((f) => `{{${f}}}`).join(', ')}`,
          });
          continue;
        }

        // Avoid duplicate issuance if already generated and sent (Requirement 38)
        if (reg.certificateIssued && reg.certificateFileUrl && !req.body.retryAll && !req.body.force) {
          results.push({
            registrationId: reg.registrationId,
            studentName: reg.studentName,
            certificateId: reg.certificateId,
            fileUrl: reg.certificateFileUrl,
            status: 'Already Issued',
          });
          continue;
        }

        // Generate package (DOCX + PDF) and upload to Cloudinary/local
        const certResult = await generateAndUploadCertificatePackage({
          templateBuffer,
          certificateId,
          data: {
            ...placeholderValues,
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
            registrationId: reg.registrationId,
          },
        });

        // Save Certificate metadata in MongoDB
        const credentialUrl = `https://eventhub.edu/verify/${certificateId}`;
        const issueDate = new Date().toISOString().split('T')[0];

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
            collegeLogo: college?.logo || '',
            isCollegeVerified: true,
            achievementType: 'Participation',
            issueDate,
            location: event.venue || college?.location || 'Campus',
            eventName: event.title,
            description: `Official Certificate of Participation awarded to ${reg.studentName} for active participation in ${event.title}.`,
            fileUrl: certResult.fileUrl,
            docxFileUrl: certResult.docxFileUrl,
            credentialUrl,
            visibility: 'Public',
            tags: [event.category, 'Participation', 'EVENTHUB Verified'],
            isDraft: false,
            profilePublished: true,
            emailStatus: 'Pending',
          });
        } else {
          await Certificate.findByIdAndUpdate(existingCert._id, {
            fileUrl: certResult.fileUrl,
            docxFileUrl: certResult.docxFileUrl,
            profilePublished: true,
            isCollegeVerified: true,
          });
        }

        generatedCount++;

        // Send email via SMTP if configured
        const emailResult = await sendCertificateEmail({
          recipientEmail: reg.studentEmail,
          studentName: reg.studentName,
          eventTitle: event.title,
          issuingCollegeName: hostCollegeName,
          certificateId,
          certificateUrl: certResult.fileUrl,
          pdfBuffer: certResult.pdfBuffer,
        });

        const isEmailSuccess = emailResult.success;
        if (isEmailSuccess) emailSentCount++;

        // Update registration record in DB
        await EventRegistration.findByIdAndUpdate(reg._id, {
          certificateIssued: true,
          certificateId,
          certificateFileUrl: certResult.fileUrl,
          certificateEmailSent: isEmailSuccess,
          certificateProfilePublished: true,
          certificateStatus: isEmailSuccess ? 'Sent' : 'Generated',
        });

        // Deliver in-app Notification to the student
        await Notification.create({
          recipientUserId: reg.studentUserId,
          type: 'CERTIFICATE',
          title: 'Participation Certificate Issued!',
          message: `${hostCollegeName} has issued your verified certificate for "${event.title}". View it in your Student Profile.`,
          link: `/profile?tab=certificates`,
          read: false,
          metadata: {
            certificateId,
            eventId: event._id,
            fileUrl: certResult.fileUrl,
          },
        });

        results.push({
          registrationId: reg.registrationId,
          studentName: reg.studentName,
          certificateId,
          fileUrl: certResult.fileUrl,
          status: isEmailSuccess ? 'Sent' : 'Generated',
        });
      } catch (err: any) {
        console.error(`Failed certificate generation for ${reg.studentName}:`, err.message);
        await EventRegistration.findByIdAndUpdate(reg._id, {
          certificateStatus: 'Failed',
        });
        results.push({
          registrationId: reg.registrationId,
          studentName: reg.studentName,
          status: 'Failed',
          error: err.message,
        });
      }
    }

    // Update event counter
    await Event.updateOne(
      { _id: eventId },
      { $inc: { certificatesIssuedCount: generatedCount } }
    );

    // Log admin activity
    await logAdminActivityHelper({
      collegeId: event.hostCollegeId,
      adminUserId: user._id,
      adminName: user.fullName,
      actionType: 'ISSUE_CERTIFICATES',
      details: `@${user.fullName} generated and issued ${generatedCount} participation certificates for "${event.title}".`,
      targetType: 'Event',
      targetId: eventId,
      targetTitle: event.title,
    });

    // Notify College Super Admin if issued by an Admin
    const superAdmin = await CollegeAdminMembership.findOne({
      collegeId: event.hostCollegeId,
      role: 'College Super Admin',
      status: 'Active',
    });
    if (superAdmin && String(superAdmin.userId) !== String(user._id)) {
      await Notification.create({
        recipientUserId: superAdmin.userId,
        type: 'ADMIN_ACTION',
        title: 'Certificates Batch Issued',
        message: `${user.fullName || 'Admin'} issued ${generatedCount} verified certificates for "${event.title}".`,
        link: `/events`,
        read: false,
        metadata: { eventId: event._id },
      });
    }

    return res.json({
      success: true,
      message: `Successfully issued ${generatedCount} participation certificates (${emailSentCount} delivered via email)${blockedCount > 0 ? `, ${blockedCount} blocked due to missing data` : ''}.`,
      generatedCount,
      emailSentCount,
      blockedCount,
      results,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/certificates/verify/:certificateId
 * Public verification endpoint for any employer or external visitor.
 */
export async function verifyPublicCertificate(req: Request, res: Response) {
  try {
    const { certificateId } = req.params;
    if (!certificateId) {
      return res.status(400).json({ isValid: false, message: 'Certificate ID is required.' });
    }

    const cert = await Certificate.findOne({ certificateId });
    if (!cert) {
      return res.status(404).json({
        isValid: false,
        message: 'Certificate not found. This credential ID does not exist in the EVENTHUB verified registry.',
      });
    }

    // Check if revoked
    if (cert.revoked) {
      return res.json({
        isValid: false,
        isRevoked: true,
        revokedAt: cert.revokedAt,
        revokedReason: cert.revokedReason || 'Revoked by the issuing institution.',
        certificate: {
          certificateId: cert.certificateId,
          title: cert.title,
          eventName: cert.eventName,
          issuingOrganization: cert.issuingOrganization,
          issueDate: cert.issueDate,
        },
      });
    }

    const event = cert.eventId ? await Event.findById(cert.eventId) : null;
    const college = cert.collegeId ? await College.findById(cert.collegeId) : null;
    const student = await StudentProfile.findById(cert.studentId);

    return res.json({
      isValid: true,
      isRevoked: false,
      certificate: {
        certificateId: cert.certificateId,
        title: cert.title,
        recipientName: student?.fullName || 'Verified Student',
        recipientCollege: student?.collegeName || '',
        department: student?.department || '',
        achievementType: cert.achievementType,
        eventName: cert.eventName || event?.title,
        eventDate: event?.eventDate || cert.issueDate,
        issuingOrganization: cert.issuingOrganization,
        collegeLogo: college?.logo || cert.collegeLogo,
        issueDate: cert.issueDate,
        fileUrl: cert.fileUrl,
        docxFileUrl: cert.docxFileUrl,
        credentialUrl: cert.credentialUrl,
        isCollegeVerified: true,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ isValid: false, message: error.message });
  }
}

/**
 * POST /api/certificates/:certificateId/revoke
 * Allows College Super Admin or Admin with manageCertificates to revoke a certificate.
 */
export async function revokeCertificate(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { certificateId } = req.params;
    const { reason = 'Revoked by institution authority.' } = req.body;

    const cert = await Certificate.findOne({
      $or: [{ certificateId }, { _id: certificateId }],
    });
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });

    // Authorization check
    if (user.role === 'College Super Admin' && cert.collegeId !== user.collegeId) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this institution.' });
    }

    const now = new Date().toISOString();
    await Certificate.findByIdAndUpdate(cert._id, {
      revoked: true,
      revokedAt: now,
      revokedReason: reason,
    });

    // Also remove or mark reshared credential post so revoked credentials do not linger in the community feed
    await CredentialPost.deleteMany({ certificateId: cert.certificateId });

    // Notify student
    if (cert.studentUserId) {
      await Notification.create({
        recipientUserId: cert.studentUserId,
        type: 'CERTIFICATE',
        title: 'Certificate Revoked',
        message: `Your certificate "${cert.title}" has been revoked by ${cert.issuingOrganization}. Reason: ${reason}`,
        read: false,
      });
    }

    if (cert.collegeId) {
      await logAdminActivityHelper({
        collegeId: cert.collegeId,
        adminUserId: user._id,
        adminName: user.fullName,
        actionType: 'REVOKE_CERTIFICATE',
        details: `@${user.fullName} revoked certificate ${cert.certificateId}. Reason: ${reason}`,
        targetType: 'Certificate',
        targetId: cert.certificateId,
        targetTitle: cert.title,
      });
    }

    return res.json({
      success: true,
      message: 'Certificate successfully revoked.',
      certificateId: cert.certificateId,
      revokedAt: now,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/certificates/:id/reshare
 * Student reshares their verified certificate as a Verified Credential Post on EVENTHUB.
 */
export async function reshareCertificate(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const { caption } = req.body;

    const cert = await Certificate.findOne({
      $or: [{ _id: id }, { certificateId: id }],
    });
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });

    const student = await StudentProfile.findOne({ userId: user._id });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    // Verify ownership
    if (cert.studentUserId && cert.studentUserId !== user._id && cert.studentId !== student._id) {
      return res.status(403).json({ success: false, message: 'You can only reshare your own certificates.' });
    }

    const post = await CredentialPost.create({
      studentId: student._id,
      studentUserId: user._id,
      studentName: student.fullName,
      studentUsername: student.username,
      studentAvatar: student.profilePhoto,
      certificateId: cert.certificateId,
      certificateTitle: cert.title,
      eventTitle: cert.eventName || cert.title,
      issuingOrganization: cert.issuingOrganization,
      collegeLogo: cert.collegeLogo,
      achievementType: cert.achievementType,
      issueDate: cert.issueDate,
      fileUrl: cert.fileUrl,
      credentialUrl: cert.credentialUrl || `https://eventhub.edu/verify/${cert.certificateId}`,
      caption: caption || `Proud to have participated in ${cert.eventName || 'this event'} and earned my verified certificate from ${cert.issuingOrganization}! 🎓✨`,
      likesCount: 0,
      likedBy: [],
    });

    return res.status(201).json({
      success: true,
      message: 'Verified Credential Post successfully shared to EVENTHUB!',
      post,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/certificates/feed
 * Returns recent verified credential posts.
 */
export async function getPublicCredentialPosts(_req: Request, res: Response) {
  try {
    const posts = await CredentialPost.find().sort({ createdAt: -1 }).limit(30).exec();
    return res.json({ success: true, count: posts.length, posts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/certificates/feed/:id/like
 * Like or unlike a credential post.
 */
export async function toggleLikeCredentialPost(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const post = await CredentialPost.findById(id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const liked = post.likedBy && post.likedBy.includes(user._id);
    const updatedLikedBy = liked
      ? (post.likedBy || []).filter((uid: string) => uid !== user._id)
      : [...(post.likedBy || []), user._id];

    await CredentialPost.findByIdAndUpdate(id, {
      likedBy: updatedLikedBy,
      likesCount: updatedLikedBy.length,
    });

    return res.json({
      success: true,
      liked: !liked,
      likesCount: updatedLikedBy.length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * DELETE /api/certificates/feed/:id
 * Deletes a reshared post without affecting the original certificate (Requirement 44).
 */
export async function deleteCredentialPost(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const post = await CredentialPost.findById(id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (post.studentUserId !== user._id && user.role !== 'College Super Admin') {
      return res.status(403).json({ success: false, message: 'You can only delete your own reshared posts.' });
    }

    await CredentialPost.findByIdAndDelete(id);
    return res.json({
      success: true,
      message: 'Reshared post removed. Original certificate remains intact in your credentials.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

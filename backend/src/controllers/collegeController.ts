import { Request, Response } from 'express';
import {
  College,
  Connection,
  Event,
  PlacementPost,
  InfrastructurePost,
  CollegeAdminMembership,
  CollegeAdminRequest,
  Notification,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  verifyDnsTxtToken,
  verifyWebVerificationToken,
  validateEmailMatchesCollegeDomain,
  normalizeDomain,
  extractEmailDomain,
} from '../services/domainValidationService';
import {
  logSecurityAudit,
  generateDomainVerificationToken,
} from '../services/securityAuditService';

export async function getColleges(req: Request, res: Response) {
  try {
    const { search, limit = 50 } = req.query;
    let colleges = await College.find().sort({ connectionsCount: -1 }).limit(Number(limit)).exec();

    if (search) {
      const s = String(search).toLowerCase();
      colleges = colleges.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.location.toLowerCase().includes(s) ||
          c.officialDomain.toLowerCase().includes(s) ||
          (c.bio && c.bio.toLowerCase().includes(s))
      );
    }

    // Enrich with exact connection counts from Connection collection
    const enriched = await Promise.all(
      colleges.map(async (c) => {
        const count = await Connection.countDocuments({ collegeId: c._id });
        return {
          ...c,
          connectionsCount: count,
        };
      })
    );

    return res.json({
      success: true,
      total: enriched.length,
      colleges: enriched,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getCollegeById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const college = await College.findById(id);
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found' });
    }

    // Dynamic stats
    const activeEventsCount = await Event.countDocuments({ hostCollegeId: college._id, status: 'Published' });
    const placementsCount = await PlacementPost.countDocuments({ collegeId: college._id });
    const infrastructureCount = await InfrastructurePost.countDocuments({ collegeId: college._id });
    const connectionsCount = await Connection.countDocuments({ collegeId: college._id });

    return res.json({
      success: true,
      college: {
        ...college,
        connectionsCount,
        activeEventsCount,
        placementsCount,
        infrastructureCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateCollegeProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || !user.collegeId) {
      return res.status(403).json({ success: false, message: 'Only authorized college administrators can update college details.' });
    }

    // Requirement 16: Super Admin has full edit; delegated Admin requires content permission
    if (user.role === 'College Admin') {
      const membership = await CollegeAdminMembership.findOne({
        collegeId: user.collegeId,
        userId: user._id,
        status: 'Active',
      });
      const perms = membership?.permissions || [];
      const hasPerm =
        perms.includes('ALL_PERMISSIONS') ||
        perms.includes('manageCollegeProfile') ||
        perms.includes('manageContent') ||
        perms.includes('editProfile');
      if (!hasPerm) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You lack the permission to update college profile content.',
        });
      }
    }

    const {
      name,
      contactNumber,
      location,
      bio,
      website,
      logo,
      coverPhoto,
    } = req.body;

    const updated = await College.findByIdAndUpdate(user.collegeId, {
      $set: {
        ...(name && { name }),
        ...(contactNumber && { contactNumber }),
        ...(location !== undefined && { location }),
        ...(bio !== undefined && { bio }),
        ...(website !== undefined && { website }),
        ...(logo !== undefined && { logo }),
        ...(coverPhoto !== undefined && { coverPhoto }),
      },
    });

    // Propagate logo/name updates so student visitors immediately see updated branding
    if (logo !== undefined || name) {
      const collegeEvents = await Event.find({ hostCollegeId: user.collegeId }).exec();
      for (const ev of collegeEvents) {
        await Event.findByIdAndUpdate(ev._id, {
          ...(logo !== undefined && { hostCollegeLogo: logo }),
          ...(name && { hostCollegeName: name }),
        });
      }
      const collegePlacements = await PlacementPost.find({ collegeId: user.collegeId }).exec();
      for (const p of collegePlacements) {
        await PlacementPost.findByIdAndUpdate(p._id, {
          ...(logo !== undefined && { collegeLogo: logo }),
          ...(name && { collegeName: name }),
        });
      }
    }

    return res.json({
      success: true,
      message: 'College profile updated successfully.',
      college: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Requirement 11: Get Domain Ownership Verification Token & Instructions
 */
export async function getDomainVerificationToken(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || !user.collegeId) {
      return res.status(403).json({
        success: false,
        message: 'Only authorized college administrators can access domain verification credentials.',
      });
    }

    let college = await College.findById(user.collegeId);
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found.' });
    }

    let token = college.domainVerificationToken;
    if (!token) {
      token = generateDomainVerificationToken();
      await College.findByIdAndUpdate(college._id, { domainVerificationToken: token });
      college.domainVerificationToken = token;
    }

    const dnsTxtRecord = `eventhub-verification=${token}`;
    const webFileUrl = `https://${college.officialDomain}/.well-known/eventhub-verification.txt`;

    return res.json({
      success: true,
      collegeId: college._id,
      collegeName: college.name,
      officialDomain: college.officialDomain,
      token,
      dnsTxtRecord,
      webFileUrl,
      isDomainVerified: !!college.isDomainVerified,
      domainVerifiedAt: college.domainVerifiedAt,
      domainVerificationMethod: college.domainVerificationMethod,
      verificationStatus: college.verificationStatus,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Requirement 11: Trigger Domain Ownership Verification (DNS TXT or Web File)
 */
export async function verifyCollegeDomainOwnership(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || !user.collegeId) {
      return res.status(403).json({
        success: false,
        message: 'Only authorized college administrators can verify domain ownership.',
      });
    }

    const college = await College.findById(user.collegeId);
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found.' });
    }

    const { method = 'DNS_TXT' } = req.body;
    let token = college.domainVerificationToken;
    if (!token) {
      token = generateDomainVerificationToken();
      await College.findByIdAndUpdate(college._id, { domainVerificationToken: token });
    }

    let checkResult: { verified: boolean; error?: string };

    if (method === 'WEB_FILE') {
      checkResult = await verifyWebVerificationToken(college.officialDomain, token);
    } else {
      checkResult = await verifyDnsTxtToken(college.officialDomain, token);
    }

    if (!checkResult.verified) {
      await logSecurityAudit({
        actionType: 'SUSPICIOUS_REGISTRATION_ATTEMPT',
        details: `Domain ownership check failed for ${college.officialDomain} via ${method}: ${checkResult.error}`,
        collegeId: college._id,
        adminUserId: user._id,
      });

      return res.status(400).json({
        success: false,
        message:
          checkResult.error ||
          `Failed to verify domain ownership via ${method}. Please ensure DNS TXT or web token is published.`,
      });
    }

    const now = new Date().toISOString();
    const updated = await College.findByIdAndUpdate(college._id, {
      isDomainVerified: true,
      domainVerifiedAt: now,
      domainVerificationMethod: method,
    });

    await logSecurityAudit({
      actionType: 'COLLEGE_DOMAIN_OWNERSHIP_VERIFIED',
      details: `Domain ownership verified for ${college.name} (${college.officialDomain}) via ${method}.`,
      collegeId: college._id,
      adminUserId: user._id,
    });

    return res.json({
      success: true,
      message: `Domain ownership of ${college.officialDomain} successfully verified via ${method}!`,
      college: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Requirement 8: Request Admin Access to Existing Registered College
 */
export async function requestCollegeAdminAccess(req: Request, res: Response) {
  try {
    const { officialDomain, requesterName, requesterEmail, requesterPhone, message } = req.body;

    if (!officialDomain || !requesterName || !requesterEmail) {
      return res.status(400).json({
        success: false,
        message: 'Official domain, your name, and institutional email are required to request admin access.',
      });
    }

    const cleanDomain = normalizeDomain(officialDomain);
    const cleanEmail = requesterEmail.trim().toLowerCase();
    const emailDomain = extractEmailDomain(cleanEmail);

    const college = await College.findOne({ officialDomain: cleanDomain });
    if (!college) {
      return res.status(404).json({
        success: false,
        message: `No registered college found with domain "${cleanDomain}".`,
      });
    }

    // Check institutional email matches college domain
    const matchCheck = validateEmailMatchesCollegeDomain(
      emailDomain,
      college.officialDomain,
      college.approvedEmailDomains || []
    );

    if (!matchCheck.matches) {
      return res.status(400).json({
        success: false,
        message:
          matchCheck.reason ||
          `Your email domain (@${emailDomain}) does not match the college domain (${college.officialDomain}).`,
      });
    }

    // Create admin access request record
    const requestRecord = await CollegeAdminRequest.create({
      collegeId: college._id,
      collegeName: college.name,
      collegeDomain: college.officialDomain,
      requesterName: requesterName.trim(),
      requesterEmail: cleanEmail,
      requesterPhone: requesterPhone ? requesterPhone.trim() : undefined,
      message: message ? message.trim() : `Requesting delegated college admin access for ${college.name}.`,
      status: 'Pending',
    });

    // Notify College Super Admin
    if (college.superAdminId) {
      await Notification.create({
        userId: college.superAdminId,
        title: 'New College Admin Access Request',
        message: `${requesterName.trim()} (${cleanEmail}) from your institution requested administrative access.`,
        type: 'ADMIN_INVITE',
        link: '/college/settings/admins',
        isRead: false,
      });
    }

    await logSecurityAudit({
      actionType: 'DELEGATED_ADMIN_INVITED',
      details: `Delegated admin access requested by ${cleanEmail} for ${college.name} (${cleanDomain}).`,
      collegeId: college._id,
    });

    return res.json({
      success: true,
      message: `Your request has been routed to the College Super Admin for ${college.name}. They will be able to review and approve your account.`,
      requestId: requestRecord._id,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Requirement 12: List Colleges Pending Accreditation Review
 */
export async function getCollegesPendingReview(req: Request, res: Response) {
  try {
    const colleges = await College.find({
      verificationStatus: { $in: ['Pending', 'Changes Requested'] },
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      total: colleges.length,
      colleges,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Requirement 12: Review College Accreditation (Platform Admin Review)
 */
export async function reviewCollegeAccreditation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['Verified', 'Rejected', 'Changes Requested', 'Pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification status. Must be Verified, Rejected, or Changes Requested.',
      });
    }

    const college = await College.findById(id);
    if (!college) {
      return res.status(404).json({ success: false, message: 'College not found.' });
    }

    const updated = await College.findByIdAndUpdate(id, {
      verificationStatus: status,
      ...(rejectionReason !== undefined && { rejectionReason }),
    });

    await logSecurityAudit({
      actionType: 'COLLEGE_REVIEW_STATUS_UPDATED',
      details: `College ${college.name} (${college.officialDomain}) accreditation status updated to ${status}.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
      collegeId: college._id,
    });

    // Notify Super Admin of College
    if (college.superAdminId) {
      await Notification.create({
        userId: college.superAdminId,
        title: `College Accreditation ${status === 'Verified' ? 'Approved' : status}`,
        message:
          status === 'Verified'
            ? `Congratulations! ${college.name} has been verified by the EVENTHUB compliance team. Full features unlocked!`
            : `Your college accreditation status was updated to ${status}. ${rejectionReason || ''}`,
        type: 'COLLEGE_VERIFICATION',
        link: '/college/profile',
        isRead: false,
      });
    }

    return res.json({
      success: true,
      message: `College accreditation status updated to ${status}.`,
      college: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

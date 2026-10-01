import { Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  User,
  CollegeAdminMembership,
  StudentProfile,
  College,
  Notification,
  AdminActivityLog,
  OtpVerification,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendOtpEmail } from '../services/emailService';

function generate6DigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Helper to record admin activities and notify the College Super Admin
 */
export async function logAdminActivityHelper(params: {
  collegeId: string;
  adminUserId: string;
  adminName: string;
  adminUsername?: string;
  actionType: string;
  details: string;
  targetType?: string;
  targetId?: string;
  targetTitle?: string;
}) {
  try {
    const timestamp = new Date().toISOString();
    const log = await AdminActivityLog.create({
      collegeId: params.collegeId,
      adminUserId: params.adminUserId,
      adminName: params.adminName,
      adminUsername: params.adminUsername || '',
      actionType: params.actionType,
      details: params.details,
      targetType: params.targetType,
      targetId: params.targetId,
      targetTitle: params.targetTitle,
      timestamp,
    });

    // Notify the College Super Admin for this college
    const superAdminMembership = await CollegeAdminMembership.findOne({
      collegeId: params.collegeId,
      role: 'College Super Admin',
    });

    const superAdminUserId = superAdminMembership?.userId;
    if (superAdminUserId && superAdminUserId !== params.adminUserId) {
      await Notification.create({
        recipientUserId: superAdminUserId,
        type: 'ADMIN_ACTION',
        title: 'Admin Activity Logged',
        message: params.details,
        metadata: {
          collegeId: params.collegeId,
          adminUserId: params.adminUserId,
          actionType: params.actionType,
          targetId: params.targetId,
        },
        read: false,
      });
    }

    return log;
  } catch (err) {
    console.error('Failed to log admin activity:', err);
    return null;
  }
}

/**
 * Search existing EVENTHUB students/users by username or name to invite as Admin
 */
export async function searchUsersForAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || user.role !== 'College Super Admin' || !user.collegeId) {
      return res.status(403).json({ success: false, message: 'Only College Super Admin can search users for admin access.' });
    }

    const { query } = req.query;
    if (!query || String(query).trim().length === 0) {
      return res.json({ success: true, users: [] });
    }

    const q = String(query).trim().toLowerCase().replace(/^@/, '');
    const students = await StudentProfile.find().exec();
    
    // Filter matching by username or fullName
    const matches = students
      .filter((s) => {
        const usernameMatch = s.username && s.username.toLowerCase().includes(q);
        const nameMatch = s.fullName && s.fullName.toLowerCase().includes(q);
        return usernameMatch || nameMatch;
      })
      .slice(0, 15);

    // Check existing memberships for this college
    const existingMemberships = await CollegeAdminMembership.find({ collegeId: user.collegeId }).exec();
    const existingMap = new Map<string, string>();
    for (const m of existingMemberships) {
      existingMap.set(m.userId, m.status || 'Active');
    }

    const results = matches.map((s) => ({
      userId: s.userId,
      studentId: s._id,
      fullName: s.fullName,
      username: s.username,
      email: s.email,
      department: s.department,
      collegeName: s.collegeName,
      profilePhoto: s.profilePhoto,
      currentStatus: existingMap.get(s.userId) || null,
    }));

    return res.json({ success: true, users: results });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get all administrators and invited administrators for the current college
 */
export async function getCollegeAdmins(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const collegeId =
      (req.headers['x-college-id'] as string) ||
      (req.query?.collegeId as string) ||
      user.collegeId;

    if (!collegeId) {
      return res.json({ success: true, count: 0, maxAllowed: 10, admins: [] });
    }

    const isCollegeStaff = user.collegeId === collegeId;
    const hasMembership = await CollegeAdminMembership.findOne({
      collegeId,
      userId: user._id,
      status: 'Active',
    });
    const isCollegeSuperAdmin = user.role === 'College Super Admin' && user.collegeId === collegeId;

    if (!isCollegeStaff && !hasMembership && !isCollegeSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized. You do not have administrator permissions for this college.' });
    }

    const admins = await CollegeAdminMembership.find({ collegeId }).exec();
    return res.json({ success: true, count: admins.length, maxAllowed: 10, admins });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Invite an existing EVENTHUB user to become a College Admin
 */
export async function inviteCollegeAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || user.role !== 'College Super Admin' || !user.collegeId) {
      return res.status(403).json({ success: false, message: 'Only College Super Admin can invite administrators.' });
    }

    const {
      targetUserId,
      permissions = [
        'manageEvents',
        'manageAttendance',
        'manageCertificates',
        'viewAnalytics',
      ],
    } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Target user ID is required.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Selected EVENTHUB user not found.' });
    }

    const college = await College.findById(user.collegeId);
    if (!college) {
      return res.status(404).json({ success: false, message: 'Institution record not found.' });
    }

    // Limit check: Maximum 10 additional admins
    const currentAdmins = await CollegeAdminMembership.find({
      collegeId: user.collegeId,
      status: { $in: ['Active', 'Invited'] },
    }).exec();

    const additionalAdmins = currentAdmins.filter((a) => a.role === 'College Admin');
    if (additionalAdmins.length >= 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum limit of 10 additional authorized college administrators reached.',
      });
    }

    // Check if membership already exists
    const existingMembership = await CollegeAdminMembership.findOne({
      collegeId: user.collegeId,
      userId: targetUser._id,
    });

    const targetProfile = await StudentProfile.findOne({ userId: targetUser._id });

    if (existingMembership) {
      if (existingMembership.status === 'Active') {
        return res.status(200).json({
          success: true,
          message: 'User is already an active administrator for this college.',
          membership: existingMembership,
        });
      }
      if (existingMembership.status === 'Invited') {
        return res.status(400).json({ success: false, message: 'An invitation is already pending for this user.' });
      }
      // If rejected earlier, reactivate invitation
      const updated = await CollegeAdminMembership.findByIdAndUpdate(existingMembership._id, {
        status: 'Invited',
        permissions,
        invitedBy: user.fullName,
        invitedAt: new Date().toISOString(),
        rejectedAt: undefined,
      });

      // Send notification
      await Notification.create({
        recipientUserId: targetUser._id,
        type: 'ADMIN_INVITE',
        title: 'College Admin Invitation',
        message: `${college.name} invited you to become a College Admin.`,
        metadata: {
          membershipId: existingMembership._id,
          collegeId: college._id,
          collegeName: college.name,
          collegeLogo: college.logo,
          permissions,
        },
        read: false,
      });

      return res.json({
        success: true,
        message: `Admin invitation sent to @${targetProfile?.username || targetUser.fullName}.`,
        membership: updated,
      });
    }

    const membership = await CollegeAdminMembership.create({
      collegeId: user.collegeId,
      userId: targetUser._id,
      role: 'College Admin',
      name: targetUser.fullName,
      email: targetUser.email,
      username: targetProfile?.username || '',
      permissions,
      status: 'Invited',
      invitedBy: user.fullName,
      invitedAt: new Date().toISOString(),
      addedBy: user.fullName,
    });

    // Send in-app notification to the selected student
    await Notification.create({
      recipientUserId: targetUser._id,
      type: 'ADMIN_INVITE',
      title: 'College Admin Invitation',
      message: `${college.name} invited you to become a College Admin.`,
      metadata: {
        membershipId: membership._id,
        collegeId: college._id,
        collegeName: college.name,
        collegeLogo: college.logo,
        permissions,
      },
      read: false,
    });

    // Log super admin action
    await logAdminActivityHelper({
      collegeId: user.collegeId,
      adminUserId: user._id,
      adminName: user.fullName,
      adminUsername: 'superadmin',
      actionType: 'INVITE_ADMIN',
      details: `@${user.fullName} sent an Admin invitation to @${targetProfile?.username || targetUser.fullName}`,
      targetType: 'User',
      targetId: targetUser._id,
      targetTitle: targetUser.fullName,
    });

    return res.status(201).json({
      success: true,
      message: `Admin invitation successfully sent to @${targetProfile?.username || targetUser.fullName}.`,
      membership,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Update administrator permissions
 */
export async function updateCollegeAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || user.role !== 'College Super Admin' || !user.collegeId) {
      return res.status(403).json({ success: false, message: 'Only College Super Admin can update administrator permissions.' });
    }

    const { membershipId } = req.params;
    const { name, permissions, status } = req.body;

    const membership = await CollegeAdminMembership.findById(membershipId);
    if (!membership) return res.status(404).json({ success: false, message: 'Membership not found.' });

    if (membership.collegeId !== user.collegeId) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this institution.' });
    }

    if (membership.role === 'College Super Admin') {
      return res.status(400).json({ success: false, message: 'Cannot modify primary Super Admin permissions or status.' });
    }

    const college = await College.findById(user.collegeId);

    // Merge permissions properly without wiping unrelated existing permissions (Requirement 7)
    let finalPermissions = membership.permissions || [];
    let addedPerms: string[] = [];
    let removedPerms: string[] = [];

    if (permissions !== undefined) {
      const KNOWN_ADMIN_PERMISSIONS = [
        'createEvents',
        'manageAttendance',
        'issueCertificates',
        'managePlacements',
        'manageInfrastructure',
        'manageMessages',
      ];
      // Keep any unmanaged custom/system permissions already on the membership
      const unmanagedExisting = (membership.permissions || []).filter(
        (p) => !KNOWN_ADMIN_PERMISSIONS.includes(p)
      );

      const requestedList = Array.isArray(permissions) ? permissions : [];
      const candidateSet = new Set([...unmanagedExisting, ...requestedList]);
      finalPermissions = Array.from(candidateSet);

      const prevSet = new Set(membership.permissions || []);
      const nextSet = new Set(finalPermissions);

      addedPerms = finalPermissions.filter((p) => !prevSet.has(p));
      removedPerms = (membership.permissions || []).filter((p) => !nextSet.has(p));
    }

    const updated = await CollegeAdminMembership.findByIdAndUpdate(
      membershipId,
      {
        ...(name && { name }),
        ...(permissions !== undefined && { permissions: finalPermissions }),
        ...(status && { status }),
      }
    );

    // Handle status toggle (Enable / Disable)
    if (status && status !== membership.status) {
      const isDisabling = status === 'Disabled';
      const actionType = isDisabling ? 'DISABLE_ADMIN' : 'ENABLE_ADMIN';
      const details = isDisabling
        ? `@${user.fullName} disabled Admin access for ${membership.name}.`
        : `@${user.fullName} re-enabled Admin access for ${membership.name}.`;

      await logAdminActivityHelper({
        collegeId: user.collegeId,
        adminUserId: user._id,
        adminName: user.fullName,
        actionType,
        details,
        targetType: 'AdminMembership',
        targetId: membershipId,
        targetTitle: membership.name,
      });

      // Notify the target user
      await Notification.create({
        recipientUserId: membership.userId,
        type: 'ADMIN_ACTION',
        title: isDisabling ? 'Admin Access Disabled' : 'Admin Access Restored',
        message: isDisabling
          ? `Your Admin access for ${college?.name || 'the college'} has been disabled.`
          : `Your Admin access for ${college?.name || 'the college'} has been re-enabled.`,
        metadata: {
          collegeId: user.collegeId,
          membershipId,
        },
        read: false,
      });

      return res.json({
        success: true,
        message: isDisabling ? 'Administrator access has been disabled.' : 'Administrator access has been re-enabled.',
        membership: updated,
      });
    }

    // Handle permissions update notification (Requirement 8)
    if (permissions !== undefined && (addedPerms.length > 0 || removedPerms.length > 0)) {
      const changesList: string[] = [];
      if (addedPerms.length > 0) changesList.push(`Added: ${addedPerms.join(', ')}`);
      if (removedPerms.length > 0) changesList.push(`Removed: ${removedPerms.join(', ')}`);
      const changeText = changesList.join('; ');

      await logAdminActivityHelper({
        collegeId: user.collegeId,
        adminUserId: user._id,
        adminName: user.fullName,
        actionType: 'UPDATE_PERMISSIONS',
        details: `@${user.fullName} updated permissions for ${membership.name}: ${changeText}.`,
        targetType: 'AdminMembership',
        targetId: membershipId,
        targetTitle: membership.name,
      });

      // Notify the Admin stating exactly what changed
      await Notification.create({
        recipientUserId: membership.userId,
        type: 'ADMIN_ACTION',
        title: 'Admin Permissions Updated',
        message: `Your administrator permissions for ${college?.name || 'the college'} have been updated. ${changeText}.`,
        metadata: {
          collegeId: user.collegeId,
          membershipId,
          added: addedPerms,
          removed: removedPerms,
        },
        read: false,
      });

      return res.json({
        success: true,
        message: `Administrator permissions updated successfully. (${changeText})`,
        membership: updated,
      });
    }

    await logAdminActivityHelper({
      collegeId: user.collegeId,
      adminUserId: user._id,
      adminName: user.fullName,
      actionType: 'UPDATE_PERMISSIONS',
      details: `@${user.fullName} updated profile for admin ${membership.name}.`,
      targetType: 'AdminMembership',
      targetId: membershipId,
      targetTitle: membership.name,
    });

    return res.json({
      success: true,
      message: 'Administrator details updated successfully.',
      membership: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Remove an administrator or cancel invitation (Revoke) (Requirement 10)
 */
export async function removeCollegeAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || user.role !== 'College Super Admin' || !user.collegeId) {
      return res.status(403).json({ success: false, message: 'Only College Super Admin can remove administrators.' });
    }

    const { membershipId } = req.params;
    let membership = await CollegeAdminMembership.findById(membershipId);
    if (!membership) {
      membership = await CollegeAdminMembership.findOne({
        collegeId: user.collegeId,
        $or: [{ _id: membershipId }, { id: membershipId }, { userId: membershipId }],
      });
    }
    if (!membership) return res.status(404).json({ success: false, message: 'Membership not found' });

    if (membership.collegeId !== user.collegeId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (membership.role === 'College Super Admin') {
      return res.status(400).json({ success: false, message: 'Cannot remove primary College Super Admin.' });
    }

    // Immediately remove from collegeAdminMemberships collection
    await CollegeAdminMembership.findByIdAndDelete(membership._id);

    // If user has no remaining active admin memberships, reset role to Student
    const remainingActive = await CollegeAdminMembership.find({
      userId: membership.userId,
      status: 'Active',
    }).exec();

    if (remainingActive.length === 0) {
      const targetUser = await User.findById(membership.userId);
      if (targetUser && targetUser.role === 'College Admin') {
        await User.findByIdAndUpdate(membership.userId, {
          role: 'Student',
          collegeId: undefined,
        });
      }
    }

    // Notify affected user immediately (Requirement 10)
    const college = await College.findById(user.collegeId);
    if (membership.userId) {
      await Notification.create({
        recipientUserId: membership.userId,
        type: 'ADMIN_ACTION',
        title: 'Admin Access Revoked',
        message: `Your administrator access for ${college?.name || 'the institution'} has been revoked.`,
        metadata: {
          collegeId: user.collegeId,
          collegeName: college?.name,
          action: 'admin-access-revoked',
        },
        read: false,
      });
    }

    await logAdminActivityHelper({
      collegeId: user.collegeId,
      adminUserId: user._id,
      adminName: user.fullName,
      actionType: 'REMOVE_ADMIN',
      details: `@${user.fullName} removed admin membership for ${membership.name}.`,
      targetType: 'AdminMembership',
      targetId: membership._id,
      targetTitle: membership.name,
    });

    return res.json({ success: true, message: 'Administrator removed successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * User fetches pending admin invitations sent to them
 */
export async function getMyAdminInvitations(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const invitations = await CollegeAdminMembership.find({
      userId: user._id,
      status: 'Invited',
    }).exec();

    // Populate college information
    const populated = await Promise.all(
      invitations.map(async (inv) => {
        const college = await College.findById(inv.collegeId);
        return {
          ...inv,
          college: college ? {
            _id: college._id,
            name: college.name,
            logo: college.logo,
            location: college.location,
          } : null,
        };
      })
    );

    return res.json({ success: true, invitations: populated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * User accepts an Admin Invitation
 */
export async function acceptAdminInvite(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { membershipId } = req.params;
    const membership = await CollegeAdminMembership.findById(membershipId);
    if (!membership) return res.status(404).json({ success: false, message: 'Invitation not found.' });

    if (membership.userId !== user._id) {
      return res.status(403).json({ success: false, message: 'This invitation was not sent to you.' });
    }

    if (membership.status === 'Active') {
      return res.json({ success: true, message: 'Invitation already accepted.', membership });
    }

    const acceptedAt = new Date().toISOString();
    const updated = await CollegeAdminMembership.findByIdAndUpdate(membershipId, {
      status: 'Active',
      acceptedAt,
    });

    const college = await College.findById(membership.collegeId);

    // Notify College Super Admin
    const recipients = new Set<string>();
    if (college?.superAdminId) recipients.add(college.superAdminId);
    const superAdminMembership = await CollegeAdminMembership.findOne({
      collegeId: membership.collegeId,
      role: 'College Super Admin',
    });
    if (superAdminMembership?.userId) recipients.add(superAdminMembership.userId);

    for (const recipientId of recipients) {
      await Notification.create({
        recipientUserId: recipientId,
        type: 'ADMIN_ACTION',
        title: 'Admin Invitation Accepted',
        message: `@${user.fullName} accepted your invitation to become an Admin for ${college?.name || 'your college'}.`,
        metadata: {
          collegeId: membership.collegeId,
          adminUserId: user._id,
          action: 'manage-admins',
        },
        read: false,
      });
    }

    // Log activity
    await logAdminActivityHelper({
      collegeId: membership.collegeId,
      adminUserId: user._id,
      adminName: user.fullName,
      actionType: 'ACCEPT_INVITE',
      details: `@${user.fullName} accepted the College Admin role for ${college?.name || 'college'}.`,
      targetType: 'CollegeAdminMembership',
      targetId: membershipId,
      targetTitle: user.fullName,
    });

    return res.json({
      success: true,
      message: `You are now an authorized College Admin for ${college?.name || 'the institution'}.`,
      membership: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * User rejects an Admin Invitation
 */
export async function rejectAdminInvite(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { membershipId } = req.params;
    const membership = await CollegeAdminMembership.findById(membershipId);
    if (!membership) return res.status(404).json({ success: false, message: 'Invitation not found.' });

    if (membership.userId !== user._id) {
      return res.status(403).json({ success: false, message: 'This invitation was not sent to you.' });
    }

    const rejectedAt = new Date().toISOString();
    const updated = await CollegeAdminMembership.findByIdAndUpdate(membershipId, {
      status: 'Rejected',
      rejectedAt,
    });

    const college = await College.findById(membership.collegeId);

    // Notify College Super Admin
    const recipients = new Set<string>();
    if (college?.superAdminId) recipients.add(college.superAdminId);
    const superAdminMembership = await CollegeAdminMembership.findOne({
      collegeId: membership.collegeId,
      role: 'College Super Admin',
    });
    if (superAdminMembership?.userId) recipients.add(superAdminMembership.userId);

    for (const recipientId of recipients) {
      await Notification.create({
        recipientUserId: recipientId,
        type: 'ADMIN_ACTION',
        title: 'Admin Invitation Declined',
        message: `@${user.fullName} declined the College Admin invitation for ${college?.name || 'your college'}.`,
        metadata: {
          collegeId: membership.collegeId,
          adminUserId: user._id,
          action: 'manage-admins',
        },
        read: false,
      });
    }

    return res.json({
      success: true,
      message: 'Invitation declined.',
      membership: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Return all colleges where the current user has active College Admin memberships
 * Supports a single user being an Admin for multiple colleges! (Requirement 14)
 */
export async function getMyAdminRoles(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Find all active & disabled memberships for this user (Requirement 8)
    const memberships = await CollegeAdminMembership.find({
      userId: user._id,
      status: { $in: ['Active', 'Disabled'] },
    }).exec();

    // Populate college details
    const populated = await Promise.all(
      memberships.map(async (m) => {
        const col = await College.findById(m.collegeId);
        return {
          membershipId: m._id,
          collegeId: m.collegeId,
          role: m.role,
          status: m.status,
          permissions: m.permissions || [],
          acceptedAt: m.acceptedAt || m.createdAt,
          college: col ? {
            _id: col._id,
            name: col.name,
            logo: col.logo,
            coverPhoto: col.coverPhoto,
            location: col.location,
            verificationStatus: col.verificationStatus,
            connectionsCount: col.connectionsCount || 0,
          } : null,
        };
      })
    );

    const validColleges = populated.filter((item) => item.college !== null);

    return res.json({
      success: true,
      count: validColleges.length,
      adminRoles: validColleges,
      roles: validColleges,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get chronological activity logs for a college, filterable by admin (Requirement 17)
 */
export async function getAdminActivity(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const collegeId = (req.query.collegeId as string) || user.collegeId;
    if (!collegeId) {
      return res.status(400).json({ success: false, message: 'College ID is required.' });
    }

    // Check user is admin of this college
    const membership = await CollegeAdminMembership.findOne({
      collegeId,
      userId: user._id,
      status: 'Active',
    });

    const isCollegeSuperAdmin = user.role === 'College Super Admin' && user.collegeId === collegeId;

    if (!membership && !isCollegeSuperAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied to this institution activity log.' });
    }

    let logs = await AdminActivityLog.find({ collegeId }).exec();

    // Sort descending by timestamp
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Optional filter by adminUserId
    const { adminUserId } = req.query;
    if (adminUserId) {
      logs = logs.filter((l) => l.adminUserId === adminUserId);
    }

    return res.json({
      success: true,
      total: logs.length,
      logs,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Record an activity action directly (exported endpoint)
 */
export async function createAdminActivity(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { collegeId, actionType, details, targetType, targetId, targetTitle } = req.body;
    if (!collegeId || !actionType || !details) {
      return res.status(400).json({ success: false, message: 'collegeId, actionType, and details are required.' });
    }

    const log = await logAdminActivityHelper({
      collegeId,
      adminUserId: user._id,
      adminName: user.fullName,
      adminUsername: (user as any).username || user.email?.split('@')[0],
      actionType,
      details,
      targetType,
      targetId,
      targetTitle,
    });

    return res.status(201).json({ success: true, log });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 4-DIGIT ADMIN ACCESS PIN SYSTEM (Requirements 2, 3, 4, 5)
 */

/**
 * GET /api/admins/pin/status
 * Check if the user has configured an Admin Access PIN
 */
export async function getAdminPinStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const freshUser = await User.findById(user._id);
    const hasPin = Boolean(freshUser?.adminPinHash);

    return res.json({
      success: true,
      hasPin,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/admins/pin/setup
 * Create a new 4-digit Admin Access PIN (Hashed with bcrypt, never plain - Req 3, 4)
 */
export async function setupAdminPin(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { pin, confirmPin } = req.body;

    if (!pin || !confirmPin) {
      return res.status(400).json({ success: false, message: 'PIN and confirm PIN are required.' });
    }

    const cleanPin = String(pin).trim();
    const cleanConfirm = String(confirmPin).trim();

    if (!/^\d{4}$/.test(cleanPin)) {
      return res.status(400).json({ success: false, message: 'Admin Access PIN must be exactly 4 digits.' });
    }

    if (cleanPin !== cleanConfirm) {
      return res.status(400).json({ success: false, message: 'PINs do not match.' });
    }

    const adminPinHash = await bcrypt.hash(cleanPin, 10);

    await User.findByIdAndUpdate(user._id, {
      adminPinHash,
    });

    return res.json({
      success: true,
      message: 'Admin Access PIN configured successfully.',
      hasPin: true,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/admins/pin/verify
 * Verify a 4-digit Admin Access PIN
 */
export async function verifyAdminPin(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const freshUser = await User.findById(user._id);
    if (!freshUser || !freshUser.adminPinHash) {
      return res.status(400).json({
        success: false,
        hasPin: false,
        message: 'No Admin PIN configured. Please set up a 4-digit PIN first.',
      });
    }

    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ success: false, message: 'PIN is required.' });
    }

    const cleanPin = String(pin).trim();
    const isMatch = await bcrypt.compare(cleanPin, freshUser.adminPinHash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Incorrect 4-digit PIN. Please try again.',
      });
    }

    return res.json({
      success: true,
      verified: true,
      message: 'PIN verified successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/admins/pin/forgot
 * Send OTP to user's registered email to reset forgotten PIN (Req 5)
 */
export async function requestForgotAdminPinOtp(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const cleanEmail = user.email.trim().toLowerCase();
    const otp = generate6DigitOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    const existingOtp = await OtpVerification.findOne({
      email: cleanEmail,
      purpose: 'RESET_ADMIN_PIN',
    });

    if (existingOtp) {
      await OtpVerification.findByIdAndUpdate(existingOtp._id, {
        otpHash,
        expiresAt,
        verified: false,
        attempts: 0,
      });
    } else {
      await OtpVerification.create({
        email: cleanEmail,
        otpHash,
        purpose: 'RESET_ADMIN_PIN',
        expiresAt,
        resendAvailableAt: new Date().toISOString(),
        verified: false,
        attempts: 0,
      });
    }

    // Send email using existing email service (Req 5)
    await sendOtpEmail({
      email: cleanEmail,
      otp,
      recipientName: user.fullName || 'Administrator',
      purpose: 'RESET_ADMIN_PIN',
    });

    return res.json({
      success: true,
      message: `A 6-digit reset code has been sent to ${cleanEmail}.`,
      email: cleanEmail,
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/admins/pin/reset
 * Verify OTP and set a new 4-digit Admin Access PIN (Req 5)
 */
export async function resetAdminPinWithOtp(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { otp, newPin, confirmPin } = req.body;
    if (!otp || !newPin || !confirmPin) {
      return res.status(400).json({ success: false, message: 'Verification code, new PIN, and confirm PIN are required.' });
    }

    const cleanPin = String(newPin).trim();
    const cleanConfirm = String(confirmPin).trim();

    if (!/^\d{4}$/.test(cleanPin)) {
      return res.status(400).json({ success: false, message: 'PIN must be exactly 4 digits.' });
    }

    if (cleanPin !== cleanConfirm) {
      return res.status(400).json({ success: false, message: 'PINs do not match.' });
    }

    const cleanEmail = user.email.trim().toLowerCase();
    const otpRecord = await OtpVerification.findOne({
      email: cleanEmail,
      purpose: 'RESET_ADMIN_PIN',
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'No reset request found. Please request a new code.' });
    }

    if (new Date(otpRecord.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: 'Reset code has expired. Please request a new one.' });
    }

    const cleanOtp = String(otp).trim();
    const isOtpValid = await bcrypt.compare(cleanOtp, otpRecord.otpHash);
    if (!isOtpValid) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    const adminPinHash = await bcrypt.hash(cleanPin, 10);
    await User.findByIdAndUpdate(user._id, { adminPinHash });

    await OtpVerification.findByIdAndUpdate(otpRecord._id, { verified: true });

    return res.json({
      success: true,
      message: 'Admin Access PIN has been successfully reset.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

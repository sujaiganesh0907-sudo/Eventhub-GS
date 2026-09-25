import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, CollegeAdminMembership } from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getCollegeAdmins(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || !user.collegeId) return res.status(403).json({ success: false, message: 'College account required' });

    const admins = await CollegeAdminMembership.find({ collegeId: user.collegeId }).exec();
    return res.json({ success: true, count: admins.length, maxAllowed: 10, admins });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function addCollegeAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || user.role !== 'College Super Admin' || !user.collegeId) {
      return res.status(403).json({ success: false, message: 'Only College Super Admin can add authorized administrators.' });
    }

    const {
      name,
      email,
      password = 'Password123!',
      permissions = ['EVENTS_MANAGE', 'ATTENDANCE_SCAN', 'CERTIFICATES_ISSUE', 'ANALYTICS_VIEW'],
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Admin name and email are required.' });
    }

    // Limit check: Maximum 10 additional admins
    const currentAdmins = await CollegeAdminMembership.find({ collegeId: user.collegeId }).exec();
    const additionalAdmins = currentAdmins.filter((a) => a.role === 'College Admin');
    if (additionalAdmins.length >= 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum limit of 10 additional authorized college administrators reached.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    let targetUser = await User.findOne({ email: cleanEmail });

    if (!targetUser) {
      const passwordHash = await bcrypt.hash(password, 10);
      targetUser = await User.create({
        email: cleanEmail,
        passwordHash,
        role: 'College Admin',
        fullName: name,
        isEmailVerified: true,
        collegeId: user.collegeId,
      });
    } else {
      if (targetUser.collegeId && targetUser.collegeId !== user.collegeId) {
        return res.status(400).json({ success: false, message: 'This user is already affiliated with another institution.' });
      }
      await User.findByIdAndUpdate(targetUser._id, {
        role: 'College Admin',
        collegeId: user.collegeId,
      });
    }

    if (!targetUser) {
      return res.status(500).json({ success: false, message: 'Failed to prepare user account.' });
    }

    const existingMembership = await CollegeAdminMembership.findOne({
      collegeId: user.collegeId,
      userId: targetUser._id,
    });

    if (existingMembership) {
      return res.status(400).json({ success: false, message: 'User is already an authorized administrator for this college.' });
    }

    const membership = await CollegeAdminMembership.create({
      collegeId: user.collegeId,
      userId: targetUser._id,
      role: 'College Admin',
      name,
      email: cleanEmail,
      permissions,
      addedBy: user.fullName,
    });

    return res.status(201).json({
      success: true,
      message: 'Authorized college administrator added successfully.',
      membership,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateCollegeAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || user.role !== 'College Super Admin' || !user.collegeId) {
      return res.status(403).json({ success: false, message: 'Only College Super Admin can update administrator permissions.' });
    }

    const { membershipId } = req.params;
    const { name, permissions } = req.body;

    const membership = await CollegeAdminMembership.findById(membershipId);
    if (!membership) return res.status(404).json({ success: false, message: 'Membership not found.' });

    if (membership.collegeId !== user.collegeId) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this institution.' });
    }

    if (membership.role === 'College Super Admin') {
      return res.status(400).json({ success: false, message: 'Cannot modify primary Super Admin permissions.' });
    }

    const updated = await CollegeAdminMembership.findByIdAndUpdate(
      membershipId,
      {
        name: name || membership.name,
        permissions: permissions || membership.permissions,
      }
    );

    return res.json({
      success: true,
      message: 'Administrator permissions updated successfully.',
      membership: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function removeCollegeAdmin(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user || user.role !== 'College Super Admin' || !user.collegeId) {
      return res.status(403).json({ success: false, message: 'Only College Super Admin can remove administrators.' });
    }

    const { membershipId } = req.params;
    const membership = await CollegeAdminMembership.findById(membershipId);
    if (!membership) return res.status(404).json({ success: false, message: 'Membership not found' });

    if (membership.collegeId !== user.collegeId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (membership.role === 'College Super Admin') {
      return res.status(400).json({ success: false, message: 'Cannot remove primary College Super Admin.' });
    }

    await CollegeAdminMembership.findByIdAndDelete(membershipId);
    return res.json({ success: true, message: 'Administrator removed successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

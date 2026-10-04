import { Request, Response } from 'express';
import { College, Connection, Event, PlacementPost, InfrastructurePost, CollegeAdminMembership } from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

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

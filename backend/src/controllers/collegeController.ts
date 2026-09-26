import { Request, Response } from 'express';
import { College, Connection, Event, PlacementPost, InfrastructurePost } from '../models/index';
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

    return res.json({
      success: true,
      total: colleges.length,
      colleges,
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

    return res.json({
      success: true,
      message: 'College profile updated successfully.',
      college: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

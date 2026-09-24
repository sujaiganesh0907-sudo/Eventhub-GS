import { Request, Response } from 'express';
import { StudentProfile, User, Connection, Follow, Certificate, EventRegistration } from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getStudentProfile(req: Request, res: Response) {
  try {
    const { id } = req.params;
    let profile = null;

    if (!id || id === 'me') {
      const authReq = req as AuthenticatedRequest;
      if (authReq.user) {
        profile = await StudentProfile.findOne({ userId: authReq.user._id });
      }
    } else {
      profile = await StudentProfile.findById(id);
      if (!profile) {
        profile = await StudentProfile.findOne({ userId: id });
      }
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const certificatesCount = await Certificate.countDocuments({ studentId: profile._id, isDraft: false });
    const eventsCount = await EventRegistration.countDocuments({ studentId: profile._id, status: 'Confirmed' });
    const connectionsCount = await Connection.countDocuments({ studentId: profile._id });
    const followersCount = await Follow.countDocuments({ followingStudentId: profile._id });
    const followingCount = await Follow.countDocuments({ followerStudentId: profile._id });

    const profileData = {
      ...((profile as any).toObject ? (profile as any).toObject() : profile),
      certificatesCount,
      eventsCount,
      connectionsCount,
      followersCount,
      followingCount,
    };

    return res.json({
      success: true,
      profile: profileData,
      student: profileData,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateStudentProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const profile = await StudentProfile.findOne({ userId: user._id });
    if (!profile) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const {
      fullName,
      collegeName,
      department,
      yearOfStudy,
      phoneNumber,
      bio,
      location,
      skills,
      achievements,
      profilePhoto,
      coverPhoto,
    } = req.body;

    const updated = await StudentProfile.findByIdAndUpdate(profile._id, {
      $set: {
        ...(fullName && { fullName }),
        ...(collegeName && { collegeName }),
        ...(department && { department }),
        ...(yearOfStudy && { yearOfStudy }),
        ...(phoneNumber && { phoneNumber }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(skills && { skills: Array.isArray(skills) ? skills : skills.split(',').map((s: string) => s.trim()) }),
        ...(achievements && { achievements: Array.isArray(achievements) ? achievements : achievements.split('\n').map((a: string) => a.trim()).filter(Boolean) }),
        ...(profilePhoto && { profilePhoto }),
        ...(coverPhoto && { coverPhoto }),
      },
    });

    if (fullName) {
      await User.findByIdAndUpdate(user._id, { fullName });
    }

    return res.json({
      success: true,
      message: 'Student profile updated successfully.',
      profile: updated,
      student: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function searchStudents(req: Request, res: Response) {
  try {
    const { query } = req.query;
    let profiles = await StudentProfile.find().limit(20).exec();

    if (query) {
      const q = String(query).toLowerCase();
      profiles = profiles.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.collegeName.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q) ||
          (p.skills && p.skills.some((s: string) => s.toLowerCase().includes(q)))
      );
    }

    return res.json({ success: true, profiles });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

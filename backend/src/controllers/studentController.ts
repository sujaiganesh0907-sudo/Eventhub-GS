import { Request, Response } from 'express';
import { StudentProfile, User, Connection, Follow, Certificate, EventRegistration, Event } from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getStudentProfile(req: Request, res: Response) {
  try {
    const { id } = req.params;
    let profile = null;
    const authReq = req as AuthenticatedRequest;
    const currentUserId = authReq.user?._id;

    if (!id || id === 'me') {
      if (authReq.user) {
        profile = await StudentProfile.findOne({ userId: authReq.user._id });
      }
    } else {
      profile = await StudentProfile.findById(id);
      if (!profile) {
        profile = await StudentProfile.findOne({ userId: id });
      }
      if (!profile) {
        // Also allow lookup by username
        const cleanUser = id.replace(/^@/, '').toLowerCase();
        profile = await StudentProfile.findOne({ username: cleanUser });
      }
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const isOwner = currentUserId && (profile.userId === currentUserId || profile._id === currentUserId);

    let isFollowing = false;
    if (currentUserId && !isOwner) {
      const currentStudent = await StudentProfile.findOne({ userId: currentUserId });
      if (currentStudent) {
        const followDoc = await Follow.findOne({
          followerStudentId: currentStudent._id,
          followingStudentId: profile._id,
        });
        isFollowing = !!followDoc;
      }
    }

    // Backend privacy enforcement: if private and viewer is not owner and not following
    const isPrivate = profile.profileVisibility === 'Private';
    const isRestricted = isPrivate && !isOwner && !isFollowing;

    const certificatesCount = await Certificate.countDocuments({ studentId: profile._id, isDraft: false });
    const registeredCount = await EventRegistration.countDocuments({ studentId: profile._id });
    const attendedEventsCount = await EventRegistration.countDocuments({ studentId: profile._id, attended: true });
    const organizedCount = await Event.countDocuments({ creatorUserId: profile.userId });
    const eventsCount = registeredCount + organizedCount;
    const connectionsCount = await Connection.countDocuments({ studentId: profile._id });
    const followersCount = await Follow.countDocuments({ followingStudentId: profile._id });
    const followingCount = await Follow.countDocuments({ followerStudentId: profile._id });

    const rawProfile = (profile as any).toObject ? (profile as any).toObject() : profile;

    const profileData = {
      ...rawProfile,
      // If private & restricted, hide sensitive details
      email: isRestricted ? undefined : rawProfile.email,
      phoneNumber: isRestricted ? undefined : rawProfile.phoneNumber,
      isPrivateRestricted: isRestricted,
      isFollowing,
      certificatesCount,
      eventsCount,
      registeredCount,
      attendedEventsCount,
      organizedCount,
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
      username,
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
      profileVisibility,
      messagePrivacy,
    } = req.body;

    let cleanUsername: string | undefined = undefined;
    if (username !== undefined) {
      const rawUser = String(username).trim().replace(/^@/, '').toLowerCase();
      if (!/^[a-zA-Z0-9_.]{3,30}$/.test(rawUser)) {
        return res.status(400).json({
          success: false,
          message: 'Username must be 3-30 characters long and contain only letters, numbers, underscore, or period.',
        });
      }

      // Check uniqueness case-insensitively
      const existing = await StudentProfile.findOne({ username: rawUser });
      if (existing && existing._id !== profile._id) {
        return res.status(400).json({
          success: false,
          message: `Username @${rawUser} is already taken. Please choose another username.`,
        });
      }
      cleanUsername = rawUser;
    }

    const updated = await StudentProfile.findByIdAndUpdate(profile._id, {
      $set: {
        ...(fullName && { fullName: fullName.trim() }),
        ...(cleanUsername !== undefined && { username: cleanUsername }),
        ...(collegeName && { collegeName }),
        ...(department && { department }),
        ...(yearOfStudy && { yearOfStudy }),
        ...(phoneNumber && { phoneNumber }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(skills && { skills: Array.isArray(skills) ? skills : skills.split(',').map((s: string) => s.trim()) }),
        ...(achievements && { achievements: Array.isArray(achievements) ? achievements : achievements.split('\n').map((a: string) => a.trim()).filter(Boolean) }),
        ...(profilePhoto !== undefined && { profilePhoto }),
        ...(coverPhoto !== undefined && { coverPhoto }),
        ...(profileVisibility && { profileVisibility }),
        ...(messagePrivacy && { messagePrivacy }),
      },
    });

    if (fullName) {
      await User.findByIdAndUpdate(user._id, { fullName: fullName.trim() });
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
    let profiles = await StudentProfile.find().limit(30).exec();

    if (query) {
      const q = String(query).toLowerCase();
      const cleanQ = q.replace(/^@/, '');
      profiles = profiles.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          (p.username && p.username.toLowerCase().includes(cleanQ)) ||
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

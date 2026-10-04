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

    const isOwner = Boolean(currentUserId && (profile.userId === currentUserId || profile._id === currentUserId));

    let isFollowing = false;
    let isMutualConnection = false;
    if (currentUserId && !isOwner) {
      const currentStudent = await StudentProfile.findOne({ userId: currentUserId });
      if (currentStudent) {
        const [followThem, theyFollow] = await Promise.all([
          Follow.findOne({ followerStudentId: currentStudent._id, followingStudentId: profile._id }),
          Follow.findOne({ followerStudentId: profile._id, followingStudentId: currentStudent._id }),
        ]);
        isFollowing = !!followThem;
        isMutualConnection = Boolean(followThem && theyFollow);
      }
    }

    // Backend privacy enforcement (Requirement 7 & 11)
    // Who can view my profile: Everyone | EVENTHUB users | Connections only | Private
    const visibility = profile.profileVisibility || 'Public';
    let isRestricted = false;

    if (!isOwner) {
      if (visibility === 'Private') {
        isRestricted = true;
      } else if (visibility === 'Connections only') {
        isRestricted = !isMutualConnection;
      } else if (visibility === 'EVENTHUB users') {
        isRestricted = !currentUserId;
      }
    }

    // Resume privacy enforcement (Requirement 11)
    // Who can view my resume: Everyone | Connections | Colleges only | Private
    const resumePriv = profile.resumePrivacy || 'Colleges only';
    let canViewResume = false;

    if (isOwner) {
      canViewResume = true;
    } else {
      if (resumePriv === 'Everyone') {
        canViewResume = true;
      } else if (resumePriv === 'Connections') {
        canViewResume = isMutualConnection;
      } else if (resumePriv === 'Colleges only') {
        const isCollegeViewer = Boolean(
          authReq.user &&
          (authReq.user.role === 'College Super Admin' ||
           authReq.user.role === 'College Admin' ||
           authReq.user.collegeId)
        );
        canViewResume = isCollegeViewer;
      } else if (resumePriv === 'Private') {
        canViewResume = false;
      }
    }

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
      bio: isRestricted && visibility === 'Private' ? 'This user profile is private.' : rawProfile.bio,
      skills: isRestricted && visibility === 'Private' ? [] : rawProfile.skills,
      achievements: isRestricted && visibility === 'Private' ? [] : rawProfile.achievements,
      isPrivateRestricted: isRestricted,
      isFollowing,
      isMutualConnection,
      certificatesCount: isRestricted && visibility === 'Private' ? 0 : certificatesCount,
      eventsCount,
      registeredCount,
      attendedEventsCount,
      organizedCount,
      connectionsCount,
      followersCount,
      followingCount,
      // Resume privacy enforcement (Requirement 11)
      resumeFileUrl: canViewResume ? rawProfile.resumeFileUrl : undefined,
      resumeFileType: canViewResume ? rawProfile.resumeFileType : undefined,
      resumeOriginalName: canViewResume ? rawProfile.resumeOriginalName : undefined,
      resumeUploadedAt: canViewResume ? rawProfile.resumeUploadedAt : undefined,
      resumeCoverUrl: canViewResume ? rawProfile.resumeCoverUrl : undefined,
      canAccessResume: canViewResume,
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
      resumePrivacy,
      groupAddPrivacy,
      notificationPreferences,
      themePreference,
      resumeFileUrl,
      resumeFileType,
      resumeOriginalName,
      resumeUploadedAt,
      resumeCoverUrl,
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

      if (RESERVED_USERNAMES.has(rawUser)) {
        return res.status(400).json({
          success: false,
          message: `The username @${rawUser} is reserved and cannot be claimed.`,
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
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(skills && { skills: Array.isArray(skills) ? skills : skills.split(',').map((s: string) => s.trim()) }),
        ...(achievements && { achievements: Array.isArray(achievements) ? achievements : achievements.split('\n').map((a: string) => a.trim()).filter(Boolean) }),
        ...(profilePhoto !== undefined && { profilePhoto }),
        ...(coverPhoto !== undefined && { coverPhoto }),
        ...(profileVisibility && { profileVisibility }),
        ...(messagePrivacy && { messagePrivacy }),
        ...(resumePrivacy && { resumePrivacy }),
        ...(groupAddPrivacy && { groupAddPrivacy }),
        ...(notificationPreferences && { notificationPreferences }),
        ...(resumeFileUrl !== undefined && { resumeFileUrl }),
        ...(resumeFileType !== undefined && { resumeFileType }),
        ...(resumeOriginalName !== undefined && { resumeOriginalName }),
        ...(resumeUploadedAt !== undefined && { resumeUploadedAt }),
        ...(resumeCoverUrl !== undefined && { resumeCoverUrl }),
      },
    });

    if (fullName) {
      await User.findByIdAndUpdate(user._id, { fullName: fullName.trim() });
    }
    if (themePreference) {
      await User.findByIdAndUpdate(user._id, { themePreference });
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

const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'root', 'support', 'eventhub', 'moderator',
  'system', 'official', 'api', 'help', 'null', 'undefined', 'test',
  'superadmin', 'college', 'student', 'security', 'billing', 'terms', 'privacy'
]);

export async function checkUsernameAvailability(req: Request, res: Response) {
  try {
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, available: false, message: 'Username query parameter is required.' });
    }

    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(clean)) {
      return res.json({
        success: true,
        available: false,
        message: 'Username must be 3-30 characters long using letters, numbers, underscore, or period.',
      });
    }

    if (RESERVED_USERNAMES.has(clean)) {
      return res.json({
        success: true,
        available: false,
        message: 'This username is reserved and cannot be claimed.',
      });
    }

    const authReq = req as AuthenticatedRequest;
    const currentUserId = authReq.user?._id;

    const existing = await StudentProfile.findOne({ username: clean });
    if (existing) {
      if (currentUserId && (existing.userId === currentUserId || existing._id === currentUserId)) {
        return res.json({ success: true, available: true, message: 'This is your current username.' });
      }
      return res.json({ success: true, available: false, message: `@${clean} is already taken.` });
    }

    return res.json({ success: true, available: true, message: `@${clean} is available!` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getStudentResume(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;
    const currentUserId = authReq.user?._id;

    let profile = await StudentProfile.findById(id);
    if (!profile) profile = await StudentProfile.findOne({ userId: id });
    if (!profile) {
      const cleanUser = id.replace(/^@/, '').toLowerCase();
      profile = await StudentProfile.findOne({ username: cleanUser });
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const isOwner = Boolean(currentUserId && (profile.userId === currentUserId || profile._id === currentUserId));

    let isMutualConnection = false;
    if (currentUserId && !isOwner) {
      const currentStudent = await StudentProfile.findOne({ userId: currentUserId });
      if (currentStudent) {
        const [followThem, theyFollow] = await Promise.all([
          Follow.findOne({ followerStudentId: currentStudent._id, followingStudentId: profile._id }),
          Follow.findOne({ followerStudentId: profile._id, followingStudentId: currentStudent._id }),
        ]);
        isMutualConnection = Boolean(followThem && theyFollow);
      }
    }

    const resumePriv = profile.resumePrivacy || 'Colleges only';
    let canViewResume = false;

    if (isOwner) {
      canViewResume = true;
    } else {
      if (resumePriv === 'Everyone') {
        canViewResume = true;
      } else if (resumePriv === 'Connections') {
        canViewResume = isMutualConnection;
      } else if (resumePriv === 'Colleges only') {
        const isCollegeViewer = Boolean(
          authReq.user &&
          (authReq.user.role === 'College Super Admin' ||
           authReq.user.role === 'College Admin' ||
           authReq.user.collegeId)
        );
        canViewResume = isCollegeViewer;
      } else if (resumePriv === 'Private') {
        canViewResume = false;
      }
    }

    if (!canViewResume) {
      return res.status(403).json({
        success: false,
        message: 'Access to this student\'s resume is restricted by their privacy settings.',
        resumePrivacy: resumePriv,
      });
    }

    if (!profile.resumeFileUrl) {
      return res.status(404).json({ success: false, message: 'No resume uploaded for this student profile.' });
    }

    return res.json({
      success: true,
      resume: {
        fileUrl: profile.resumeFileUrl,
        fileType: profile.resumeFileType || 'pdf',
        originalName: profile.resumeOriginalName || 'Resume',
        uploadedAt: profile.resumeUploadedAt || profile.updatedAt,
        coverUrl: profile.resumeCoverUrl,
      },
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

import { Request, Response } from 'express';
import { Connection, Follow, College, StudentProfile, Notification, OrganizerProfile, User } from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

export async function toggleCollegeConnection(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { collegeId } = req.body;
    if (!collegeId) return res.status(400).json({ success: false, message: 'College ID required' });

    const studentProfile = await StudentProfile.findOne({ userId: user._id });
    if (!studentProfile) return res.status(400).json({ success: false, message: 'Student profile required to connect' });

    const existing = await Connection.findOne({ studentId: studentProfile._id, collegeId });
    if (existing) {
      // Disconnect
      await Connection.deleteOne({ _id: existing._id });
      const newCount = await Connection.countDocuments({ collegeId });
      await College.updateOne({ _id: collegeId }, { $set: { connectionsCount: newCount } });
      const newStudentCount = await Connection.countDocuments({ studentId: studentProfile._id });
      await StudentProfile.updateOne({ _id: studentProfile._id }, { $set: { connectionsCount: newStudentCount } });
      return res.json({ success: true, connected: false, connectionsCount: newCount, message: 'Connection removed' });
    } else {
      // Connect
      await Connection.create({ studentId: studentProfile._id, collegeId });
      const newCount = await Connection.countDocuments({ collegeId });
      await College.updateOne({ _id: collegeId }, { $set: { connectionsCount: newCount } });
      const newStudentCount = await Connection.countDocuments({ studentId: studentProfile._id });
      await StudentProfile.updateOne({ _id: studentProfile._id }, { $set: { connectionsCount: newStudentCount } });
      return res.json({ success: true, connected: true, connectionsCount: newCount, message: 'Connected to college' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function checkCollegeConnection(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.json({ success: true, connected: false });

    const { collegeId } = req.params;
    const studentProfile = await StudentProfile.findOne({ userId: user._id });
    if (!studentProfile) return res.json({ success: true, connected: false });

    const existing = await Connection.findOne({ studentId: studentProfile._id, collegeId });
    return res.json({ success: true, connected: !!existing });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function toggleFollowStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const targetId = req.body.targetStudentId || req.body.targetOrganizerId || req.body.targetId;
    if (!targetId) return res.status(400).json({ success: false, message: 'Target profile ID required' });

    const myProfile = await StudentProfile.findOne({ userId: user._id });
    const myFollowerId = myProfile ? myProfile._id : user._id;

    // Check if target is an Organizer
    const targetOrg = await OrganizerProfile.findOne({
      $or: [{ _id: targetId }, { userId: targetId }],
    });

    if (targetOrg) {
      if (targetOrg.userId === user._id) {
        return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
      }

      const existingFollow = await Follow.findOne({
        followerStudentId: myFollowerId,
        followingOrganizerId: targetOrg._id,
      });

      if (existingFollow) {
        // Unfollow organizer
        await Follow.deleteOne({ _id: existingFollow._id });
        const curFollowers = Math.max(0, (targetOrg.followersCount || 1) - 1);
        await OrganizerProfile.updateOne({ _id: targetOrg._id }, { $set: { followersCount: curFollowers } });
        if (myProfile) {
          await StudentProfile.updateOne({ _id: myProfile._id }, { $inc: { followingCount: -1 } });
        }
        return res.json({ success: true, following: false, followersCount: curFollowers, message: 'Unfollowed organizer' });
      } else {
        // Follow organizer
        await Follow.create({
          followerStudentId: myFollowerId,
          followerUserId: user._id,
          followingOrganizerId: targetOrg._id,
          targetType: 'Organizer',
        });
        const curFollowers = (targetOrg.followersCount || 0) + 1;
        await OrganizerProfile.updateOne({ _id: targetOrg._id }, { $set: { followersCount: curFollowers } });
        if (myProfile) {
          await StudentProfile.updateOne({ _id: myProfile._id }, { $inc: { followingCount: 1 } });
        }

        await Notification.create({
          recipientUserId: targetOrg.userId,
          type: 'EVENT_UPDATE',
          title: 'New Organizer Follower',
          message: `${myProfile?.fullName || user.fullName} started following your organization.`,
          link: myProfile ? `/student/profile/${myProfile._id}` : `/home`,
          read: false,
        });

        return res.json({ success: true, following: true, followersCount: curFollowers, message: 'Following organizer' });
      }
    }

    // Standard Student follow
    if (!myProfile) return res.status(400).json({ success: false, message: 'Student profile required' });

    if (myProfile._id === targetId) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
    }

    const existing = await Follow.findOne({
      followerStudentId: myProfile._id,
      followingStudentId: targetId,
    });

    if (existing) {
      // Unfollow
      await Follow.deleteOne({ _id: existing._id });
      await StudentProfile.updateOne({ _id: targetId }, { $inc: { followersCount: -1 } });
      await StudentProfile.updateOne({ _id: myProfile._id }, { $inc: { followingCount: -1 } });
      const updatedTarget = await StudentProfile.findById(targetId);
      return res.json({
        success: true,
        following: false,
        followersCount: updatedTarget?.followersCount ?? 0,
        message: 'Unfollowed student',
      });
    } else {
      // Follow
      await Follow.create({
        followerStudentId: myProfile._id,
        followerUserId: user._id,
        followingStudentId: targetId,
        targetType: 'Student',
      });
      await StudentProfile.updateOne({ _id: targetId }, { $inc: { followersCount: 1 } });
      await StudentProfile.updateOne({ _id: myProfile._id }, { $inc: { followingCount: 1 } });

      const targetProfile = await StudentProfile.findById(targetId);
      if (targetProfile) {
        await Notification.create({
          recipientUserId: targetProfile.userId,
          type: 'EVENT_UPDATE',
          title: 'New Follower',
          message: `${myProfile.fullName} started following your profile.`,
          link: `/student/profile/${myProfile._id}`,
          read: false,
        });
      }

      return res.json({
        success: true,
        following: true,
        followersCount: targetProfile?.followersCount ?? 1,
        message: 'Following student',
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function checkFollowStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.json({ success: true, following: false });

    const targetId = req.params.targetStudentId || req.params.targetId;
    const myProfile = await StudentProfile.findOne({ userId: user._id });
    const myFollowerId = myProfile ? myProfile._id : user._id;

    // Check organizer follow
    const existingOrgFollow = await Follow.findOne({
      followerStudentId: myFollowerId,
      $or: [{ followingOrganizerId: targetId }, { followingStudentId: targetId }],
    });

    if (existingOrgFollow) {
      return res.json({ success: true, following: true });
    }

    if (myProfile) {
      const existingStudentFollow = await Follow.findOne({
        followerStudentId: myProfile._id,
        followingStudentId: targetId,
      });
      if (existingStudentFollow) return res.json({ success: true, following: true });
    }

    return res.json({ success: true, following: false });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getStudentFollowers(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const follows = await Follow.find({
      $or: [{ followingStudentId: studentId }, { followingOrganizerId: studentId }],
    }).exec();
    const followerIds = follows.map((f) => f.followerStudentId);
    const profiles = await Promise.all(followerIds.map((id) => StudentProfile.findById(id)));

    return res.json({ success: true, followers: profiles.filter(Boolean) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getStudentFollowing(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const follows = await Follow.find({ followerStudentId: studentId }).exec();
    const followingStudentIds = follows.map((f) => f.followingStudentId).filter(Boolean);
    const followingOrgIds = follows.map((f) => f.followingOrganizerId).filter(Boolean);

    const [studentProfiles, orgProfiles] = await Promise.all([
      Promise.all(followingStudentIds.map((id) => StudentProfile.findById(id!))),
      Promise.all(followingOrgIds.map((id) => OrganizerProfile.findById(id!))),
    ]);

    return res.json({
      success: true,
      following: studentProfiles.filter(Boolean),
      followingOrganizers: orgProfiles.filter(Boolean),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getStudentConnectedColleges(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const connections = await Connection.find({ studentId }).exec();
    const collegeIds = connections.map((c) => c.collegeId);
    const colleges = await Promise.all(collegeIds.map((id) => College.findById(id)));

    return res.json({ success: true, colleges: colleges.filter(Boolean) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Requirement 4: Same-College follow feature
export async function getSameCollegeStudents(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const myProfile = await StudentProfile.findOne({ userId: user._id });
    if (!myProfile || !myProfile.collegeName) {
      return res.json({ success: true, students: [] });
    }

    const sameCollegeProfiles = await StudentProfile.find({
      collegeName: myProfile.collegeName,
    }).exec();

    // Filter out self and enrich with isFollowing
    const myFollows = await Follow.find({ followerStudentId: myProfile._id }).exec();
    const followingIds = new Set(myFollows.map((f) => f.followingStudentId));

    const enriched = sameCollegeProfiles
      .filter((p) => p._id !== myProfile._id && p.userId !== user._id)
      .map((p) => ({
        ...p,
        isFollowing: followingIds.has(p._id),
      }));

    return res.json({ success: true, students: enriched });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

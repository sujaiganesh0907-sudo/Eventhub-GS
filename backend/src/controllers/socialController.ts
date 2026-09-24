import { Request, Response } from 'express';
import { Connection, Follow, College, StudentProfile, Notification } from '../models/index';
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
      await College.updateOne({ _id: collegeId }, { $inc: { connectionsCount: -1 } });
      await StudentProfile.updateOne({ _id: studentProfile._id }, { $inc: { connectionsCount: -1 } });
      return res.json({ success: true, connected: false, message: 'Connection removed' });
    } else {
      // Connect
      await Connection.create({ studentId: studentProfile._id, collegeId });
      await College.updateOne({ _id: collegeId }, { $inc: { connectionsCount: 1 } });
      await StudentProfile.updateOne({ _id: studentProfile._id }, { $inc: { connectionsCount: 1 } });
      return res.json({ success: true, connected: true, message: 'Connected to college' });
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

    const { targetStudentId } = req.body;
    if (!targetStudentId) return res.status(400).json({ success: false, message: 'Target student ID required' });

    const myProfile = await StudentProfile.findOne({ userId: user._id });
    if (!myProfile) return res.status(400).json({ success: false, message: 'Student profile required' });

    if (myProfile._id === targetStudentId) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
    }

    const existing = await Follow.findOne({
      followerStudentId: myProfile._id,
      followingStudentId: targetStudentId,
    });

    if (existing) {
      // Unfollow
      await Follow.deleteOne({ _id: existing._id });
      await StudentProfile.updateOne({ _id: targetStudentId }, { $inc: { followersCount: -1 } });
      await StudentProfile.updateOne({ _id: myProfile._id }, { $inc: { followingCount: -1 } });
      return res.json({ success: true, following: false, message: 'Unfollowed student' });
    } else {
      // Follow
      await Follow.create({
        followerStudentId: myProfile._id,
        followingStudentId: targetStudentId,
      });
      await StudentProfile.updateOne({ _id: targetStudentId }, { $inc: { followersCount: 1 } });
      await StudentProfile.updateOne({ _id: myProfile._id }, { $inc: { followingCount: 1 } });

      const targetProfile = await StudentProfile.findById(targetStudentId);
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

      return res.json({ success: true, following: true, message: 'Following student' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function checkFollowStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.json({ success: true, following: false });

    const { targetStudentId } = req.params;
    const myProfile = await StudentProfile.findOne({ userId: user._id });
    if (!myProfile) return res.json({ success: true, following: false });

    const existing = await Follow.findOne({
      followerStudentId: myProfile._id,
      followingStudentId: targetStudentId,
    });

    return res.json({ success: true, following: !!existing });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getStudentFollowers(req: Request, res: Response) {
  try {
    const { studentId } = req.params;
    const follows = await Follow.find({ followingStudentId: studentId }).exec();
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
    const followingIds = follows.map((f) => f.followingStudentId);
    const profiles = await Promise.all(followingIds.map((id) => StudentProfile.findById(id)));

    return res.json({ success: true, following: profiles.filter(Boolean) });
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

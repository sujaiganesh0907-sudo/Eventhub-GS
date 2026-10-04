import { Response } from 'express';
import {
  Group,
  GroupMembership,
  GroupJoinRequest,
  User,
  StudentProfile,
  College,
  EventRegistration,
  Notification,
  Message,
  AdminActivityLog,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';
import { syncPersistDBNow } from '../config/db';

/**
 * 1. Create a New Group (Requirements 25, 27)
 */
export async function createGroup(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const {
      name,
      description,
      category,
      imageUrl,
      coverUrl,
      collegeId,
      eventId,
      visibility = 'Public',
      approvalRequired = false,
      verifiedOnly = false,
      maxMembers,
      permissions = {
        whoCanSendMessages: 'all',
        whoCanSendMedia: 'all',
        whoCanSendLinks: 'all',
        whoCanCreatePolls: 'all',
        whoCanInvite: 'all',
      },
      rules = [],
      moderation = {
        allowReporting: true,
        adminMessageDeletion: true,
        memberMute: true,
        memberBan: true,
      },
      notifications = {
        notifyAnnouncements: true,
        notifyMemberJoin: false,
      },
    } = req.body;

    if (!name || !description || !category) {
      return res.status(400).json({ success: false, message: 'Group Name, Description, and Category are required.' });
    }

    // Verify college access if associated with a college
    if (collegeId) {
      if (user.role === 'Student') {
        // Must belong to that college
      } else if (user.collegeId && user.collegeId !== collegeId) {
        return res.status(403).json({ success: false, message: 'You do not have administrative access to this college.' });
      }
    }

    const group = await Group.create({
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      imageUrl: imageUrl || '',
      coverUrl: coverUrl || '',
      collegeId: collegeId || undefined,
      eventId: eventId || undefined,
      visibility,
      approvalRequired: Boolean(approvalRequired),
      verifiedOnly: Boolean(verifiedOnly),
      maxMembers: maxMembers ? Number(maxMembers) : undefined,
      permissions,
      rules: Array.isArray(rules) ? rules : [],
      moderation,
      notifications,
      ownerId: user._id,
      membersCount: 1,
    });

    // Add creator as Owner in GroupMembership
    await GroupMembership.create({
      groupId: group._id,
      userId: user._id,
      role: 'Owner',
      status: 'Active',
      joinedAt: new Date().toISOString(),
    });

    syncPersistDBNow();

    return res.status(201).json({
      success: true,
      message: 'Group created successfully!',
      group,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 2. Get Groups (My Groups & Discover)
 */
export async function getGroups(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    const { category, eventId, collegeId, myGroups } = req.query;

    let userMemberships: any[] = [];
    if (user) {
      userMemberships = await GroupMembership.find({ userId: user._id, status: 'Active' }).exec();
    }
    const myGroupIds = new Set(userMemberships.map((m) => m.groupId));

    let groups = await Group.find().sort({ createdAt: -1 }).exec();

    if (myGroups === 'true') {
      groups = groups.filter((g) => myGroupIds.has(g._id));
    } else {
      // Filter out Invite Only or Event Participants Only unless user is a member or registered
      groups = groups.filter((g) => {
        if (myGroupIds.has(g._id)) return true;
        if (g.visibility === 'Public' || g.visibility === 'Private') return true;
        return false;
      });
    }

    if (category) {
      groups = groups.filter((g) => g.category.toLowerCase() === String(category).toLowerCase());
    }

    if (eventId) {
      groups = groups.filter((g) => g.eventId === eventId);
    }

    if (collegeId) {
      groups = groups.filter((g) => g.collegeId === collegeId);
    }

    const mapped = groups.map((g) => {
      const mem = userMemberships.find((m) => m.groupId === g._id);
      return {
        ...((g as any).toObject ? (g as any).toObject() : g),
        isMember: Boolean(mem),
        myRole: mem ? mem.role : null,
      };
    });

    return res.json({ success: true, count: mapped.length, groups: mapped });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 3. Get Group Details & Permissions
 */
export async function getGroupById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    let membership = null;
    let pendingRequest = null;

    if (user) {
      membership = await GroupMembership.findOne({ groupId: id, userId: user._id });
      if (!membership) {
        pendingRequest = await GroupJoinRequest.findOne({ groupId: id, userId: user._id, status: 'Pending' });
      }
    }

    // Access check: If Private or Event Participants Only and not member, check if registered
    let canJoin = true;
    let requiresRegistration = false;

    if (group.visibility === 'Event Participants Only' && group.eventId && user) {
      const reg = await EventRegistration.findOne({
        eventId: group.eventId,
        studentUserId: user._id,
        status: 'Confirmed',
      });
      if (!reg) {
        canJoin = false;
        requiresRegistration = true;
      }
    }

    const membersCount = await GroupMembership.countDocuments({ groupId: id, status: 'Active' });

    return res.json({
      success: true,
      group: {
        ...((group as any).toObject ? (group as any).toObject() : group),
        membersCount,
      },
      membership,
      pendingRequest: Boolean(pendingRequest),
      canJoin,
      requiresRegistration,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 4. Invite Members to Group (Requirement 8, 28)
 * Respects "Who can add me to a group?" privacy setting.
 */
export async function inviteMembers(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const { userIds } = req.body;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const senderMembership = await GroupMembership.findOne({ groupId: id, userId: user._id, status: 'Active' });
    if (!senderMembership || (senderMembership.role !== 'Owner' && senderMembership.role !== 'Admin' && group.permissions.whoCanInvite !== 'all')) {
      return res.status(403).json({ success: false, message: 'You do not have permission to invite members to this group.' });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one user ID must be provided.' });
    }

    const invited: string[] = [];
    const blocked: { userId: string; reason: string }[] = [];

    for (const targetUserId of userIds) {
      // Check existing membership
      const existing = await GroupMembership.findOne({ groupId: id, userId: targetUserId });
      if (existing) continue;

      // Check user privacy settings (Requirement 8)
      const targetProfile = await StudentProfile.findOne({ userId: targetUserId });
      if (targetProfile && targetProfile.groupPrivacy) {
        if (targetProfile.groupPrivacy === 'Nobody') {
          blocked.push({ userId: targetUserId, reason: 'User does not accept group invitations.' });
          continue;
        }
        if (targetProfile.groupPrivacy === 'Same college only') {
          const inviterProfile = await StudentProfile.findOne({ userId: user._id });
          if (!inviterProfile || inviterProfile.collegeName !== targetProfile.collegeName) {
            blocked.push({ userId: targetUserId, reason: 'User only accepts group invitations from students of the same college.' });
            continue;
          }
        }
      }

      invited.push(targetUserId);

      // Create notification
      await Notification.create({
        recipientUserId: targetUserId,
        type: 'ADMIN_INVITE',
        title: 'Group Invitation',
        message: `${user.fullName} invited you to join the group "${group.name}".`,
        link: `/messages?group=${group._id}`,
        metadata: { groupId: group._id, invitedBy: user._id },
        read: false,
      });
    }

    syncPersistDBNow();

    return res.json({
      success: true,
      message: `Invitations sent to ${invited.length} user(s).`,
      invitedCount: invited.length,
      blocked,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 5. Join or Request to Join Group (Requirements 29, 30, 32)
 */
export async function joinGroup(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    // Check if already active or banned
    const existing = await GroupMembership.findOne({ groupId: id, userId: user._id });
    if (existing) {
      if (existing.status === 'Banned') {
        return res.status(403).json({ success: false, message: 'You have been banned from this group.' });
      }
      return res.status(200).json({ success: true, message: 'You are already a member of this group.', membership: existing });
    }

    // Check Event Participants Only condition (Requirement 30)
    if (group.visibility === 'Event Participants Only' && group.eventId) {
      const reg = await EventRegistration.findOne({
        eventId: group.eventId,
        studentUserId: user._id,
        status: 'Confirmed',
      });
      if (!reg) {
        return res.status(403).json({
          success: false,
          message: 'Only confirmed participants of this event are eligible to join this group.',
        });
      }
    }

    // Check capacity
    const currentCount = await GroupMembership.countDocuments({ groupId: id, status: 'Active' });
    if (group.maxMembers && currentCount >= group.maxMembers) {
      return res.status(400).json({ success: false, message: 'This group has reached its maximum member capacity.' });
    }

    // If approval required, create join request
    if (group.approvalRequired) {
      const existingReq = await GroupJoinRequest.findOne({ groupId: id, userId: user._id, status: 'Pending' });
      if (existingReq) {
        return res.json({ success: true, message: 'Join request already submitted and pending admin review.' });
      }

      const reqDoc = await GroupJoinRequest.create({
        groupId: id,
        userId: user._id,
        status: 'Pending',
      });

      // Notify owner & admins
      await Notification.create({
        recipientUserId: group.ownerId,
        type: 'ADMIN_ACTION',
        title: 'New Group Join Request',
        message: `${user.fullName} requested to join "${group.name}".`,
        link: `/messages?group=${group._id}`,
        read: false,
      });

      syncPersistDBNow();

      return res.json({
        success: true,
        message: 'Join request submitted! An administrator will review your request.',
        request: reqDoc,
      });
    }

    // Direct join
    const membership = await GroupMembership.create({
      groupId: id,
      userId: user._id,
      role: 'Member',
      status: 'Active',
      joinedAt: new Date().toISOString(),
    });

    await Group.findByIdAndUpdate(id, { $inc: { membersCount: 1 } });
    syncPersistDBNow();

    return res.json({
      success: true,
      message: `You joined "${group.name}"!`,
      membership,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 6. Review Join Request (Approve / Reject) (Requirement 29)
 */
export async function reviewJoinRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id, requestId } = req.params;
    const { action } = req.body; // 'approve' | 'reject'

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    // Reviewer must be Owner, Admin, or Moderator
    const reviewerMembership = await GroupMembership.findOne({ groupId: id, userId: user._id, status: 'Active' });
    if (!reviewerMembership || (reviewerMembership.role !== 'Owner' && reviewerMembership.role !== 'Admin')) {
      return res.status(403).json({ success: false, message: 'Only Group Owners or Admins can review join requests.' });
    }

    const requestDoc = await GroupJoinRequest.findById(requestId);
    if (!requestDoc || requestDoc.groupId !== id) {
      return res.status(404).json({ success: false, message: 'Join request not found.' });
    }

    if (action === 'approve') {
      await GroupJoinRequest.findByIdAndUpdate(requestId, {
        status: 'Approved',
        reviewedBy: user._id,
        reviewedAt: new Date().toISOString(),
      });

      // Add to memberships
      await GroupMembership.create({
        groupId: id,
        userId: requestDoc.userId,
        role: 'Member',
        status: 'Active',
        joinedAt: new Date().toISOString(),
      });

      await Group.findByIdAndUpdate(id, { $inc: { membersCount: 1 } });

      // Notify the requester
      await Notification.create({
        recipientUserId: requestDoc.userId,
        type: 'ADMIN_ACTION',
        title: 'Group Request Approved!',
        message: `Your request to join "${group.name}" has been approved!`,
        link: `/messages?group=${group._id}`,
        read: false,
      });

      syncPersistDBNow();

      return res.json({ success: true, message: 'Member approved and added to group.' });
    } else {
      await GroupJoinRequest.findByIdAndUpdate(requestId, {
        status: 'Rejected',
        reviewedBy: user._id,
        reviewedAt: new Date().toISOString(),
      });

      syncPersistDBNow();

      return res.json({ success: true, message: 'Join request rejected.' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 7. Get Group Members
 */
export async function getGroupMembers(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const memberships = await GroupMembership.find({ groupId: id, status: 'Active' }).sort({ role: 1 }).exec();

    const result = [];
    for (const m of memberships) {
      const u = await User.findById(m.userId);
      const p = await StudentProfile.findOne({ userId: m.userId });
      result.push({
        _id: m._id,
        userId: m.userId,
        role: m.role,
        status: m.status,
        mutedUntil: m.mutedUntil,
        joinedAt: m.joinedAt,
        fullName: u?.fullName || p?.fullName || 'User',
        email: u?.email || p?.email,
        username: p?.username,
        avatar: p?.profilePhoto,
        collegeName: p?.collegeName,
      });
    }

    return res.json({ success: true, members: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 8. Moderate Member (Mute, Unmute, Ban, Remove, Promote, Demote) (Requirement 26, 36)
 */
export async function moderateMember(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id, memberUserId } = req.params;
    const { action, role: targetRole, durationMinutes } = req.body;
    // actions: 'mute' | 'unmute' | 'remove' | 'ban' | 'unban' | 'set-role'

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const actor = await GroupMembership.findOne({ groupId: id, userId: user._id, status: 'Active' });
    if (!actor || (actor.role !== 'Owner' && actor.role !== 'Admin' && actor.role !== 'Moderator')) {
      return res.status(403).json({ success: false, message: 'Unauthorized: insufficient group moderation permissions.' });
    }

    const target = await GroupMembership.findOne({ groupId: id, userId: memberUserId });
    if (!target) return res.status(404).json({ success: false, message: 'Target member not found in group.' });

    // Role hierarchy rules:
    // Owner can do anything to Admin, Moderator, Member.
    // Admin can only moderate Moderator or Member (not Owner or other Admins).
    // Moderator can only mute/delete messages of Member.
    if (target.role === 'Owner') {
      return res.status(403).json({ success: false, message: 'Cannot moderate the group Owner.' });
    }
    if (actor.role === 'Admin' && target.role === 'Admin' && actor.userId !== group.ownerId) {
      return res.status(403).json({ success: false, message: 'Admins cannot moderate other Admins.' });
    }
    if (actor.role === 'Moderator' && (target.role === 'Admin' || target.role === 'Moderator')) {
      return res.status(403).json({ success: false, message: 'Moderators can only moderate general members.' });
    }

    if (action === 'mute') {
      const minutes = durationMinutes ? Number(durationMinutes) : 60;
      const mutedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      await GroupMembership.findByIdAndUpdate(target._id, { mutedUntil });
      syncPersistDBNow();
      return res.json({ success: true, message: `Member muted for ${minutes} minutes.` });
    }

    if (action === 'unmute') {
      await GroupMembership.findByIdAndUpdate(target._id, { mutedUntil: undefined });
      syncPersistDBNow();
      return res.json({ success: true, message: 'Member unmuted.' });
    }

    if (action === 'ban') {
      await GroupMembership.findByIdAndUpdate(target._id, { status: 'Banned' });
      await Group.findByIdAndUpdate(id, { $inc: { membersCount: -1 } });
      syncPersistDBNow();
      return res.json({ success: true, message: 'Member banned from group.' });
    }

    if (action === 'remove') {
      await GroupMembership.findByIdAndDelete(target._id);
      await Group.findByIdAndUpdate(id, { $inc: { membersCount: -1 } });
      syncPersistDBNow();
      return res.json({ success: true, message: 'Member removed from group.' });
    }

    if (action === 'set-role') {
      if (actor.role !== 'Owner') {
        return res.status(403).json({ success: false, message: 'Only the Group Owner can promote or demote members.' });
      }
      if (!['Admin', 'Moderator', 'Member'].includes(targetRole)) {
        return res.status(400).json({ success: false, message: 'Invalid role specified.' });
      }
      await GroupMembership.findByIdAndUpdate(target._id, { role: targetRole });
      syncPersistDBNow();
      return res.json({ success: true, message: `Member role updated to ${targetRole}.` });
    }

    return res.status(400).json({ success: false, message: 'Invalid moderation action.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 9. Leave Group
 */
export async function leaveGroup(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const membership = await GroupMembership.findOne({ groupId: id, userId: user._id });
    if (!membership) return res.status(404).json({ success: false, message: 'You are not a member of this group.' });

    if (membership.role === 'Owner') {
      return res.status(400).json({
        success: false,
        message: 'The Owner cannot leave the group. Please transfer ownership or delete the group.',
      });
    }

    await GroupMembership.findByIdAndDelete(membership._id);
    await Group.findByIdAndUpdate(id, { $inc: { membersCount: -1 } });
    syncPersistDBNow();

    return res.json({ success: true, message: 'You have left the group.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 10. Delete Group (Requirement 35)
 */
export async function deleteGroup(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    if (group.ownerId !== user._id) {
      return res.status(403).json({ success: false, message: 'Only the Group Owner can delete this group.' });
    }

    await Group.findByIdAndDelete(id);
    // Delete memberships
    const memberships = await GroupMembership.find({ groupId: id }).exec();
    for (const m of memberships) {
      await GroupMembership.findByIdAndDelete(m._id);
    }

    syncPersistDBNow();

    return res.json({ success: true, message: 'Group deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 11. Post Group Announcement (Requirement 34)
 */
export async function postGroupAnnouncement(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const { title, content } = req.body;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const membership = await GroupMembership.findOne({ groupId: id, userId: user._id, status: 'Active' });
    if (!membership || (membership.role !== 'Owner' && membership.role !== 'Admin')) {
      return res.status(403).json({ success: false, message: 'Only Owners or Admins can post announcements.' });
    }

    const text = title ? `📢 [ANNOUNCEMENT] ${title}\n\n${content}` : `📢 [ANNOUNCEMENT]\n\n${content}`;

    const msg = await Message.create({
      conversationId: `group_${id}`,
      groupId: id,
      senderId: user._id,
      senderName: user.fullName,
      senderRole: user.role,
      isAnnouncement: true,
      isPinned: true,
      text,
      readBy: [user._id],
      deletedFor: [],
    });

    // Notify all active members
    if (group.notifications?.notifyAnnouncements) {
      const members = await GroupMembership.find({ groupId: id, status: 'Active' }).exec();
      for (const m of members) {
        if (m.userId !== user._id) {
          await Notification.create({
            recipientUserId: m.userId,
            type: 'ADMIN_ACTION',
            title: `Announcement: ${group.name}`,
            message: title || content.slice(0, 80),
            link: `/messages?group=${group._id}`,
            read: false,
          });
        }
      }
    }

    syncPersistDBNow();

    return res.status(201).json({
      success: true,
      message: 'Announcement posted successfully.',
      announcement: msg,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

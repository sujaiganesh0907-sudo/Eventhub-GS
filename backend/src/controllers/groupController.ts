import { Response } from 'express';
import {
  Group,
  GroupMembership,
  GroupJoinRequest,
  User,
  StudentProfile,
  College,
  Event,
  EventRegistration,
  Notification,
  Message,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';
import { checkGroupAddPermission } from '../services/groupPrivacyService';
import {
  canManageEventGroup,
  syncEventRegistrationsToGroup,
} from '../services/eventGroupService';

/**
 * 1. Create a New Group (Part 5A: Custom Groups, Part 5C: Event Groups)
 */
export async function createGroup(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const {
      name,
      description,
      category = 'General',
      type = 'Custom',
      imageUrl,
      coverUrl,
      collegeId,
      eventId,
      hostCollegeId,
      visibility = 'Public',
      groupPrivacy = 'Everyone',
      approvalRequired = false,
      verifiedOnly = false,
      maxMembers,
      rules = [],
      reuseIfExists = false,
      chatPermissions = 'Everyone',
      editPermissions = 'All Members',
      memberIds = [],
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group Name is required.' });
    }

    const determinedType = type === 'Event' || eventId ? 'Event' : 'Custom';
    let resolvedHostCollegeId = hostCollegeId || collegeId;
    let eventDoc: any = null;

    // PART 5C: Event Group Verification & Authorization
    if (determinedType === 'Event' && eventId) {
      eventDoc = await Event.findById(eventId);
      if (!eventDoc) {
        return res.status(404).json({ success: false, message: 'Associated event not found.' });
      }

      resolvedHostCollegeId = resolvedHostCollegeId || eventDoc.hostCollegeId;

      // Check authorization (College Super Admin, Delegated College Admin, or Event Creator)
      const authCheck = await canManageEventGroup(user._id, user.role, user.collegeId, eventDoc);
      if (!authCheck.allowed) {
        return res.status(403).json({
          success: false,
          message:
            authCheck.reason ||
            'Unauthorized. Only the host college administrator or authorized event organizer can create an Event Group.',
        });
      }

      // Prevent duplicate active Event Groups for the same event
      const existingActiveGroup = await Group.findOne({
        eventId: eventDoc._id,
        type: 'Event',
      });

      if (existingActiveGroup) {
        if (reuseIfExists) {
          return res.status(200).json({
            success: true,
            message: 'Existing event group found.',
            group: existingActiveGroup,
            reused: true,
          });
        }
        return res.status(400).json({
          success: false,
          message: 'An active group already exists for this event.',
          group: existingActiveGroup,
        });
      }
    }

    const isEventClosed = eventDoc && (eventDoc.status === 'Completed' || eventDoc.status === 'Cancelled');

    const group = await Group.create({
      name: name.trim(),
      description: (description || (eventDoc ? `Official group for ${eventDoc.title}` : '')).trim(),
      category: (category || (eventDoc ? eventDoc.category : 'General')).trim(),
      type: determinedType,
      imageUrl: imageUrl || (eventDoc ? eventDoc.poster : '') || '',
      coverUrl: coverUrl || '',
      collegeId: collegeId || resolvedHostCollegeId || undefined,
      eventId: eventId || undefined,
      hostCollegeId: resolvedHostCollegeId || undefined,
      visibility: determinedType === 'Event' ? (visibility || 'Event Participants Only') : visibility,
      groupPrivacy,
      approvalRequired: determinedType === 'Event' ? false : Boolean(approvalRequired),
      verifiedOnly: Boolean(verifiedOnly),
      maxMembers: maxMembers ? Number(maxMembers) : undefined,
      rules: Array.isArray(rules) ? rules : [],
      ownerId: user._id,
      membersCount: 1,
      chatPermissions,
      editPermissions,
      lifecycleStatus: isEventClosed ? eventDoc.status : 'Active',
      isReadOnly: Boolean(isEventClosed),
    });

    // Creator becomes Owner automatically in GroupMembership
    await GroupMembership.create({
      groupId: group._id,
      userId: user._id,
      role: 'Owner',
      status: 'Active',
      joinedAt: new Date().toISOString(),
    });

    // Add eligible initial members, or send invitations if privacy requires it (Requirements 2, 3, 4)
    let addedMembersCount = 0;
    const invitedMembers: any[] = [];
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      for (const mid of memberIds) {
        if (!mid || mid === user._id) continue;
        const targetUser = await User.findById(mid);
        if (!targetUser) continue;

        const perm = await checkGroupAddPermission(user._id, mid);
        if (perm.allowed) {
          await GroupMembership.create({
            groupId: group._id,
            userId: mid,
            role: 'Member',
            status: 'Active',
            addedBy: user._id,
            joinedAt: new Date().toISOString(),
          });
          addedMembersCount++;
          await Notification.create({
            recipientUserId: mid,
            type: 'ADMIN_ACTION',
            title: `Added to group "${group.name}"`,
            message: `${user.fullName} added you to the group "${group.name}".`,
            link: `/messages?group=${group._id}`,
            read: false,
          });
        } else {
          // User privacy requires invite
          const existingReq = await GroupJoinRequest.findOne({ groupId: group._id, userId: mid, status: 'Pending' });
          if (!existingReq) {
            await GroupJoinRequest.create({
              groupId: group._id,
              userId: mid,
              status: 'Pending',
              requestedAt: new Date().toISOString(),
            });
          }
          await Notification.create({
            recipientUserId: mid,
            type: 'ADMIN_ACTION',
            title: `Group Invitation: "${group.name}"`,
            message: `${user.fullName} invited you to join "${group.name}".`,
            link: `/messages?group=${group._id}`,
            read: false,
          });
          invitedMembers.push({
            userId: mid,
            name: targetUser.fullName,
            reason: perm.reason || 'User privacy requires invitation',
          });
        }
      }

      if (addedMembersCount > 0) {
        await Group.findByIdAndUpdate(group._id, { $inc: { membersCount: addedMembersCount } });
      }
    }

    // If Event Group, synchronize existing confirmed registered attendees!
    let syncedAttendees = 0;
    if (determinedType === 'Event' && eventDoc) {
      syncedAttendees = await syncEventRegistrationsToGroup(group._id, eventDoc._id);
    }

    const updatedGroup = await Group.findById(group._id);

    return res.status(201).json({
      success: true,
      message: 'Group created successfully!',
      group: updatedGroup || group,
      addedMembersCount,
      invitedCount: invitedMembers.length,
      invitedMembers,
      syncedAttendees,
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
    const { category, type, eventId, collegeId, myGroups } = req.query;

    let userMemberships: any[] = [];
    if (user) {
      userMemberships = await GroupMembership.find({ userId: user._id, status: 'Active' }).exec();
    }
    const myGroupIds = new Set(userMemberships.map((m) => m.groupId));

    let groups = await Group.find().sort({ createdAt: -1 }).exec();

    if (myGroups === 'true') {
      groups = groups.filter((g: any) => myGroupIds.has(g._id));
    } else {
      // In discover mode, exclude invite-only or private unless user is a member
      groups = groups.filter((g: any) => {
        if (myGroupIds.has(g._id)) return true;
        if (g.visibility === 'Public' || g.visibility === 'Everyone') return true;
        return false;
      });
    }

    if (type) {
      groups = groups.filter((g: any) => g.type === type);
    }

    if (category) {
      groups = groups.filter((g: any) => g.category?.toLowerCase() === String(category).toLowerCase());
    }

    if (eventId) {
      groups = groups.filter((g: any) => g.eventId === eventId);
    }

    if (collegeId) {
      groups = groups.filter((g: any) => g.collegeId === collegeId);
    }

    const mapped = groups.map((g: any) => {
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
 * 3. Get Group Details & Permissions (Requirement 11)
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
      membership = await GroupMembership.findOne({ groupId: id, userId: user._id, status: 'Active' });
      if (!membership) {
        pendingRequest = await GroupJoinRequest.findOne({ groupId: id, userId: user._id, status: 'Pending' });
      }
    }

    const membersCount = await GroupMembership.countDocuments({ groupId: id, status: 'Active' });
    const owner = await User.findById(group.ownerId);

    return res.json({
      success: true,
      group: {
        ...((group as any).toObject ? (group as any).toObject() : group),
        membersCount,
        owner: owner
          ? {
              _id: owner._id,
              fullName: owner.fullName,
              role: owner.role,
            }
          : null,
      },
      membership,
      currentUserRole: membership ? membership.role : null,
      pendingRequest: Boolean(pendingRequest),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 4. Add Member Directly (Requirements 4, 5, 6)
 * Validates requester role (Owner/Admin), target existence, privacy, and duplicate prevention.
 */
export async function addMember(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const { targetUserId, role = 'Member' } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'targetUserId is required.' });
    }

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    // Requester must be active Owner or Admin of the group (Requirement 6)
    const requesterMem = await GroupMembership.findOne({
      groupId: id,
      userId: user._id,
      status: 'Active',
    });
    if (!requesterMem || (requesterMem.role !== 'Owner' && requesterMem.role !== 'Admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only the Group Owner or Admins can add members directly.',
      });
    }

    // Target must exist
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user does not exist.' });
    }

    // Check duplicate membership (Requirement 5)
    const existingMem = await GroupMembership.findOne({
      groupId: id,
      userId: targetUserId,
      status: 'Active',
    });
    if (existingMem) {
      return res.status(400).json({
        success: false,
        message: 'This user is already an active member of this group.',
      });
    }

    // Check group add privacy (Requirement 4)
    const privacyCheck = await checkGroupAddPermission(user._id, targetUserId);
    if (!privacyCheck.allowed) {
      if (req.body.inviteIfBlocked) {
        const existingReq = await GroupJoinRequest.findOne({ groupId: id, userId: targetUserId, status: 'Pending' });
        if (!existingReq) {
          await GroupJoinRequest.create({
            groupId: id,
            userId: targetUserId,
            status: 'Pending',
            requestedAt: new Date().toISOString(),
          });
        }
        await Notification.create({
          recipientUserId: targetUserId,
          type: 'ADMIN_INVITE',
          title: `Group Invitation: "${group.name}"`,
          message: `${user.fullName} invited you to join "${group.name}".`,
          link: `/messages?group=${group._id}`,
          read: false,
        });
        return res.status(200).json({
          success: true,
          invited: true,
          message: `Invite sent to ${targetUser.fullName}. Their privacy settings require an invitation.`,
        });
      }

      return res.status(403).json({
        success: false,
        message: privacyCheck.reason || 'User privacy settings do not allow direct group addition.',
        canInvite: true,
      });
    }

    // Create active membership
    const newMembership = await GroupMembership.create({
      groupId: id,
      userId: targetUserId,
      role: role === 'Admin' && requesterMem.role === 'Owner' ? 'Admin' : 'Member',
      status: 'Active',
      addedBy: user._id,
      joinedAt: new Date().toISOString(),
    });

    // Update group members count
    await Group.findByIdAndUpdate(id, { $inc: { membersCount: 1 } });

    // Notify target user
    await Notification.create({
      recipientUserId: targetUserId,
      type: 'ADMIN_INVITE',
      title: 'Added to Group',
      message: `${user.fullName} added you to the group "${group.name}".`,
      link: `/messages?group=${group._id}`,
      read: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Member added successfully.',
      membership: newMembership,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 5. Request to Join Group or Join Directly (Requirement 7)
 */
export async function joinGroup(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    // Check existing active membership (Requirement 5)
    const existing = await GroupMembership.findOne({ groupId: id, userId: user._id, status: 'Active' });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You are already an active member of this group.',
        membership: existing,
      });
    }

    // PART 5C: Event Group Join Logic (Registration-based access)
    if (group.type === 'Event' && group.eventId) {
      const eventDoc = await Event.findById(group.eventId);
      const reg = await EventRegistration.findOne({
        eventId: group.eventId,
        studentUserId: user._id,
        status: 'Confirmed',
      });

      const isHostStaff = user.collegeId && eventDoc && user.collegeId === eventDoc.hostCollegeId;
      const isCreator = eventDoc && eventDoc.creatorUserId === user._id;

      if (!reg && !isHostStaff && !isCreator) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You must have a confirmed registration for this event to join this Event Group.',
        });
      }

      // If registered or staff, direct join without join-request review
      const membership = await GroupMembership.create({
        groupId: id,
        userId: user._id,
        role: isHostStaff || isCreator ? 'Admin' : 'Member',
        status: 'Active',
        joinedAt: new Date().toISOString(),
      });

      await Group.findByIdAndUpdate(id, { $inc: { membersCount: 1 } });

      return res.status(201).json({
        success: true,
        message: `You joined "${group.name}"!`,
        membership,
      });
    }

    // If approval required or group is private, create join request
    if (group.approvalRequired || group.visibility === 'Private' || group.groupPrivacy === 'Nobody / Private') {
      const existingReq = await GroupJoinRequest.findOne({
        groupId: id,
        userId: user._id,
        status: 'Pending',
      });
      if (existingReq) {
        return res.status(400).json({
          success: false,
          message: 'Join request already submitted and pending admin review.',
        });
      }

      const reqDoc = await GroupJoinRequest.create({
        groupId: id,
        userId: user._id,
        status: 'Pending',
        requestedAt: new Date().toISOString(),
      });

      // Notify owner
      await Notification.create({
        recipientUserId: group.ownerId,
        type: 'ADMIN_ACTION',
        title: 'New Group Join Request',
        message: `${user.fullName} requested to join "${group.name}".`,
        link: `/messages?group=${group._id}`,
        read: false,
      });

      return res.status(201).json({
        success: true,
        message: 'Join request submitted! An administrator will review your request.',
        request: reqDoc,
      });
    }

    // Direct join for open groups
    const membership = await GroupMembership.create({
      groupId: id,
      userId: user._id,
      role: 'Member',
      status: 'Active',
      joinedAt: new Date().toISOString(),
    });

    await Group.findByIdAndUpdate(id, { $inc: { membersCount: 1 } });

    return res.status(201).json({
      success: true,
      message: `You joined "${group.name}"!`,
      membership,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 6. Get Pending Join Requests (Requirement 7)
 */
export async function getJoinRequests(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const membership = await GroupMembership.findOne({ groupId: id, userId: user._id, status: 'Active' });
    if (!membership || (membership.role !== 'Owner' && membership.role !== 'Admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only Group Owners or Admins can view join requests.',
      });
    }

    const requests = await GroupJoinRequest.find({ groupId: id, status: 'Pending' }).exec();
    const enriched = await Promise.all(
      requests.map(async (r) => {
        const u = await User.findById(r.userId);
        const p = await StudentProfile.findOne({ userId: r.userId });
        return {
          ...((r as any).toObject ? (r as any).toObject() : r),
          user: {
            _id: r.userId,
            fullName: u?.fullName || p?.fullName || 'User',
            username: p?.username,
            avatar: p?.profilePhoto,
            collegeName: p?.collegeName,
          },
        };
      })
    );

    return res.json({ success: true, requests: enriched });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 7. Review Join Request (Approve / Reject) (Requirement 7)
 */
export async function reviewJoinRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id, requestId } = req.params;
    const { action } = req.body; // 'approve' | 'reject'

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const reviewerMembership = await GroupMembership.findOne({
      groupId: id,
      userId: user._id,
      status: 'Active',
    });
    if (!reviewerMembership || (reviewerMembership.role !== 'Owner' && reviewerMembership.role !== 'Admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only Group Owners or Admins can review join requests.',
      });
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

      // Prevent duplicate membership
      const existing = await GroupMembership.findOne({
        groupId: id,
        userId: requestDoc.userId,
        status: 'Active',
      });

      let membership = existing;
      if (!existing) {
        membership = await GroupMembership.create({
          groupId: id,
          userId: requestDoc.userId,
          role: 'Member',
          status: 'Active',
          joinedAt: new Date().toISOString(),
        });
        await Group.findByIdAndUpdate(id, { $inc: { membersCount: 1 } });
      }

      await Notification.create({
        recipientUserId: requestDoc.userId,
        type: 'ADMIN_ACTION',
        title: 'Group Request Approved!',
        message: `Your request to join "${group.name}" has been approved!`,
        link: `/messages?group=${group._id}`,
        read: false,
      });

      return res.json({ success: true, message: 'Member approved and added to group.', membership });
    } else {
      await GroupJoinRequest.findByIdAndUpdate(requestId, {
        status: 'Rejected',
        reviewedBy: user._id,
        reviewedAt: new Date().toISOString(),
      });

      return res.json({ success: true, message: 'Join request rejected.' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 8. Remove Member (Requirement 8)
 * Rules:
 * - Owner can remove Admin / Member
 * - Admin can remove Member only
 * - Admin cannot remove Owner (403)
 * - Member cannot remove others (403)
 */
export async function removeMember(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id, memberUserId } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const actorMembership = await GroupMembership.findOne({
      groupId: id,
      userId: user._id,
      status: 'Active',
    });
    if (!actorMembership || (actorMembership.role !== 'Owner' && actorMembership.role !== 'Admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only the Group Owner or Admins can remove members.',
      });
    }

    const targetMembership = await GroupMembership.findOne({
      groupId: id,
      userId: memberUserId,
      status: 'Active',
    });
    if (!targetMembership) {
      return res.status(404).json({ success: false, message: 'Target member not found in group.' });
    }

    // REQUIREMENT 8: Cannot remove Owner
    if (targetMembership.role === 'Owner') {
      return res.status(403).json({ success: false, message: 'Cannot remove the Group Owner.' });
    }

    // REQUIREMENT 8: Admin cannot remove another Admin
    if (actorMembership.role === 'Admin' && targetMembership.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admins cannot remove other Admins. Only the Owner can remove an Admin.',
      });
    }

    // Remove target member
    await GroupMembership.findByIdAndDelete(targetMembership._id);
    await Group.findByIdAndUpdate(id, { $inc: { membersCount: -1 } });

    return res.json({ success: true, message: 'Member removed from group.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 9. Promote / Demote Member (Requirement 9)
 * Owner can: Member -> Admin, Admin -> Member
 */
export async function updateMemberRole(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id, memberUserId } = req.params;
    const { role: newRole } = req.body;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    // REQUIREMENT 9: Only the Group Owner can promote or demote members
    const actorMembership = await GroupMembership.findOne({
      groupId: id,
      userId: user._id,
      status: 'Active',
    });
    if (!actorMembership || actorMembership.role !== 'Owner') {
      return res.status(403).json({
        success: false,
        message: 'Only the Group Owner can promote or demote members.',
      });
    }

    const targetMembership = await GroupMembership.findOne({
      groupId: id,
      userId: memberUserId,
      status: 'Active',
    });
    if (!targetMembership) {
      return res.status(404).json({ success: false, message: 'Target member not found in group.' });
    }

    if (targetMembership.role === 'Owner') {
      return res.status(400).json({ success: false, message: 'Cannot change the role of the Group Owner.' });
    }

    if (!['Admin', 'Member'].includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified. Supported roles are 'Admin' and 'Member'.",
      });
    }

    await GroupMembership.findByIdAndUpdate(targetMembership._id, { role: newRole });

    return res.json({
      success: true,
      message: `Member role updated to ${newRole}.`,
      role: newRole,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 10. Transfer Group Ownership (Requirement 5, 10)
 */
export async function transferOwnership(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const { newOwnerUserId } = req.body;

    if (!newOwnerUserId) {
      return res.status(400).json({ success: false, message: 'newOwnerUserId is required.' });
    }

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    if (group.ownerId !== user._id) {
      return res.status(403).json({
        success: false,
        message: 'Only the current Group Owner can transfer ownership.',
      });
    }

    const targetMembership = await GroupMembership.findOne({
      groupId: id,
      userId: newOwnerUserId,
      status: 'Active',
    });
    if (!targetMembership) {
      return res.status(400).json({
        success: false,
        message: 'New owner must be an active member of the group.',
      });
    }

    // Update group ownerId
    await Group.findByIdAndUpdate(id, { ownerId: newOwnerUserId });

    // Promote target to Owner
    await GroupMembership.findByIdAndUpdate(targetMembership._id, { role: 'Owner' });

    // Demote current user to Admin
    const currentMem = await GroupMembership.findOne({
      groupId: id,
      userId: user._id,
      status: 'Active',
    });
    if (currentMem) {
      await GroupMembership.findByIdAndUpdate(currentMem._id, { role: 'Admin' });
    }

    return res.json({ success: true, message: 'Ownership transferred successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 11. Leave Group (Requirement 10)
 * Owner cannot leave without transferring ownership or deleting the group.
 */
export async function leaveGroup(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const membership = await GroupMembership.findOne({
      groupId: id,
      userId: user._id,
      status: 'Active',
    });
    if (!membership) {
      return res.status(404).json({ success: false, message: 'You are not an active member of this group.' });
    }

    // REQUIREMENT 10: Owner cannot leave without transferring ownership
    if (membership.role === 'Owner') {
      return res.status(400).json({
        success: false,
        message: 'The Owner cannot leave the group without transferring ownership or deleting the group.',
      });
    }

    await GroupMembership.findByIdAndDelete(membership._id);
    await Group.findByIdAndUpdate(id, { $inc: { membersCount: -1 } });

    return res.json({ success: true, message: 'You have left the group.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 12. Get Group Members (Requirement 11)
 */
export async function getGroupMembers(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const memberships = await GroupMembership.find({ groupId: id, status: 'Active' })
      .sort({ role: 1 })
      .exec();

    const result = [];
    for (const m of memberships) {
      const u = await User.findById(m.userId);
      const p = await StudentProfile.findOne({ userId: m.userId });
      result.push({
        _id: m._id,
        userId: m.userId,
        role: m.role,
        status: m.status,
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
 * 13. Update Group Details & Permissions (Requirement 6, 12)
 */
export async function updateGroup(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const membership = await GroupMembership.findOne({ groupId: id, userId: user._id, status: 'Active' });
    if (!membership) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const isOwner = group.ownerId === user._id || membership.role === 'Owner';
    const isAdmin = membership.role === 'Admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only group owners or admins can edit group settings.' });
    }

    // If editPermissions is Admins Only, and requester is not Owner/Admin
    if (group.editPermissions === 'Admins Only' && !isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only group administrators can modify group details.' });
    }

    const {
      name,
      description,
      imageUrl,
      coverUrl,
      category,
      visibility,
      groupPrivacy,
      chatPermissions,
      editPermissions,
      approvalRequired,
    } = req.body;

    const updateFields: any = {};
    if (name && name.trim()) updateFields.name = name.trim();
    if (description !== undefined) updateFields.description = description.trim();
    if (imageUrl !== undefined) updateFields.imageUrl = imageUrl;
    if (coverUrl !== undefined) updateFields.coverUrl = coverUrl;
    if (category !== undefined) updateFields.category = category;
    if (visibility !== undefined) updateFields.visibility = visibility;
    if (groupPrivacy !== undefined) updateFields.groupPrivacy = groupPrivacy;
    if (chatPermissions !== undefined) updateFields.chatPermissions = chatPermissions;
    if (editPermissions !== undefined) updateFields.editPermissions = editPermissions;
    if (approvalRequired !== undefined) updateFields.approvalRequired = Boolean(approvalRequired);

    await Group.findByIdAndUpdate(id, updateFields);
    const updated = await Group.findById(id);

    return res.json({
      success: true,
      message: 'Group updated successfully!',
      group: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 14. Delete Group
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

    // Delete memberships & join requests
    const memberships = await GroupMembership.find({ groupId: id }).exec();
    for (const m of memberships) {
      await GroupMembership.findByIdAndDelete(m._id);
    }
    const requests = await GroupJoinRequest.find({ groupId: id }).exec();
    for (const r of requests) {
      await GroupJoinRequest.findByIdAndDelete(r._id);
    }

    return res.json({ success: true, message: 'Group deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 15. Get Group Messages (Part 5B: Group chat access & ordering, Part 6: Event card enrichment)
 */
export async function getGroupMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    // REQUIREMENT 2: Only active members can read group chat
    const membership = await GroupMembership.findOne({
      groupId: id,
      userId: user._id,
      status: 'Active',
    });
    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only active group members can view messages.',
      });
    }

    // PART 5C: For Event Groups, verify regular members still have a Confirmed registration
    if (group.type === 'Event' && group.eventId && membership.role === 'Member') {
      const reg = await EventRegistration.findOne({
        eventId: group.eventId,
        studentUserId: user._id,
        status: 'Confirmed',
      });
      if (!reg) {
        await GroupMembership.findByIdAndDelete(membership._id);
        await Group.findByIdAndUpdate(id, { $inc: { membersCount: -1 } });
        return res.status(403).json({
          success: false,
          message: 'Access revoked. Active confirmed registration required to access this Event Group.',
        });
      }
    }

    // REQUIREMENT 5: Oldest at top, newest at bottom (sort: 1)
    const allMessages = await Message.find({ groupId: id }).sort({ createdAt: 1 }).exec();

    // REQUIREMENT 6: Filter out messages deleted for current user
    const visibleMessages = allMessages.filter(
      (m) =>
        (!m.deletedFor || !m.deletedFor.includes(user._id)) &&
        (!m.deletedForUserIds || !m.deletedForUserIds.includes(user._id))
    );

    // Sanitize and enrich messages
    const sanitizedMessages = await Promise.all(
      visibleMessages.map(async (m: any) => {
        if (m.deletedForEveryone) {
          return {
            ...(m.toObject ? m.toObject() : m),
            text: 'This message was deleted',
            attachmentUrl: undefined,
            attachmentType: undefined,
            sharedEvent: null,
          };
        }

        let sharedEvent = null;
        if (m.sharedEventId) {
          const ev = await Event.findById(m.sharedEventId);
          if (ev) {
            sharedEvent = {
              _id: ev._id,
              title: ev.title,
              poster: ev.poster || ev.hostCollegeLogo,
              hostCollegeName: ev.hostCollegeName,
              eventDate: ev.eventDate,
              startTime: ev.startTime,
              endTime: ev.endTime,
              eventMode: ev.eventMode,
              venue: ev.venue || ev.meetingPlatform,
              isFree: ev.isFree,
              registrationFee: ev.registrationFee,
              registrationDeadline: ev.registrationDeadline,
              status: ev.status,
            };
          }
        }

        return {
          ...(m.toObject ? m.toObject() : m),
          sharedEvent,
        };
      })
    );

    const pinnedMessages = sanitizedMessages.filter((m: any) => m.isPinned && !m.deletedForEveryone);

    return res.json({
      success: true,
      messages: sanitizedMessages,
      pinnedMessages,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 16. Send Group Message (Part 5B: Announcement & Group notifications, Part 6: Event sharing & Chat permissions)
 */
export async function sendGroupMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const { text = '', attachmentUrl, attachmentType, isAnnouncement, sharedEventId } = req.body;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    // REQUIREMENT 2: Only active members can send messages
    const membership = await GroupMembership.findOne({
      groupId: id,
      userId: user._id,
      status: 'Active',
    });
    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only active group members can send messages.',
      });
    }

    if (membership.mutedUntil && new Date(membership.mutedUntil) > new Date()) {
      return res.status(403).json({
        success: false,
        message: 'You are temporarily muted from sending messages in this group.',
      });
    }

    // REQUIREMENT 12: Chat permission check (Admins Only)
    if (group.chatPermissions === 'Admins Only') {
      if (membership.role !== 'Owner' && membership.role !== 'Admin') {
        return res.status(403).json({
          success: false,
          message: 'Only group administrators can send messages in this group.',
        });
      }
    }

    // PART 5C: Event Group Lifecycle & Access Validation
    if (group.type === 'Event') {
      // If group is completed, cancelled or read-only: regular members cannot send messages
      if (group.isReadOnly || group.lifecycleStatus === 'Completed' || group.lifecycleStatus === 'Cancelled') {
        if (membership.role !== 'Owner' && membership.role !== 'Admin') {
          return res.status(403).json({
            success: false,
            message: `This event group is closed because the event is ${group.lifecycleStatus || 'Completed'}. New messages cannot be sent.`,
          });
        }
      }

      // Check registration for regular student members
      if (membership.role === 'Member' && group.eventId) {
        const reg = await EventRegistration.findOne({
          eventId: group.eventId,
          studentUserId: user._id,
          status: 'Confirmed',
        });
        if (!reg) {
          await GroupMembership.findByIdAndDelete(membership._id);
          await Group.findByIdAndUpdate(id, { $inc: { membersCount: -1 } });
          return res.status(403).json({
            success: false,
            message: 'Access revoked. Active confirmed registration required to send messages in this Event Group.',
          });
        }
      }
    }

    // REQUIREMENT 8: Only Owner or Admin may create announcement messages
    if (isAnnouncement && membership.role !== 'Owner' && membership.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only Group Owners and Admins can post announcements.',
      });
    }

    // Reject empty message (allow if attachment or sharedEventId is present)
    if (!text.trim() && !attachmentUrl && !sharedEventId) {
      return res.status(400).json({
        success: false,
        message: 'Message content, attachment, or shared event is required.',
      });
    }

    const profile = await StudentProfile.findOne({ userId: user._id });
    const senderName = profile?.fullName || user.fullName;
    const senderAvatar = profile?.profilePhoto || undefined;

    const message = await Message.create({
      conversationId: `group_${id}`,
      groupId: id,
      senderId: user._id,
      senderName,
      senderRole: membership.role,
      senderAvatar,
      text: text.trim(),
      attachmentUrl: attachmentUrl || undefined,
      attachmentType: attachmentType || (attachmentUrl ? 'image' : undefined),
      sharedEventId: sharedEventId || undefined,
      isAnnouncement: Boolean(isAnnouncement),
      isPinned: false,
      readBy: [user._id],
      deletedFor: [],
      deletedForUserIds: [],
      deletedForEveryone: false,
    });

    // Update group activity
    await Group.findByIdAndUpdate(id, { updatedAt: new Date().toISOString() });

    // REQUIREMENT 11: Notify active members except sender
    const activeMembers = await GroupMembership.find({
      groupId: id,
      status: 'Active',
    }).exec();

    const preview = text.trim() || (sharedEventId ? 'Shared an event' : 'Sent an attachment');
    for (const mem of activeMembers) {
      if (mem.userId !== user._id) {
        await Notification.create({
          recipientUserId: mem.userId,
          type: isAnnouncement ? 'ADMIN_ACTION' : 'EVENT_UPDATE',
          title: isAnnouncement ? `📢 Announcement in ${group.name}` : `New message in ${group.name}`,
          message: preview.length > 70 ? preview.slice(0, 67) + '...' : preview,
          link: `/messages?group=${id}`,
          read: false,
          metadata: { groupId: id, senderId: user._id, isAnnouncement: Boolean(isAnnouncement) },
        });
      }
    }

    // Return message enriched with event if sharedEventId present
    let enrichedEvent = null;
    if (sharedEventId) {
      const ev = await Event.findById(sharedEventId);
      if (ev) {
        enrichedEvent = {
          _id: ev._id,
          title: ev.title,
          poster: ev.poster || ev.hostCollegeLogo,
          hostCollegeName: ev.hostCollegeName,
          eventDate: ev.eventDate,
          startTime: ev.startTime,
          endTime: ev.endTime,
          eventMode: ev.eventMode,
          venue: ev.venue || ev.meetingPlatform,
          isFree: ev.isFree,
          registrationFee: ev.registrationFee,
          registrationDeadline: ev.registrationDeadline,
          status: ev.status,
        };
      }
    }

    return res.status(201).json({
      success: true,
      message: {
        ...(message.toObject ? message.toObject() : message),
        sharedEvent: enrichedEvent,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 16. Pin / Unpin Group Message (Part 5B: Pinned messages)
 */
export async function togglePinGroupMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id, messageId } = req.params;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    // REQUIREMENT 9: Owner/Admin may pin/unpin message. Member cannot pin/unpin.
    const membership = await GroupMembership.findOne({
      groupId: id,
      userId: user._id,
      status: 'Active',
    });
    if (!membership || (membership.role !== 'Owner' && membership.role !== 'Admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only Group Owners or Admins can pin/unpin messages.',
      });
    }

    const targetMsg = await Message.findById(messageId);
    if (!targetMsg || targetMsg.groupId !== id) {
      return res.status(404).json({ success: false, message: 'Message not found in this group.' });
    }

    const newPinState = req.body.pinned !== undefined ? Boolean(req.body.pinned) : !targetMsg.isPinned;
    await Message.findByIdAndUpdate(messageId, { isPinned: newPinState });

    return res.json({
      success: true,
      isPinned: newPinState,
      message: newPinState ? 'Message pinned to group.' : 'Message unpinned.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 17. Get Event Group by Event ID (Part 5C)
 */
export async function getGroupByEventId(req: AuthenticatedRequest, res: Response) {
  try {
    const { eventId } = req.params;
    const user = req.user;

    const group = await Group.findOne({ eventId, type: 'Event' });
    if (!group) {
      return res.json({ success: true, hasGroup: false, group: null });
    }

    let membership = null;
    let registration = null;
    if (user) {
      membership = await GroupMembership.findOne({ groupId: group._id, userId: user._id, status: 'Active' });
      registration = await EventRegistration.findOne({ eventId, studentUserId: user._id });
    }

    return res.json({
      success: true,
      hasGroup: true,
      group: {
        ...((group as any).toObject ? (group as any).toObject() : group),
        isMember: Boolean(membership),
        myRole: membership ? membership.role : null,
      },
      membership,
      isRegistered: registration ? registration.status === 'Confirmed' : false,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

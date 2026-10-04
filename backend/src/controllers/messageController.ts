import { Response } from 'express';
import {
  Conversation,
  Message,
  ConversationPreference,
  User,
  StudentProfile,
  College,
  Event,
  Follow,
  Connection,
  Notification,
  CollegeAdminMembership,
  IConversationParticipant,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Helper to get clean participant display details
 */
async function getParticipantDetails(userId: string, activeCollegeId?: string): Promise<IConversationParticipant | null> {
  const user = await User.findById(userId);
  if (!user) return null;

  const collegeIdToUse = activeCollegeId || user.collegeId;

  if (collegeIdToUse) {
    const college = await College.findById(collegeIdToUse);
    if (college) {
      const membership = await CollegeAdminMembership.findOne({
        collegeId: collegeIdToUse,
        userId,
        status: 'Active',
      });
      if (membership || user.role === 'College Super Admin' || user.collegeId === collegeIdToUse) {
        return {
          userId,
          role: (membership?.role || user.role) as any,
          name: college.name,
          username: college.username || undefined,
          avatar: college.logo || '',
          collegeId: college._id,
        };
      }
    }
  }

  if (user.role === 'Student') {
    const profile = await StudentProfile.findOne({ userId });
    return {
      userId,
      role: user.role,
      name: profile?.fullName || user.fullName,
      username: profile?.username || undefined,
      avatar: profile?.profilePhoto || '',
    };
  } else {
    const college = user.collegeId ? await College.findById(user.collegeId) : null;
    return {
      userId,
      role: user.role,
      name: college?.name || user.fullName,
      username: college?.username || undefined,
      avatar: college?.logo || '',
      collegeId: college?._id,
    };
  }
}

/**
 * Helper to verify manageMessages permission for college admin actions (Requirement 14)
 */
export async function checkManageMessagesPermission(user: any, collegeId: string): Promise<boolean> {
  if (!user || !collegeId) return false;
  if (user.role === 'College Super Admin' && user.collegeId === collegeId) return true;
  const membership = await CollegeAdminMembership.findOne({
    collegeId,
    userId: user._id,
    status: 'Active',
  });
  if (!membership) return false;
  if (membership.role === 'College Super Admin') return true;
  const perms = membership.permissions || [];
  return perms.includes('manageMessages') || perms.includes('ALL_PERMISSIONS');
}

/**
 * Validate message privacy permission between sender and receiver
 */
async function checkMessagePermission(senderUserId: string, targetUserId: string): Promise<{ allowed: boolean; reason?: string }> {
  if (senderUserId === targetUserId) {
    return { allowed: true };
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) return { allowed: false, reason: 'Target user does not exist.' };

  const senderUser = await User.findById(senderUserId);
  if (!senderUser) return { allowed: false, reason: 'Sender user does not exist.' };

  if (targetUser.role === 'Student') {
    const targetProfile = await StudentProfile.findOne({ userId: targetUserId });
    const privacy = targetProfile?.messagePrivacy || 'Everyone';

    if (privacy === 'Nobody') {
      return { allowed: false, reason: `${targetProfile?.fullName || 'This user'} does not accept direct messages.` };
    }

    if (privacy === 'Connections only' || privacy === 'Connections') {
      const senderProfile = await StudentProfile.findOne({ userId: senderUserId });
      if (!senderProfile) {
        return { allowed: false, reason: 'This user only accepts messages from connections.' };
      }
      // Check mutual connection (mutual follow or connection)
      const [followsThem, theyFollow] = await Promise.all([
        Follow.findOne({ followerStudentId: senderProfile._id, followingStudentId: targetProfile?._id }),
        Follow.findOne({ followerStudentId: targetProfile?._id, followingStudentId: senderProfile._id }),
      ]);
      if (!followsThem || !theyFollow) {
        return { allowed: false, reason: `${targetProfile?.fullName || 'This user'} only accepts messages from mutual connections.` };
      }
    }

    if (privacy === 'Same college only') {
      const senderProfile = await StudentProfile.findOne({ userId: senderUserId });
      const sameCollege =
        (senderProfile?.collegeName && targetProfile?.collegeName && senderProfile.collegeName.toLowerCase().trim() === targetProfile.collegeName.toLowerCase().trim()) ||
        (senderUser.collegeId && targetProfile?.targetCollegeId === senderUser.collegeId);

      if (!sameCollege) {
        return { allowed: false, reason: `${targetProfile?.fullName || 'This user'} only accepts messages from students or faculty of the same college.` };
      }
    }

    if (privacy === 'Following') {
      // Target must be following the sender
      const senderProfile = await StudentProfile.findOne({ userId: senderUserId });
      if (!senderProfile) {
        return { allowed: false, reason: 'This student only accepts messages from students they follow.' };
      }
      const isFollowing = await Follow.findOne({
        followerStudentId: targetProfile?._id,
        followingStudentId: senderProfile._id,
      });
      if (!isFollowing) {
        return { allowed: false, reason: `${targetProfile?.fullName || 'This user'} only accepts messages from people they follow.` };
      }
    }
  } else {
    // Target is College
    const college = targetUser.collegeId ? await College.findById(targetUser.collegeId) : null;
    const privacy = college?.messagePrivacy || 'Everyone';

    if (privacy === 'Nobody') {
      return { allowed: false, reason: `${college?.name || 'This college'} does not accept direct messages at this time.` };
    }

    if (privacy === 'Connected') {
      const senderProfile = await StudentProfile.findOne({ userId: senderUserId });
      if (senderProfile && college) {
        const isConnected = await Connection.findOne({
          studentId: senderProfile._id,
          collegeId: college._id,
        });
        if (!isConnected) {
          return { allowed: false, reason: `You must be connected to ${college.name} to send messages.` };
        }
      }
    }
  }

  return { allowed: true };
}

/**
 * GET /api/messages/conversations
 * Supports personal student conversations or separate College Admin Workspace Inbox (Requirements 14, 15)
 */
export async function getConversations(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { asCollegeId } = req.query;
    const activeCollegeId =
      typeof asCollegeId === 'string' && asCollegeId.trim()
        ? asCollegeId.trim()
        : (req.headers['x-college-id'] as string) || undefined;

    let userConvs: any[] = [];
    const allConvs = await Conversation.find().sort({ updatedAt: -1 }).exec();

    if (activeCollegeId && (user.role === 'College Super Admin' || user.collegeId === activeCollegeId || req.query.asCollegeId)) {
      // 1. Verify manageMessages permission for college workspace (Requirement 14)
      const hasPerm = await checkManageMessagesPermission(user, activeCollegeId);
      if (!hasPerm) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You lack the 'manageMessages' permission for this college.",
        });
      }

      const college = await College.findById(activeCollegeId);
      const superAdminId = college?.superAdminId;

      // College Workspace Inbox: filter conversations for this college specifically
      userConvs = allConvs.filter(
        (c) =>
          c.collegeId === activeCollegeId ||
          (superAdminId && c.participants && c.participants.includes(superAdminId))
      );
    } else {
      // 2. Personal Student / User Inbox: separate from collegiate administration
      userConvs = allConvs.filter(
        (c) => c.participants && c.participants.includes(user._id) && !c.collegeId
      );
    }

    // Get preferences
    const preferences = await ConversationPreference.find({ userId: user._id }).exec();
    const prefMap = new Map(preferences.map((p) => [p.conversationId, p]));

    const enriched = await Promise.all(
      userConvs
        .filter((c) => {
          const pref = prefMap.get(c._id);
          return !pref || !pref.hidden;
        })
        .map(async (c) => {
          const pref = prefMap.get(c._id);
          const otherParticipantIds = c.participants.filter((p: string) => p !== user._id);
          const otherId = otherParticipantIds[0] || user._id;

          // Fresh details for other participant
          const otherDetails = await getParticipantDetails(otherId);

          // Calculate unread count for current user
          const unreadCount = await Message.countDocuments({
            conversationId: c._id,
            senderId: { $ne: user._id },
            readBy: { $nin: [user._id] },
            deletedFor: { $nin: [user._id] },
          });

          return {
            ...c,
            otherParticipant: otherDetails,
            unreadCount,
            isMuted: pref?.muted || false,
          };
        })
    );

    return res.json({ success: true, conversations: enriched });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/messages/conversations
 * Start or get existing conversation with a target user (Requirements 15, 17)
 */
export async function startOrGetConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { targetUserId, targetStudentId, targetCollegeId, asCollegeId } = req.body;
    let actualTargetUserId = targetUserId;

    // Robust resolution: targetStudentId might be studentProfile._id, or studentProfile.userId, or user._id
    if (!actualTargetUserId && targetStudentId) {
      let sp = await StudentProfile.findById(targetStudentId);
      if (!sp) {
        sp = await StudentProfile.findOne({
          $or: [{ userId: targetStudentId }, { id: targetStudentId }, { _id: targetStudentId }],
        });
      }
      if (sp) {
        actualTargetUserId = sp.userId;
      } else {
        const u = await User.findById(targetStudentId);
        if (u) actualTargetUserId = u._id;
      }
    } else if (!actualTargetUserId && targetCollegeId) {
      const col = await College.findById(targetCollegeId);
      if (col) {
        if (col.superAdminId) {
          actualTargetUserId = col.superAdminId;
        } else {
          const superAdminMem = await CollegeAdminMembership.findOne({
            collegeId: col._id,
            role: 'College Super Admin',
          });
          if (superAdminMem) actualTargetUserId = superAdminMem.userId;
        }
      }
    }

    if (!actualTargetUserId) {
      return res.status(400).json({ success: false, message: 'Target user ID could not be resolved.' });
    }

    if (actualTargetUserId === user._id) {
      return res.status(400).json({ success: false, message: 'Cannot start a conversation with yourself.' });
    }

    // Verify manageMessages permission if starting conversation on behalf of a college workspace
    if (asCollegeId) {
      const hasPerm = await checkManageMessagesPermission(user, asCollegeId);
      if (!hasPerm) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You lack the 'manageMessages' permission for this college.",
        });
      }
    }

    // Check message privacy permissions
    const permission = await checkMessagePermission(user._id, actualTargetUserId);
    if (!permission.allowed) {
      return res.status(403).json({ success: false, message: permission.reason });
    }

    // Check if conversation already exists
    const allConvs = await Conversation.find().exec();
    let existing = allConvs.find(
      (c) =>
        c.participants &&
        c.participants.length === 2 &&
        c.participants.includes(user._id) &&
        c.participants.includes(actualTargetUserId) &&
        (!asCollegeId || c.collegeId === asCollegeId)
    );

    if (existing) {
      // Unhide if previously hidden
      await ConversationPreference.updateOne(
        { userId: user._id, conversationId: existing._id },
        { $set: { hidden: false } }
      );

      const otherDetails = await getParticipantDetails(actualTargetUserId);
      return res.json({
        success: true,
        conversation: {
          ...existing,
          otherParticipant: otherDetails,
        },
      });
    }

    // Create new conversation
    const [meDetails, otherDetails] = await Promise.all([
      getParticipantDetails(user._id, asCollegeId),
      getParticipantDetails(actualTargetUserId),
    ]);

    const newConv = await Conversation.create({
      collegeId: asCollegeId || undefined,
      participants: [user._id, actualTargetUserId],
      participantDetails: [meDetails!, otherDetails!].filter(Boolean),
      lastMessage: undefined,
    });

    return res.status(201).json({
      success: true,
      conversation: {
        ...newConv,
        otherParticipant: otherDetails,
        unreadCount: 0,
        isMuted: false,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/messages/conversations/:id
 * Load messages and mark unread messages as read
 */
export async function getConversationMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const conv = await Conversation.findById(id);
    if (!conv || !conv.participants.includes(user._id)) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const allMessages = await Message.find({ conversationId: id })
      .sort({ createdAt: 1 })
      .exec();

    // Filter out messages deleted by this user
    const visibleMessages = allMessages.filter(
      (m) => !m.deletedFor || !m.deletedFor.includes(user._id)
    );

    // Mark unread messages as read by current user
    const nowIso = new Date().toISOString();
    for (const msg of visibleMessages) {
      if (msg.senderId !== user._id && (!msg.readBy || !msg.readBy.includes(user._id))) {
        msg.readBy = [...(msg.readBy || []), user._id];
        msg.seenAt = nowIso;
        await Message.findByIdAndUpdate(msg._id, { readBy: msg.readBy, seenAt: msg.seenAt });
      }
    }

    // Enrich shared cards with fresh live entity data
    const enrichedMessages = await Promise.all(
      visibleMessages.map(async (m) => {
        let sharedEvent = null;
        let sharedStudent = null;
        let sharedCollege = null;

        if (m.sharedEventId) {
          const ev = await Event.findById(m.sharedEventId);
          if (ev) {
            sharedEvent = {
              _id: ev._id,
              title: ev.title,
              poster: ev.poster || ev.hostCollegeLogo,
              hostCollegeName: ev.hostCollegeName,
              eventDate: ev.eventDate,
              isFree: ev.isFree,
              registrationFee: ev.registrationFee,
              category: ev.category,
            };
          }
        }

        if (m.sharedStudentId) {
          const st = await StudentProfile.findById(m.sharedStudentId);
          if (st) {
            sharedStudent = {
              _id: st._id,
              userId: st.userId,
              fullName: st.fullName,
              username: st.username,
              profilePhoto: st.profilePhoto,
              collegeName: st.collegeName,
            };
          }
        }

        if (m.sharedCollegeId) {
          const col = await College.findById(m.sharedCollegeId);
          if (col) {
            sharedCollege = {
              _id: col._id,
              name: col.name,
              username: col.username,
              logo: col.logo,
              location: col.location,
              verificationStatus: col.verificationStatus,
            };
          }
        }

        return {
          ...m,
          sharedEvent,
          sharedStudent,
          sharedCollege,
        };
      })
    );

    const otherId = conv.participants.find((p) => p !== user._id) || user._id;
    const otherDetails = await getParticipantDetails(otherId);

    const pref = await ConversationPreference.findOne({ userId: user._id, conversationId: id });

    return res.json({
      success: true,
      conversation: {
        ...conv,
        otherParticipant: otherDetails,
        isMuted: pref?.muted || false,
      },
      messages: enrichedMessages,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/messages/conversations/:id
 * Send a message
 */
export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const {
      text = '',
      attachmentUrl,
      attachmentType,
      sharedEventId,
      sharedStudentId,
      sharedCollegeId,
    } = req.body;

    if (!text.trim() && !attachmentUrl && !sharedEventId && !sharedStudentId && !sharedCollegeId) {
      return res.status(400).json({ success: false, message: 'Message content or attachment is required.' });
    }

    const conv = await Conversation.findById(id);
    if (!conv || !conv.participants.includes(user._id)) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const otherParticipantId = conv.participants.find((p) => p !== user._id);
    if (otherParticipantId) {
      const permission = await checkMessagePermission(user._id, otherParticipantId);
      if (!permission.allowed) {
        return res.status(403).json({ success: false, message: permission.reason });
      }
    }

    // Determine sender name & role (College identity if messaging in college workspace/context)
    const activeCollegeId =
      (req.headers['x-college-id'] as string) ||
      req.body?.asCollegeId ||
      conv.collegeId ||
      undefined;

    if (activeCollegeId) {
      const hasPerm = await checkManageMessagesPermission(user, activeCollegeId);
      if (!hasPerm) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You lack the 'manageMessages' permission for this college.",
        });
      }
    }

    const senderDetails = await getParticipantDetails(user._id, activeCollegeId);
    const senderName = senderDetails?.name || user.fullName;
    const senderRole = senderDetails?.role || user.role;

    const senderAvatar = senderDetails?.avatar || undefined;
    const isSendingAsCollege = Boolean(senderDetails?.collegeId);

    const message = await Message.create({
      conversationId: id,
      senderId: user._id,
      senderName,
      senderRole,
      senderAvatar,
      collegeId: senderDetails?.collegeId || undefined,
      sentByAdminId: isSendingAsCollege ? user._id : undefined,
      text: text.trim(),
      attachmentUrl: attachmentUrl || undefined,
      attachmentType: attachmentType || (attachmentUrl ? 'image' : undefined),
      sharedEventId: sharedEventId || undefined,
      sharedStudentId: sharedStudentId || undefined,
      sharedCollegeId: sharedCollegeId || undefined,
      readBy: [user._id],
      deletedFor: [],
      deletedForEveryone: false,
    });

    // Update conversation lastMessage & unhide for all
    let previewText = text.trim();
    if (!previewText) {
      if (sharedEventId) previewText = 'Shared an event';
      else if (sharedStudentId) previewText = 'Shared a student profile';
      else if (sharedCollegeId) previewText = 'Shared a college profile';
      else if (attachmentUrl) previewText = 'Sent an attachment';
    }

    await Conversation.findByIdAndUpdate(id, {
      lastMessage: {
        text: previewText,
        senderId: user._id,
        timestamp: new Date().toISOString(),
      },
    });

    // Unhide conversation for receiver
    if (otherParticipantId) {
      await ConversationPreference.updateOne(
        { userId: otherParticipantId, conversationId: id },
        { $set: { hidden: false } }
      );

      // Check if recipient muted conversation
      const recipientPref = await ConversationPreference.findOne({
        userId: otherParticipantId,
        conversationId: id,
      });

      if (!recipientPref || !recipientPref.muted) {
        await Notification.create({
          recipientUserId: otherParticipantId,
          type: 'EVENT_UPDATE',
          title: `New message from ${senderName}`,
          message: previewText.length > 60 ? previewText.slice(0, 57) + '...' : previewText,
          link: `/messages?conversationId=${id}`,
          read: false,
          metadata: { conversationId: id, senderId: user._id },
        });
      }
    }

    return res.status(201).json({ success: true, message });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * DELETE /api/messages/:id
 * Delete a message
 */
export async function deleteMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const { forEveryone } = req.query;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });

    const isForEveryone = forEveryone === 'true' || (forEveryone as any) === true;
    if (isForEveryone) {
      if (message.senderId !== user._id) {
        return res.status(403).json({ success: false, message: 'You can only delete your own messages for everyone.' });
      }

      await Message.findByIdAndUpdate(id, {
        deletedForEveryone: true,
        text: 'This message was deleted.',
        attachmentUrl: undefined,
        sharedEventId: undefined,
        sharedStudentId: undefined,
        sharedCollegeId: undefined,
      });

      return res.json({ success: true, message: 'Message deleted for everyone.' });
    } else {
      const deletedFor = [...(message.deletedFor || []), user._id];
      await Message.findByIdAndUpdate(id, { deletedFor });
      return res.json({ success: true, message: 'Message removed from your view.' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * DELETE /api/messages/conversations/:id
 * Remove / hide conversation for current user
 */
export async function deleteConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const conv = await Conversation.findById(id);
    if (!conv || !conv.participants.includes(user._id)) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const existingPref = await ConversationPreference.findOne({ userId: user._id, conversationId: id });
    if (existingPref) {
      await ConversationPreference.findByIdAndUpdate(existingPref._id, { hidden: true });
    } else {
      await ConversationPreference.create({
        userId: user._id,
        conversationId: id,
        muted: false,
        hidden: true,
      });
    }

    return res.json({ success: true, message: 'Conversation removed from your inbox.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/messages/conversations/:id/mute
 * Toggle mute / unmute
 */
export async function toggleMuteConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const conv = await Conversation.findById(id);
    if (!conv || !conv.participants.includes(user._id)) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const existingPref = await ConversationPreference.findOne({ userId: user._id, conversationId: id });
    let newMuted = true;

    if (existingPref) {
      newMuted = !existingPref.muted;
      await ConversationPreference.findByIdAndUpdate(existingPref._id, { muted: newMuted });
    } else {
      await ConversationPreference.create({
        userId: user._id,
        conversationId: id,
        muted: true,
        hidden: false,
      });
    }

    return res.json({
      success: true,
      isMuted: newMuted,
      message: newMuted ? 'Conversation notifications muted.' : 'Conversation notifications unmuted.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/messages/unread-count
 * Returns total number of unread messages across all active non-hidden conversations
 */
export async function getUnreadMessagesCount(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const userConvs = await Conversation.find({ participants: user._id }).exec();
    const convIds = userConvs.map((c) => c._id);

    const hiddenPrefs = await ConversationPreference.find({
      userId: user._id,
      conversationId: { $in: convIds },
      hidden: true,
    }).exec();
    const hiddenIds = new Set(hiddenPrefs.map((p) => p.conversationId));
    const activeConvIds = convIds.filter((cid) => !hiddenIds.has(cid));

    if (activeConvIds.length === 0) {
      return res.json({ success: true, unreadCount: 0 });
    }

    const unreadMessages = await Message.find({
      conversationId: { $in: activeConvIds },
      senderId: { $ne: user._id },
      readBy: { $ne: user._id },
    }).exec();

    const count = unreadMessages.filter(
      (m) => !m.deletedFor || !m.deletedFor.includes(user._id)
    ).length;

    return res.json({ success: true, unreadCount: count });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}


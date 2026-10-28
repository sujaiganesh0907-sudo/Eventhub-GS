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
  GroupMembership,
  IConversationParticipant,
  OrganizerProfile,
} from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Helper to get clean participant display details
 */
export async function getParticipantDetails(
  userId: string,
  activeCollegeId?: string
): Promise<IConversationParticipant | null> {
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
  } else if (user.role === 'Organizer') {
    const profile = await OrganizerProfile.findOne({ userId });
    return {
      userId,
      role: user.role,
      name: profile?.organizationName || user.fullName,
      username: undefined,
      avatar: profile?.logo || '',
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
 * Helper to verify manageMessages permission for college admin actions (Requirements 9, 24)
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
 * Validate message privacy permission between sender and receiver (Requirements 8, 9)
 */
export async function checkMessagePermission(
  senderUserId: string,
  targetUserId: string,
  senderCollegeId?: string
): Promise<{ allowed: boolean; reason?: string }> {
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
      return {
        allowed: false,
        reason: `${targetProfile?.fullName || 'This user'} does not accept direct messages.`,
      };
    }

    if (privacy === 'Connections only' || privacy === 'Connections') {
      const senderProfile = await StudentProfile.findOne({ userId: senderUserId });
      if (!senderProfile) {
        // If sender is college, check college-student connection
        if (senderCollegeId) {
          const isConnected = await Connection.findOne({
            studentId: targetProfile?._id,
            collegeId: senderCollegeId,
          });
          if (!isConnected) {
            return {
              allowed: false,
              reason: 'This student only accepts messages from established connections.',
            };
          }
          return { allowed: true };
        }
        return { allowed: false, reason: 'This user only accepts messages from connections.' };
      }

      // Check mutual connection (mutual follow or connection)
      const [followsThem, theyFollow, directConnection] = await Promise.all([
        Follow.findOne({ followerStudentId: senderProfile._id, followingStudentId: targetProfile?._id }),
        Follow.findOne({ followerStudentId: targetProfile?._id, followingStudentId: senderProfile._id }),
        Connection.findOne({
          $or: [
            { studentId: senderProfile._id, targetStudentId: targetProfile?._id },
            { studentId: targetProfile?._id, targetStudentId: senderProfile._id },
          ],
        }),
      ]);

      if ((!followsThem || !theyFollow) && !directConnection) {
        return {
          allowed: false,
          reason: `${targetProfile?.fullName || 'This user'} only accepts messages from mutual connections.`,
        };
      }
    }

    if (privacy === 'Same college only') {
      const senderProfile = await StudentProfile.findOne({ userId: senderUserId });
      const sameCollege =
        (senderProfile?.collegeName &&
          targetProfile?.collegeName &&
          senderProfile.collegeName.toLowerCase().trim() === targetProfile.collegeName.toLowerCase().trim()) ||
        (senderUser.collegeId && targetProfile?.targetCollegeId === senderUser.collegeId) ||
        (senderCollegeId && targetProfile?.targetCollegeId === senderCollegeId);

      if (!sameCollege) {
        return {
          allowed: false,
          reason: `${targetProfile?.fullName || 'This user'} only accepts messages from students or faculty of the same college.`,
        };
      }
    }

    if (privacy === 'Following') {
      const senderProfile = await StudentProfile.findOne({ userId: senderUserId });
      if (!senderProfile) {
        return { allowed: false, reason: 'This student only accepts messages from people they follow.' };
      }
      const isFollowing = await Follow.findOne({
        followerStudentId: targetProfile?._id,
        followingStudentId: senderProfile._id,
      });
      if (!isFollowing) {
        return {
          allowed: false,
          reason: `${targetProfile?.fullName || 'This user'} only accepts messages from people they follow.`,
        };
      }
    }
  } else {
    // Target is College
    const collegeId = targetUser.collegeId;
    const college = collegeId ? await College.findById(collegeId) : null;
    const privacy = college?.messagePrivacy || 'Everyone';

    if (privacy === 'Nobody') {
      return {
        allowed: false,
        reason: `${college?.name || 'This college'} does not accept direct messages at this time.`,
      };
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
 * Supports personal student conversations or separate College Admin Workspace Inbox (Requirements 7, 9, 11, 20)
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

    if (activeCollegeId && (user.role === 'College Super Admin' || user.collegeId === activeCollegeId || asCollegeId)) {
      // 1. Verify manageMessages permission for college workspace (Requirement 9, 24)
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
      // 2. Personal Student / User Inbox: separate from collegiate administration (Requirement 7)
      userConvs = allConvs.filter(
        (c) => c.participants && c.participants.includes(user._id) && !c.collegeId
      );
    }

    // Get preferences to filter hidden conversations
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
          const otherParticipantIds = (c.participants || []).filter((p: string) => p !== user._id);
          const otherId = otherParticipantIds[0] || user._id;

          // Fresh details for other participant
          const otherDetails = await getParticipantDetails(otherId, c.collegeId);

          // Calculate unread count for current user
          const unreadCount = await Message.countDocuments({
            conversationId: c._id,
            senderId: { $ne: user._id },
            readBy: { $nin: [user._id] },
            deletedFor: { $nin: [user._id] },
            deletedForUserIds: { $nin: [user._id] },
          });

          // Accurate preview calculation (Requirement 20)
          let lastMessagePreview = c.lastMessage;
          const convMessages = await Message.find({ conversationId: c._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .exec();

          // Find the latest message visible to this user
          const latestVisible = convMessages.find(
            (m) =>
              (!m.deletedFor || !m.deletedFor.includes(user._id)) &&
              (!m.deletedForUserIds || !m.deletedForUserIds.includes(user._id))
          );

          if (latestVisible) {
            lastMessagePreview = {
              text: latestVisible.deletedForEveryone ? 'This message was deleted' : latestVisible.text || 'Attachment',
              senderId: latestVisible.senderId,
              timestamp: latestVisible.createdAt || latestVisible.updatedAt,
            };
          } else if (convMessages.length > 0 && convMessages[0].deletedForEveryone) {
            lastMessagePreview = {
              text: 'This message was deleted',
              senderId: convMessages[0].senderId,
              timestamp: convMessages[0].createdAt,
            };
          }

          return {
            ...c,
            lastMessage: lastMessagePreview,
            otherParticipant: otherDetails,
            unreadCount,
            isMuted: pref?.muted || false,
          };
        })
    );

    // Sort by most recently active conversation first (Requirement 11)
    enriched.sort((a, b) => {
      const timeA = new Date(a.lastMessage?.timestamp || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastMessage?.timestamp || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return res.json({ success: true, conversations: enriched });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/messages/conversations
 * Start or get existing conversation with a target user (Requirements 6, 23)
 */
export async function startOrGetConversation(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { targetUserId, targetStudentId, targetCollegeId, asCollegeId } = req.body;
    let actualTargetUserId = targetUserId;
    let associatedCollegeId: string | undefined = asCollegeId;

    // Resolve targetStudentId
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
        associatedCollegeId = col._id;
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
      return res.status(400).json({ success: false, message: 'Target user could not be identified.' });
    }

    // REQUIREMENT 23: Block invalid self-conversations
    if (actualTargetUserId === user._id) {
      return res.status(400).json({ success: false, message: 'Cannot start a conversation with yourself.' });
    }

    if (asCollegeId) {
      const col = await College.findById(asCollegeId);
      if (col && (col.superAdminId === actualTargetUserId || actualTargetUserId === user._id)) {
        return res.status(400).json({ success: false, message: 'Cannot start a conversation with yourself.' });
      }

      // Verify manageMessages permission
      const hasPerm = await checkManageMessagesPermission(user, asCollegeId);
      if (!hasPerm) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You lack the 'manageMessages' permission for this college.",
        });
      }
    }

    // Check message privacy permissions (Requirement 8, 9)
    const permission = await checkMessagePermission(user._id, actualTargetUserId, asCollegeId);
    if (!permission.allowed) {
      return res.status(403).json({ success: false, message: permission.reason });
    }

    // REQUIREMENT 6: Check if conversation already exists between these identities
    const allConvs = await Conversation.find().exec();
    let existing = allConvs.find((c) => {
      const hasBoth =
        c.participants &&
        c.participants.length === 2 &&
        c.participants.includes(user._id) &&
        c.participants.includes(actualTargetUserId);

      if (!hasBoth) return false;

      // In collegiate context, match collegeId
      if (asCollegeId) {
        return c.collegeId === asCollegeId;
      }
      return !c.collegeId || c.collegeId === associatedCollegeId;
    });

    if (existing) {
      // Unhide if previously hidden
      await ConversationPreference.updateOne(
        { userId: user._id, conversationId: existing._id },
        { $set: { hidden: false } }
      );

      const otherDetails = await getParticipantDetails(actualTargetUserId, existing.collegeId);
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
      getParticipantDetails(actualTargetUserId, associatedCollegeId),
    ]);

    const newConv = await Conversation.create({
      collegeId: asCollegeId || associatedCollegeId || undefined,
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
 * Load messages chronologically and mark unread messages as read (Requirements 11, 19)
 */
export async function getConversationMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const conv = await Conversation.findById(id);
    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    // Verify membership or authorized college admin access
    const isMember = conv.participants && conv.participants.includes(user._id);
    let isAuthorizedCollegeAdmin = false;
    if (!isMember && conv.collegeId) {
      isAuthorizedCollegeAdmin = await checkManageMessagesPermission(user, conv.collegeId);
    }

    if (!isMember && !isAuthorizedCollegeAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this conversation.' });
    }

    // REQUIREMENT 11: Older messages top, newest bottom (sort: 1)
    const allMessages = await Message.find({ conversationId: id })
      .sort({ createdAt: 1 })
      .exec();

    // REQUIREMENT 13: Filter out messages deleted for current user and ensure no group messages leak into direct chat
    const visibleMessages = allMessages.filter(
      (m) =>
        !m.groupId &&
        (!m.deletedFor || !m.deletedFor.includes(user._id)) &&
        (!m.deletedForUserIds || !m.deletedForUserIds.includes(user._id))
    );

    // REQUIREMENT 19: Mark unread incoming messages as read by current user
    const nowIso = new Date().toISOString();
    for (const msg of visibleMessages) {
      if (msg.senderId !== user._id && (!msg.readBy || !msg.readBy.includes(user._id))) {
        msg.readBy = [...(msg.readBy || []), user._id];
        msg.seenAt = nowIso;
        await Message.findByIdAndUpdate(msg._id, { readBy: msg.readBy, seenAt: msg.seenAt });
      }
    }

    // Enrich shared cards and ensure deleted-for-everyone content is sanitized
    const enrichedMessages = await Promise.all(
      visibleMessages.map(async (m) => {
        // REQUIREMENT 14: Never expose original content for deleted-for-everyone messages
        if (m.deletedForEveryone) {
          return {
            ...m,
            text: 'This message was deleted',
            attachmentUrl: undefined,
            attachmentType: undefined,
            sharedEvent: null,
            sharedStudent: null,
            sharedCollege: null,
          };
        }

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

    const otherId = (conv.participants || []).find((p) => p !== user._id) || user._id;
    const otherDetails = await getParticipantDetails(otherId, conv.collegeId);
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
 * Send a message (Requirements 10, 11, 12, 31)
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
    if (!conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isMember = conv.participants && conv.participants.includes(user._id);
    let isAuthorizedCollegeAdmin = false;
    if (!isMember && conv.collegeId) {
      isAuthorizedCollegeAdmin = await checkManageMessagesPermission(user, conv.collegeId);
    }

    if (!isMember && !isAuthorizedCollegeAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this conversation.' });
    }

    const otherParticipantId = (conv.participants || []).find((p) => p !== user._id);
    if (otherParticipantId) {
      const permission = await checkMessagePermission(user._id, otherParticipantId, conv.collegeId);
      if (!permission.allowed) {
        return res.status(403).json({ success: false, message: permission.reason });
      }
    }

    // Determine sender name & role
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

    // Save message with all required fields
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
      deletedForUserIds: [],
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
 * Delete a message (Delete for Me or Delete for Everyone based on query or endpoint)
 * Requirements 13, 14, 15
 */
export async function deleteMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const { forEveryone } = req.query;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });

    let isMember = false;
    let conv: any = null;

    if (message.groupId) {
      // Group Message authorization
      const groupMem = await GroupMembership.findOne({
        groupId: message.groupId,
        userId: user._id,
        status: 'Active',
      });
      if (groupMem) {
        isMember = true;
      }
    } else {
      // Direct Message authorization
      conv = await Conversation.findById(message.conversationId);
      if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found.' });

      isMember = Boolean(conv.participants && conv.participants.includes(user._id));
      if (!isMember && conv.collegeId) {
        isMember = await checkManageMessagesPermission(user, conv.collegeId);
      }
    }

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this message.' });
    }

    const isForEveryone = forEveryone === 'true' || (forEveryone as any) === true;

    if (isForEveryone) {
      // REQUIREMENT 14 & 15: Only original sender may delete for everyone
      if (message.senderId !== user._id) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own messages for everyone.',
        });
      }

      await Message.findByIdAndUpdate(id, {
        deletedForEveryone: true,
        deletedAt: new Date().toISOString(),
        deletedBy: user._id,
        text: 'This message was deleted',
        attachmentUrl: undefined,
        attachmentType: undefined,
        sharedEventId: undefined,
        sharedStudentId: undefined,
        sharedCollegeId: undefined,
      });

      // Update conversation preview if direct chat and this was the last message
      if (conv && conv.lastMessage && conv.lastMessage.timestamp === message.createdAt) {
        await Conversation.findByIdAndUpdate(conv._id, {
          lastMessage: {
            text: 'This message was deleted',
            senderId: message.senderId,
            timestamp: message.createdAt || new Date().toISOString(),
          },
        });
      }

      return res.json({ success: true, message: 'Message deleted for everyone.' });
    } else {
      // REQUIREMENT 13: Delete for Me removes/hides message ONLY for current user
      const existingDeletedFor = new Set(message.deletedFor || []);
      const existingDeletedForUserIds = new Set(message.deletedForUserIds || []);
      existingDeletedFor.add(user._id);
      existingDeletedForUserIds.add(user._id);

      await Message.findByIdAndUpdate(id, {
        deletedFor: Array.from(existingDeletedFor),
        deletedForUserIds: Array.from(existingDeletedForUserIds),
      });

      return res.json({ success: true, message: 'Message removed from your view.' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/messages/:id/delete-for-me
 * Dedicated endpoint for Delete for Me (Requirement 13)
 */
export async function deleteMessageForMe(req: AuthenticatedRequest, res: Response) {
  req.query.forEveryone = 'false';
  return deleteMessage(req, res);
}

/**
 * POST /api/messages/:id/delete-for-everyone
 * Dedicated endpoint for Delete for Everyone (Requirement 14, 15)
 */
export async function deleteMessageForEveryone(req: AuthenticatedRequest, res: Response) {
  req.query.forEveryone = 'true';
  return deleteMessage(req, res);
}

/**
 * DELETE /api/messages/conversations/:id
 * Remove / hide conversation for current user only (Requirement 17)
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
      (m) =>
        (!m.deletedFor || !m.deletedFor.includes(user._id)) &&
        (!m.deletedForUserIds || !m.deletedForUserIds.includes(user._id))
    ).length;

    return res.json({ success: true, unreadCount: count });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

import {
  Group,
  GroupMembership,
  Event,
  EventRegistration,
  CollegeAdminMembership,
  Notification,
  Message,
  User,
  StudentProfile,
  IGroup,
} from '../models/index';

/**
 * Check if a user is authorized to create/manage an Event Group for a given event.
 * Rules:
 * - College Super Admin of the host college: Allowed
 * - College Admin with 'manageEvents', 'manageGroups', or 'ALL_PERMISSIONS': Allowed
 * - Student creator of the event (when event is Published or Approved): Allowed
 * - Arbitrary users / students: Forbidden
 */
export async function canManageEventGroup(
  arg1: any,
  arg2?: any,
  arg3?: any,
  arg4?: any
): Promise<{ allowed: boolean; reason?: string; roleInGroup: 'Owner' | 'Admin' }> {
  let userId: string;
  let userRole: string;
  let userCollegeId: string | undefined;
  let event: any;

  if (typeof arg1 === 'object' && arg1 !== null && ('_id' in arg1 || 'id' in arg1)) {
    // Called as (user, eventOrEventId)
    userId = arg1._id || arg1.id;
    userRole = arg1.role;
    userCollegeId = arg1.collegeId;
    event = arg2;
  } else {
    // Called as (userId, userRole, userCollegeId, eventOrEventId)
    userId = String(arg1);
    userRole = String(arg2 || '');
    userCollegeId = arg3;
    event = arg4;
  }

  // If event is an ID or not a full document, fetch it
  if (typeof event === 'string') {
    event = await Event.findById(event);
  }

  if (!event) {
    return {
      allowed: false,
      reason: 'Associated event not found.',
      roleInGroup: 'Owner',
    };
  }

  // 1. Host College Super Admin
  if (userRole === 'College Super Admin' && userCollegeId && userCollegeId === event.hostCollegeId) {
    return { allowed: true, roleInGroup: 'Owner' };
  }

  // 2. Host College Delegated Admin
  if (userCollegeId && userCollegeId === event.hostCollegeId) {
    const adminMem = await CollegeAdminMembership.findOne({
      collegeId: event.hostCollegeId,
      userId,
      status: 'Active',
    });
    if (adminMem) {
      if (
        adminMem.role === 'College Super Admin' ||
        adminMem.permissions.includes('manageEvents') ||
        adminMem.permissions.includes('manageGroups') ||
        adminMem.permissions.includes('ALL_PERMISSIONS')
      ) {
        return { allowed: true, roleInGroup: adminMem.role === 'College Super Admin' ? 'Owner' : 'Admin' };
      }
    }
  }

  // 3. Authorized Event Creator
  if (event.creatorUserId === userId) {
    if (['Published', 'Approved', 'Completed'].includes(event.status)) {
      return { allowed: true, roleInGroup: 'Owner' };
    }
    return {
      allowed: false,
      reason: 'Event groups can only be created for approved or published events.',
      roleInGroup: 'Owner',
    };
  }

  return {
    allowed: false,
    reason: 'Only the host college administrators or the event organizer can create and manage this Event Group.',
    roleInGroup: 'Owner',
  };
}

/**
 * Synchronize all confirmed registered students into the Event Group as active Members.
 */
export async function syncEventRegistrationsToGroup(groupId: string, eventId: string): Promise<number> {
  const confirmedRegs = await EventRegistration.find({
    eventId,
    status: 'Confirmed',
  }).exec();

  const group = await Group.findById(groupId);
  if (!group) return 0;

  let addedCount = 0;
  for (const reg of confirmedRegs) {
    const existing = await GroupMembership.findOne({
      groupId,
      userId: reg.studentUserId,
      status: 'Active',
    });

    if (!existing) {
      await GroupMembership.create({
        groupId,
        userId: reg.studentUserId,
        role: 'Member',
        status: 'Active',
        joinedAt: new Date().toISOString(),
      });
      addedCount++;

      // Send notification
      await Notification.create({
        recipientUserId: reg.studentUserId,
        type: 'EVENT_UPDATE',
        title: `Joined Event Group: ${group.name}`,
        message: `You now have access to the official group chat for "${group.name}".`,
        link: `/messages?group=${groupId}`,
        read: false,
      });
    }
  }

  if (addedCount > 0) {
    await Group.findByIdAndUpdate(groupId, { $inc: { membersCount: addedCount } });
  }

  return addedCount;
}

/**
 * Add a confirmed registered student to the active Event Group.
 */
export async function addStudentToEventGroup(eventId: string, studentUserId: string): Promise<boolean> {
  const eventGroup = await Group.findOne({ eventId, type: 'Event' });
  if (!eventGroup) return false;

  const existing = await GroupMembership.findOne({
    groupId: eventGroup._id,
    userId: studentUserId,
    status: 'Active',
  });

  if (existing) return true;

  await GroupMembership.create({
    groupId: eventGroup._id,
    userId: studentUserId,
    role: 'Member',
    status: 'Active',
    joinedAt: new Date().toISOString(),
  });

  await Group.findByIdAndUpdate(eventGroup._id, { $inc: { membersCount: 1 } });

  const event = await Event.findById(eventId);
  const eventTitle = event?.title || eventGroup.name;

  await Notification.create({
    recipientUserId: studentUserId,
    type: 'EVENT_UPDATE',
    title: `Joined Event Group: ${eventTitle}`,
    message: `You've been added to the official group for "${eventTitle}". Connect with participants and organizers!`,
    link: `/messages?group=${eventGroup._id}`,
    read: false,
  });

  return true;
}

/**
 * Remove a student from the active Event Group (e.g. when registration is cancelled/rejected).
 */
export async function removeStudentFromEventGroup(eventId: string, studentUserId: string): Promise<boolean> {
  const eventGroup = await Group.findOne({ eventId, type: 'Event' });
  if (!eventGroup) return false;

  const membership = await GroupMembership.findOne({
    groupId: eventGroup._id,
    userId: studentUserId,
    status: 'Active',
  });

  if (!membership) return false;

  // Do not remove group owner or admin automatically
  if (membership.role === 'Owner' || membership.role === 'Admin') return false;

  await GroupMembership.findByIdAndDelete(membership._id);
  await Group.findByIdAndUpdate(eventGroup._id, { $inc: { membersCount: -1 } });

  const event = await Event.findById(eventId);
  const eventTitle = event?.title || eventGroup.name;

  await Notification.create({
    recipientUserId: studentUserId,
    type: 'EVENT_UPDATE',
    title: `Removed from Event Group: ${eventTitle}`,
    message: `Your registration was cancelled or revoked, so your access to "${eventTitle}" group chat has been closed.`,
    read: false,
  });

  return true;
}

/**
 * Update Event Group lifecycle when event is Completed or Cancelled.
 */
export async function updateEventGroupLifecycle(
  eventId: string,
  eventStatus: 'Completed' | 'Cancelled' | 'Published' | string
): Promise<void> {
  const eventGroup = await Group.findOne({ eventId, type: 'Event' });
  if (!eventGroup) return;

  const isClosed = eventStatus === 'Completed' || eventStatus === 'Cancelled';
  await Group.findByIdAndUpdate(eventGroup._id, {
    lifecycleStatus: eventStatus,
    isReadOnly: isClosed,
    updatedAt: new Date().toISOString(),
  });

  if (isClosed) {
    // Post system announcement in group chat
    await Message.create({
      conversationId: `group_${eventGroup._id}`,
      groupId: eventGroup._id,
      senderId: eventGroup.ownerId,
      senderName: 'System Announcement',
      senderRole: 'Owner',
      text: `📢 Notice: This event has concluded (${eventStatus}). This group is now archived and read-only.`,
      isAnnouncement: true,
      isPinned: true,
      readBy: [eventGroup.ownerId],
      deletedFor: [],
      deletedForUserIds: [],
      deletedForEveryone: false,
    });
  }
}

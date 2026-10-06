import { Response } from 'express';
import { Notification } from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Helper to build the context filter for notifications
 * Separates Student identity from College Super Admin / College Admin identity (Requirements 5, 8)
 */
function getNotificationFilterForUser(user: any) {
  if (user.role === 'Student') {
    return {
      recipientUserId: user._id,
      recipientRole: { $ne: 'College Super Admin' },
    };
  }

  // College Super Admin or College Admin
  if (user.collegeId) {
    return {
      $or: [
        { collegeId: user.collegeId },
        { recipientUserId: user._id, recipientRole: { $in: ['College Super Admin', 'College Admin'] } },
      ],
    };
  }

  return { recipientUserId: user._id };
}

export async function getUserNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const filter = getNotificationFilterForUser(user);

    const all = await Notification.find().sort({ createdAt: -1 }).limit(100).exec();
    // Filter according to active identity
    const notifications = all.filter((n) => {
      if (user.role === 'Student') {
        if (n.recipientRole === 'College Super Admin' || n.recipientRole === 'College Admin') return false;
        return n.recipientUserId === user._id;
      } else {
        // College staff
        if (n.recipientRole === 'Student') return false;
        if (n.collegeId && user.collegeId && n.collegeId === user.collegeId) return true;
        return n.recipientUserId === user._id;
      }
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    return res.json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function markNotificationAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    if (id === 'all') {
      const all = await Notification.find().exec();
      const userNotifications = all.filter((n) => {
        if (user.role === 'Student') {
          if (n.recipientRole === 'College Super Admin' || n.recipientRole === 'College Admin') return false;
          return n.recipientUserId === user._id;
        } else {
          if (n.recipientRole === 'Student') return false;
          if (n.collegeId && user.collegeId && n.collegeId === user.collegeId) return true;
          return n.recipientUserId === user._id;
        }
      });

      for (const n of userNotifications) {
        await Notification.findByIdAndUpdate(n._id, { read: true });
      }
      return res.json({ success: true, message: 'All notifications marked as read' });
    }

    const n = await Notification.findById(id);
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });

    // Enforce ownership/context
    const isOwner = n.recipientUserId === user._id || (user.collegeId && n.collegeId === user.collegeId);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await Notification.findByIdAndUpdate(id, { read: true });
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function clearAllNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const all = await Notification.find().exec();
    const toDelete = all.filter((n) => {
      if (user.role === 'Student') {
        // Only delete student-context notifications
        if (n.recipientRole === 'College Super Admin' || n.recipientRole === 'College Admin') return false;
        return n.recipientUserId === user._id;
      } else {
        // Only delete college-context notifications
        if (n.recipientRole === 'Student') return false;
        if (n.collegeId && user.collegeId && n.collegeId === user.collegeId) return true;
        return n.recipientUserId === user._id;
      }
    });

    for (const n of toDelete) {
      await Notification.findByIdAndDelete(n._id);
    }

    return res.json({ success: true, message: 'Notifications cleared successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const n = await Notification.findById(id);
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });

    const isOwner = n.recipientUserId === user._id || (user.collegeId && n.collegeId === user.collegeId);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await Notification.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Notification deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteSelectedNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'List of notification IDs is required.' });
    }

    for (const id of ids) {
      const n = await Notification.findById(id);
      if (n) {
        const isOwner = n.recipientUserId === user._id || (user.collegeId && n.collegeId === user.collegeId);
        if (isOwner) {
          await Notification.findByIdAndDelete(id);
        }
      }
    }

    return res.json({
      success: true,
      message: `${ids.length} notification(s) cleared.`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function markSelectedNotificationsAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'List of notification IDs is required.' });
    }

    for (const id of ids) {
      const n = await Notification.findById(id);
      if (n) {
        const isOwner = n.recipientUserId === user._id || (user.collegeId && n.collegeId === user.collegeId);
        if (isOwner) {
          await Notification.findByIdAndUpdate(id, { read: true });
        }
      }
    }

    return res.json({
      success: true,
      message: `${ids.length} notification(s) marked as read.`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

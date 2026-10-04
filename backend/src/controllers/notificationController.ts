import { Response } from 'express';
import { Notification } from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getUserNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const notifications = await Notification.find({ recipientUserId: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

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
      const all = await Notification.find({ recipientUserId: user._id }).exec();
      for (const n of all) {
        await Notification.findByIdAndUpdate(n._id, { read: true });
      }
      return res.json({ success: true, message: 'All notifications marked as read' });
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

    await Notification.deleteMany({ recipientUserId: user._id });
    return res.json({ success: true, message: 'All notifications cleared' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
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

    // Only delete notifications belonging to this user
    for (const id of ids) {
      const n = await Notification.findById(id);
      if (n && n.recipientUserId === user._id) {
        await Notification.findByIdAndDelete(id);
      }
    }

    const remaining = await Notification.find({ recipientUserId: user._id }).exec();
    const unreadCount = remaining.filter((n) => !n.read).length;

    return res.json({
      success: true,
      message: `${ids.length} notification(s) cleared.`,
      unreadCount,
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

    // Only update notifications belonging to this user
    for (const id of ids) {
      const n = await Notification.findById(id);
      if (n && n.recipientUserId === user._id) {
        await Notification.findByIdAndUpdate(id, { read: true });
      }
    }

    const remaining = await Notification.find({ recipientUserId: user._id }).exec();
    const unreadCount = remaining.filter((n) => !n.read).length;

    return res.json({
      success: true,
      message: `${ids.length} notification(s) marked as read.`,
      unreadCount,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}



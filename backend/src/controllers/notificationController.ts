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

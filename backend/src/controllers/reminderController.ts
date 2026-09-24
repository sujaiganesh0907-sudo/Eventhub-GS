import { Response } from 'express';
import { Reminder, Event, Notification, StudentProfile } from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

export async function createReminder(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const student = await StudentProfile.findOne({ userId: user._id });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const { eventId, reminderType = '1_day_before', customTime } = req.body;
    if (!eventId) return res.status(400).json({ success: false, message: 'Event ID required' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    let reminderTime = customTime || '';
    if (!reminderTime) {
      const eventDateMs = new Date(`${event.eventDate}T${event.startTime}`).getTime();
      let offsetMs = 24 * 60 * 60 * 1000;
      if (reminderType === '3_hours_before') offsetMs = 3 * 60 * 60 * 1000;
      if (reminderType === '1_hour_before') offsetMs = 1 * 60 * 60 * 1000;
      reminderTime = new Date(Math.max(Date.now(), eventDateMs - offsetMs)).toISOString();
    }

    const reminder = await Reminder.create({
      studentId: student._id,
      eventId,
      reminderType,
      reminderTime,
      notified: false,
    });

    // Send confirmation notification
    await Notification.create({
      recipientUserId: user._id,
      type: 'REMINDER',
      title: 'Event Reminder Set',
      message: `Reminder set for "${event.title}" on ${event.eventDate} at ${event.startTime}.`,
      link: `/events/${event._id}`,
      read: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Event reminder successfully set and saved to your schedule.',
      reminder,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getStudentReminders(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const student = await StudentProfile.findOne({ userId: user._id });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const reminders = await Reminder.find({ studentId: student._id }).exec();
    return res.json({ success: true, reminders });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

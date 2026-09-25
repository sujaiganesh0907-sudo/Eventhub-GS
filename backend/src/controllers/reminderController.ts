import { Response } from 'express';
import { Reminder, Event, Notification, StudentProfile, EventRegistration } from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

export async function createReminder(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const student = await StudentProfile.findOne({ userId: user._id });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const {
      eventId,
      registrationId,
      reminderType = '1_day_before',
      reminderDate,
      reminderTime: userTime,
      customTime,
    } = req.body;

    if (!eventId) return res.status(400).json({ success: false, message: 'Event ID required' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // Calculate exact reminder ISO timestamp
    let finalReminderTime = customTime || '';

    if (userTime && reminderDate) {
      finalReminderTime = new Date(`${reminderDate}T${userTime}`).toISOString();
    } else if (!finalReminderTime) {
      const eventDateStr = `${event.eventDate}T${event.startTime || '09:00'}`;
      const eventDateMs = new Date(eventDateStr).getTime();

      let offsetMs = 24 * 60 * 60 * 1000; // 1 day
      if (reminderType === '3_hours_before') offsetMs = 3 * 60 * 60 * 1000;
      if (reminderType === '1_hour_before') offsetMs = 1 * 60 * 60 * 1000;
      if (reminderType === '30_mins_before') offsetMs = 30 * 60 * 1000;

      finalReminderTime = new Date(Math.max(Date.now(), eventDateMs - offsetMs)).toISOString();
    }

    // Check if a reminder already exists for this registration / student & event
    let reminder = await Reminder.findOne({
      studentId: student._id,
      eventId,
      status: 'Pending',
    });

    if (reminder) {
      await Reminder.findByIdAndUpdate(reminder._id, {
        reminderType,
        reminderTime: finalReminderTime,
        registrationId,
        notified: false,
      });
      reminder = await Reminder.findById(reminder._id);
    } else {
      reminder = await Reminder.create({
        studentId: student._id,
        studentUserId: user._id,
        eventId,
        registrationId,
        reminderType,
        reminderTime: finalReminderTime,
        status: 'Pending',
        notified: false,
      });
    }

    // Send immediate in-app notification confirming reminder schedule
    await Notification.create({
      recipientUserId: user._id,
      type: 'REMINDER',
      title: 'Event Reminder Scheduled',
      message: `Reminder set for "${event.title}" on ${new Date(finalReminderTime).toLocaleDateString()} at ${new Date(
        finalReminderTime
      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      link: `/events`,
      read: false,
      metadata: {
        eventId: event._id,
        reminderId: reminder?._id,
        eventTitle: event.title,
        eventDate: event.eventDate,
        venue: event.venue || event.meetingPlatform || 'Campus',
      },
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

export async function updateReminder(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const { reminderType, reminderTime } = req.body;

    const reminder = await Reminder.findById(id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });

    const updated = await Reminder.findByIdAndUpdate(
      id,
      {
        reminderType: reminderType || reminder.reminderType,
        reminderTime: reminderTime || reminder.reminderTime,
        notified: false,
        status: 'Pending',
      }
    );

    return res.json({
      success: true,
      message: 'Reminder updated successfully.',
      reminder: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteReminder(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const reminder = await Reminder.findById(id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });

    await Reminder.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'Reminder removed successfully.',
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

    // Attach event details
    const populated = await Promise.all(
      reminders.map(async (rem) => {
        const event = await Event.findById(rem.eventId);
        return {
          ...rem,
          event: event || null,
        };
      })
    );

    return res.json({ success: true, reminders: populated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Periodically checks for due reminders and dispatches in-app notifications
 */
export async function processDueReminders() {
  try {
    const now = Date.now();
    const reminders = await Reminder.find({ notified: false, status: 'Pending' }).exec();

    for (const rem of reminders) {
      const remTime = new Date(rem.reminderTime).getTime();
      if (remTime <= now) {
        const event = await Event.findById(rem.eventId);
        if (event && rem.studentUserId) {
          await Notification.create({
            recipientUserId: rem.studentUserId,
            type: 'REMINDER',
            title: `⏰ Event Starting Soon: "${event.title}"`,
            message: `Don't forget! "${event.title}" starts on ${event.eventDate} at ${event.startTime}. Location: ${
              event.venue || event.meetingPlatform || 'See event details'
            }.`,
            link: `/events`,
            read: false,
            metadata: {
              eventId: event._id,
              eventTitle: event.title,
              eventDate: event.eventDate,
              venue: event.venue || event.meetingPlatform,
              isDueAlert: true,
            },
          });
        }

        await Reminder.findByIdAndUpdate(rem._id, {
          notified: true,
          status: 'Triggered',
        });
      }
    }
  } catch (err: any) {
    console.error('Error processing due reminders:', err.message);
  }
}

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Bell, Check, Clock, Calendar, AlertCircle, Trash2, Volume2, Shield } from 'lucide-react';
import { api } from '../../services/api';
import { IEvent, IReminder } from '../../types';
import { notificationService } from '../../services/notificationService';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: IEvent;
  registrationId?: string;
  existingReminder?: IReminder | null;
  onReminderSaved?: (reminder?: IReminder | null) => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  event,
  registrationId,
  existingReminder,
  onReminderSaved,
}) => {
  const [reminderType, setReminderType] = useState(
    existingReminder?.reminderType || '1_day_before'
  );
  const [reminderDate, setReminderDate] = useState(
    existingReminder?.reminderDate || event.eventDate || ''
  );
  const [reminderTime, setReminderTime] = useState(
    existingReminder?.reminderTime ? new Date(existingReminder.reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '09:00'
  );
  const [customTime, setCustomTime] = useState(
    existingReminder?.reminderTime ? existingReminder.reminderTime.slice(0, 16) : ''
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPerm(Notification.permission);
    }
    if (existingReminder) {
      setReminderType(existingReminder.reminderType);
      if (existingReminder.reminderTime) {
        setCustomTime(existingReminder.reminderTime.slice(0, 16));
      }
    }
  }, [existingReminder, isOpen]);

  const handleRequestPermission = async () => {
    const perm = await notificationService.requestPermission();
    setBrowserPerm(perm);
    if (perm === 'granted') {
      notificationService.playNotificationSound();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Auto-request permission if default
      if (browserPerm === 'default') {
        const perm = await notificationService.requestPermission();
        setBrowserPerm(perm);
      }

      let payload: any = {
        eventId: event._id,
        registrationId,
        reminderType,
      };

      if (reminderType === 'custom') {
        if (!customTime) {
          setError('Please specify a custom date and time.');
          setLoading(false);
          return;
        }
        payload.customTime = new Date(customTime).toISOString();
      } else {
        payload.reminderDate = reminderDate;
        payload.reminderTime = reminderTime;
      }

      let res: any;
      if (existingReminder?._id) {
        res = await api.put<any>(`/reminders/${existingReminder._id}`, payload);
      } else {
        res = await api.post<any>('/reminders', payload);
      }

      if (res.success) {
        setSuccess(true);
        notificationService.playNotificationSound();
        if (onReminderSaved) onReminderSaved(res.reminder);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1200);
      } else {
        setError(res.message || 'Failed to save reminder.');
      }
    } catch (err: any) {
      setError(err.message || 'Error scheduling reminder.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReminder?._id) return;
    if (!confirm('Are you sure you want to cancel and remove this reminder?')) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await api.delete<any>(`/reminders/${existingReminder._id}`);
      if (res.success) {
        if (onReminderSaved) onReminderSaved(null);
        onClose();
      } else {
        setError(res.message || 'Failed to delete reminder.');
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting reminder.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingReminder ? 'Edit Event Reminder' : 'Set Event Reminder'}
      subtitle={`${event.title} · ${event.eventDate} at ${event.startTime || '09:00'}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Reminder scheduled successfully! You will receive in-app and browser notifications.</span>
          </div>
        )}

        {/* Browser Permission Request Card */}
        {browserPerm !== 'granted' && (
          <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-[var(--text-secondary)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Enable browser notifications to receive sound & desktop popups.</span>
            </div>
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3 py-1 rounded-lg bg-[var(--primary-color)] text-[var(--primary-text)] font-bold text-[11px] shrink-0 cursor-pointer shadow-xs active:scale-95"
            >
              Enable
            </button>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Reminder Frequency & Schedule
          </label>

          <div className="space-y-2">
            {[
              { id: '1_day_before', label: '1 Day Before Event', desc: 'Standard 24-hour advance alert' },
              { id: '3_hours_before', label: '3 Hours Before Event', desc: 'Travel and reporting preparation' },
              { id: '1_hour_before', label: '1 Hour Before Event', desc: 'Final check-in call' },
              { id: '30_mins_before', label: '30 Minutes Before Event', desc: 'Immediate entry notice' },
              { id: 'custom', label: 'Custom Date & Time', desc: 'Specify exact date and time for notification' },
            ].map((opt) => (
              <label
                key={opt.id}
                onClick={() => setReminderType(opt.id as any)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  reminderType === opt.id
                    ? 'border-[var(--primary-color)] bg-[var(--primary-light)] text-[var(--primary-color)]'
                    : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <input
                  type="radio"
                  name="reminderType"
                  value={opt.id}
                  checked={reminderType === opt.id}
                  onChange={() => setReminderType(opt.id as any)}
                  className="mt-0.5 accent-[var(--primary-color)]"
                />
                <div>
                  <span className="text-xs font-bold block">{opt.label}</span>
                  <span className="text-[11px] text-[var(--text-muted)] block">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {reminderType === 'custom' && (
          <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2">
            <label className="block text-xs font-bold text-[var(--text-primary)]">
              Pick Exact Alert Date & Time
            </label>
            <input
              type="datetime-local"
              required
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] font-medium focus:outline-hidden"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
          {existingReminder ? (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="px-3.5 py-2 rounded-xl text-red-600 hover:bg-red-500/10 border border-red-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> {deleting ? 'Removing...' : 'Remove Reminder'}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Bell className="w-4 h-4" /> {loading ? 'Saving...' : existingReminder ? 'Update Reminder' : 'Set Reminder'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Bell, Check, Clock, Calendar, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { IEvent } from '../../types';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: IEvent;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const [reminderType, setReminderType] = useState('1_day_before');
  const [customTime, setCustomTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post<any>('/reminders', {
        eventId: event._id,
        reminderType,
        customTime: reminderType === 'custom' ? customTime : undefined,
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1200);
      } else {
        setError(res.message || 'Failed to set reminder');
      }
    } catch (err: any) {
      setError(err.message || 'Error setting reminder.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Event Reminder"
      subtitle={`${event.title} · ${event.eventDate} at ${event.startTime}`}
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
            <span>Reminder scheduled successfully! You will receive an alert before the event.</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            When do you want to be reminded?
          </label>

          <div className="space-y-2">
            {[
              { id: '1_day_before', label: '1 Day Before Event', desc: 'Standard preparation reminder' },
              { id: '3_hours_before', label: '3 Hours Before Event', desc: 'Time to head over and check reporting time' },
              { id: '1_hour_before', label: '1 Hour Before Event', desc: 'Final call for check-in' },
              { id: 'custom', label: 'Custom Date & Time', desc: 'Pick exact alert timestamp' },
            ].map((opt) => (
              <label
                key={opt.id}
                onClick={() => setReminderType(opt.id)}
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
                  onChange={() => setReminderType(opt.id)}
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
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Custom Reminder Date & Time
            </label>
            <input
              type="datetime-local"
              required
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] font-medium"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
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
            <Bell className="w-4 h-4" /> {loading ? 'Saving...' : 'Set Reminder'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

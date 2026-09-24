import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import {
  Bell,
  CheckCheck,
  Trash2,
  Ticket,
  Award,
  Calendar,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

interface NotificationsPageProps {
  onSelectEvent?: (eventId: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  onSelectEvent,
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotifications();

  const getIconForType = (type: string) => {
    switch (type) {
      case 'ticket_generated':
      case 'registration_confirmed':
        return <Ticket className="w-5 h-5 text-blue-500" />;
      case 'attendance_marked':
        return <UserCheck className="w-5 h-5 text-emerald-500" />;
      case 'certificate_issued':
        return <Award className="w-5 h-5 text-amber-500" />;
      case 'event_reminder':
        return <Calendar className="w-5 h-5 text-indigo-500" />;
      case 'proposal_approved':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'proposal_rejected':
      case 'event_cancelled':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-[var(--primary-color)]" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Notification Center
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Event updates, verified entry pass alerts, and collegiate awards
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="px-3 py-1.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-xs font-semibold text-red-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="p-16 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
          <Bell className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">No notifications</h3>
          <p className="text-xs text-[var(--text-muted)]">
            You're all caught up! New reminders and event alerts will appear here.
          </p>
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden divide-y divide-[var(--border-color)] bg-[var(--surface)] shadow-xs">
          {notifications.map((n) => {
            return (
              <div
                key={n._id}
                onClick={() => {
                  if (!n.read) markAsRead(n._id);
                  if (n.eventId && onSelectEvent) onSelectEvent(n.eventId);
                }}
                className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer ${
                  n.read ? 'bg-[var(--surface)] hover:bg-[var(--surface-subtle)]' : 'bg-[var(--primary-light)]/40 hover:bg-[var(--primary-light)]/60'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] shrink-0 shadow-xs">
                  {getIconForType(n.type)}
                </div>

                <div className="grow min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    {n.message}
                  </p>
                </div>

                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-[var(--primary-color)] shrink-0 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

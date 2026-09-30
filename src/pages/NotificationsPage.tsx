import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DEFAULT_COLLEGE_LOGO } from '../services/imageDefaults';
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
  ShieldCheck,
  ShieldAlert,
  Shield,
  Check,
  X,
  Loader2,
  Building2,
  ExternalLink,
} from 'lucide-react';

interface NotificationsPageProps {
  onSelectEvent?: (eventId: string) => void;
  onOpenManageAdmins?: (collegeId: string) => void;
  onNavigateToTab?: (tab: string, meta?: any) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  onSelectEvent,
  onOpenManageAdmins,
  onNavigateToTab,
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, fetchNotifications } =
    useNotifications();
  const { refreshProfile } = useAuth();

  const [actingInviteId, setActingInviteId] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<Record<string, { type: 'success' | 'error'; message: string }>>({});

  const handleAcceptInvitation = async (e: React.MouseEvent, n: any) => {
    e.stopPropagation();
    const membershipId = n.metadata?.membershipId;
    if (!membershipId) {
      alert('Invitation reference not found in notification.');
      return;
    }

    try {
      setActingInviteId(membershipId);
      const res = await api.post<any>(`/admins/invitations/${membershipId}/accept`, {});
      if (res.success) {
        setInviteFeedback((prev) => ({
          ...prev,
          [n._id]: { type: 'success', message: res.message || 'Invitation accepted! You are now a College Admin.' },
        }));
        markAsRead(n._id);
        if (refreshProfile) refreshProfile();
        if (fetchNotifications) fetchNotifications();
      } else {
        setInviteFeedback((prev) => ({
          ...prev,
          [n._id]: { type: 'error', message: res.message || 'Failed to accept invitation.' },
        }));
      }
    } catch (err: any) {
      setInviteFeedback((prev) => ({
        ...prev,
        [n._id]: { type: 'error', message: err.message || 'Error accepting invitation.' },
      }));
    } finally {
      setActingInviteId(null);
    }
  };

  const handleRejectInvitation = async (e: React.MouseEvent, n: any) => {
    e.stopPropagation();
    const membershipId = n.metadata?.membershipId;
    if (!membershipId) {
      alert('Invitation reference not found in notification.');
      return;
    }

    try {
      setActingInviteId(membershipId);
      const res = await api.post<any>(`/admins/invitations/${membershipId}/reject`, {});
      if (res.success) {
        setInviteFeedback((prev) => ({
          ...prev,
          [n._id]: { type: 'success', message: 'Invitation declined.' },
        }));
        markAsRead(n._id);
        if (fetchNotifications) fetchNotifications();
      } else {
        setInviteFeedback((prev) => ({
          ...prev,
          [n._id]: { type: 'error', message: res.message || 'Failed to decline invitation.' },
        }));
      }
    } catch (err: any) {
      setInviteFeedback((prev) => ({
        ...prev,
        [n._id]: { type: 'error', message: err.message || 'Error declining invitation.' },
      }));
    } finally {
      setActingInviteId(null);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'ADMIN_INVITE':
        return <ShieldCheck className="w-5 h-5 text-indigo-500" />;
      case 'ADMIN_ACTION':
        return <Shield className="w-5 h-5 text-blue-500" />;
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
            Event updates, admin invitations, verified entry pass alerts, and collegiate awards
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
            You're all caught up! New reminders, college admin invitations, and event alerts will appear here.
          </p>
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden divide-y divide-[var(--border-color)] bg-[var(--surface)] shadow-xs">
          {notifications.map((n) => {
            const isInvite = n.type === 'ADMIN_INVITE';
            const membershipId = n.metadata?.membershipId;
            const isActing = actingInviteId && actingInviteId === membershipId;
            const feedback = inviteFeedback[n._id];
            const permissions: string[] = n.metadata?.permissions || [];
            const collegeLogo = n.metadata?.collegeLogo || DEFAULT_COLLEGE_LOGO;
            const collegeName = n.metadata?.collegeName;

            return (
              <div
                key={n._id}
                onClick={() => {
                  if (!n.read) markAsRead(n._id);

                  // 1. Direct message notification
                  if (n.metadata?.conversationId && onNavigateToTab) {
                    onNavigateToTab('messages', { conversationId: n.metadata.conversationId });
                    return;
                  }

                  // 2. Admin invite: already has dedicated in-card action buttons
                  if (isInvite) return;

                  // 3. Admin accepted/rejected -> Manage Admins
                  if ((n.type === 'ADMIN_ACTION' || n.metadata?.action === 'manage-admins') && n.metadata?.collegeId && onOpenManageAdmins) {
                    onOpenManageAdmins(n.metadata.collegeId);
                    return;
                  }

                  // 4. Student Event Request -> Requests tab in events
                  if ((n.metadata?.action === 'event-requests' || n.link?.includes('tab=requests')) && onNavigateToTab) {
                    onNavigateToTab('events', { tab: 'requests', eventId: n.metadata?.eventId || n.eventId });
                    return;
                  }

                  // 5. Attendance Finalized / Attendance marked
                  if (n.metadata?.action === 'attendance' && onNavigateToTab) {
                    onNavigateToTab('events', { tab: 'attendance', eventId: n.metadata?.eventId || n.eventId });
                    return;
                  }

                  // 6. Certificate issued -> Certificate Details in Profile
                  if ((n.type === 'CERTIFICATE' || n.metadata?.certificateId || n.link?.includes('tab=certificates')) && onNavigateToTab) {
                    onNavigateToTab('profile', { tab: 'certificates', certificateId: n.metadata?.certificateId });
                    return;
                  }

                  // 7. Event details (Approved, Event Update, Connected College Event, Reminder)
                  const targetEventId = n.eventId || n.metadata?.eventId || (n.link?.startsWith('/events/') ? n.link.split('/')[2] : null);
                  if (targetEventId && onSelectEvent) {
                    onSelectEvent(targetEventId);
                    return;
                  }

                  // 8. General link fallback
                  if (n.link && onNavigateToTab) {
                    if (n.link.startsWith('/events')) onNavigateToTab('events');
                    else if (n.link.startsWith('/profile')) onNavigateToTab('profile');
                    else if (n.link.startsWith('/messages')) onNavigateToTab('messages');
                    else if (n.link.startsWith('/colleges')) onNavigateToTab('colleges');
                  }
                }}
                className={`p-4 flex flex-col gap-3 transition-colors cursor-pointer ${
                  n.read ? 'bg-[var(--surface)] hover:bg-[var(--surface-subtle)]' : 'bg-[var(--primary-light)]/40 hover:bg-[var(--primary-light)]/60'
                }`}
              >
                <div className="flex items-start gap-3.5">
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

                {/* SPECIAL CARD: COLLEGE ADMIN INVITATION (Requirement 3 & 4) */}
                {isInvite && (
                  <div className="ml-12 p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={collegeLogo}
                          alt={collegeName || 'College'}
                          className="w-9 h-9 rounded-lg object-cover border border-[var(--border-color)] shrink-0"
                          onError={(e) => {
                            (e.target as any).src = DEFAULT_COLLEGE_LOGO;
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {collegeName || 'Collegiate Institution'}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            Role: College Administrator Invitation
                          </p>
                        </div>
                      </div>

                      {feedback ? (
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-lg ${
                            feedback.type === 'success'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-600 border border-red-500/20'
                          }`}
                        >
                          {feedback.message}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={!!isActing}
                            onClick={(e) => handleRejectInvitation(e, n)}
                            className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer disabled:opacity-50"
                          >
                            {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Decline'}
                          </button>
                          <button
                            type="button"
                            disabled={!!isActing}
                            onClick={(e) => handleAcceptInvitation(e, n)}
                            className="px-4 py-1.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            {isActing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Accept Invitation
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Permissions summary */}
                    {permissions.length > 0 && (
                      <div className="pt-2 border-t border-indigo-500/15">
                        <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block mb-1">
                          Assigned Administrative Permissions ({permissions.length}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {permissions.map((p) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 rounded-md bg-[var(--surface)] text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border-color)]"
                            >
                              {p.replace('manage', '').replace('view', '')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
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
  MessageSquare,
  FileText,
  Share2,
  CheckSquare,
  Square,
  Filter,
} from 'lucide-react';

interface NotificationsPageProps {
  onSelectEvent?: (eventId: string) => void;
  onOpenManageAdmins?: (collegeId: string) => void;
  onNavigateToTab?: (tab: string, meta?: any) => void;
}

export type NotificationCategory =
  | 'All'
  | 'Events'
  | 'Registrations'
  | 'Certificates'
  | 'Connections / Social'
  | 'Messages'
  | 'Reminders'
  | 'System'
  | 'Event Management'
  | 'Attendance'
  | 'Admin Activity'
  | 'College Updates';

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  onSelectEvent,
  onOpenManageAdmins,
  onNavigateToTab,
}) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    clearSelected,
    markSelectedAsRead,
    fetchNotifications,
  } = useNotifications();
  const { user, isCollege, refreshProfile } = useAuth();

  // Selection mode states (Requirement 10)
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);

  // Category filter state (Requirement 11)
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('All');

  // Admin invitation handling state
  const [actingInviteId, setActingInviteId] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<
    Record<string, { type: 'success' | 'error'; message: string }>
  >({});

  // Requirements 6 & 7: Distinct Student vs College Notification Filters
  const categories: NotificationCategory[] = isCollege
    ? [
        'All',
        'Event Management',
        'Registrations',
        'Attendance',
        'Certificates',
        'Admin Activity',
        'Messages',
        'College Updates',
        'System',
      ]
    : [
        'All',
        'Events',
        'Registrations',
        'Certificates',
        'Connections / Social',
        'Messages',
        'Reminders',
        'System',
      ];

  // Filter notifications by category using structured metadata (Requirements 6 & 7)
  const filteredNotifications = useMemo(() => {
    if (activeCategory === 'All') return notifications;

    return notifications.filter((n) => {
      const type = (n.type || '').toUpperCase();
      const action = n.metadata?.action || '';
      const metaType = n.metadata?.type || '';

      if (isCollege) {
        switch (activeCategory) {
          case 'Event Management':
            return (
              type.includes('EVENT') ||
              type === 'STUDENT_REQUEST' ||
              action === 'event-requests' ||
              Boolean(n.metadata?.eventId)
            );
          case 'Registrations':
            return type.includes('REGISTRATION') || Boolean(n.metadata?.registrationId);
          case 'Attendance':
            return type.includes('ATTENDANCE') || action === 'attendance';
          case 'Certificates':
            return type.includes('CERTIFICATE') || Boolean(n.metadata?.certificateId);
          case 'Admin Activity':
            return type.includes('ADMIN') || action === 'manage-admins';
          case 'Messages':
            return type.includes('MESSAGE') || Boolean(n.metadata?.conversationId);
          case 'College Updates':
            return type.includes('POST') || metaType === 'placement' || metaType === 'infrastructure';
          case 'System':
            return (
              type === 'SYSTEM' ||
              (!type.includes('EVENT') &&
                !type.includes('REGISTRATION') &&
                !type.includes('ATTENDANCE') &&
                !type.includes('CERTIFICATE') &&
                !type.includes('ADMIN') &&
                !type.includes('MESSAGE'))
            );
          default:
            return true;
        }
      } else {
        // Student filters
        switch (activeCategory) {
          case 'Events':
            return (
              type.includes('EVENT') ||
              type === 'proposal_approved' ||
              type === 'proposal_rejected' ||
              Boolean(n.metadata?.eventId) ||
              Boolean(n.eventId)
            );
          case 'Registrations':
            return (
              type.includes('REGISTRATION') ||
              type.includes('TICKET') ||
              type.includes('PAYMENT') ||
              Boolean(n.metadata?.registrationId)
            );
          case 'Certificates':
            return (
              type.includes('CERTIFICATE') ||
              type === 'certificate_issued' ||
              Boolean(n.metadata?.certificateId)
            );
          case 'Connections / Social':
            return (
              type.includes('FOLLOW') ||
              type.includes('CONNECTION') ||
              Boolean(n.metadata?.followerId) ||
              Boolean(n.metadata?.studentId)
            );
          case 'Messages':
            return type.includes('MESSAGE') || Boolean(n.metadata?.conversationId);
          case 'Reminders':
            return type.includes('REMINDER');
          case 'System':
            return (
              type === 'SYSTEM' ||
              (!type.includes('EVENT') &&
                !type.includes('REGISTRATION') &&
                !type.includes('CERTIFICATE') &&
                !type.includes('MESSAGE') &&
                !type.includes('REMINDER') &&
                !type.includes('FOLLOW') &&
                !type.includes('CONNECTION'))
            );
          default:
            return true;
        }
      }
    });
  }, [notifications, activeCategory, isCollege]);

  // Toggle selection for an individual notification
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all or deselect all in current view
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n._id)));
    }
  };

  // Cancel selection mode
  const handleCancelSelection = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  // Clear selected notifications
  const handleClearSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsBatchProcessing(true);
      const ids = Array.from(selectedIds);
      await clearSelected(ids);
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } catch (err) {
      console.error('Failed to clear selected', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Mark selected notifications read
  const handleMarkSelectedRead = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsBatchProcessing(true);
      const ids = Array.from(selectedIds);
      await markSelectedAsRead(ids);
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } catch (err) {
      console.error('Failed to mark selected read', err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Handle invitation accept
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

  // Handle invitation decline
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

  // Deep link routing (Requirement 12)
  const handleNotificationClick = (n: any) => {
    if (isSelectMode) {
      // In select mode, clicking card toggles selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(n._id)) next.delete(n._id);
        else next.add(n._id);
        return next;
      });
      return;
    }

    if (!n.read) markAsRead(n._id);

    // 1. Direct message notification -> open conversation
    if (n.metadata?.conversationId && onNavigateToTab) {
      onNavigateToTab('messages', { conversationId: n.metadata.conversationId });
      return;
    }

    // 2. Admin invite: dedicated accept/decline action on card
    if (n.type === 'ADMIN_INVITE') return;

    // 3. Admin accepted/rejected/role updated -> Manage Admins
    if (
      (n.type === 'ADMIN_ACTION' || n.metadata?.action === 'manage-admins') &&
      n.metadata?.collegeId &&
      onOpenManageAdmins
    ) {
      onOpenManageAdmins(n.metadata.collegeId);
      return;
    }

    // 4. Student Event Proposal/Request -> Requests tab in events
    if (
      (n.metadata?.action === 'event-requests' || n.link?.includes('tab=requests')) &&
      onNavigateToTab
    ) {
      onNavigateToTab('events', { tab: 'requests', eventId: n.metadata?.eventId || n.eventId });
      return;
    }

    // 5. Attendance Finalized / Attendance check-in -> correct event attendance
    if (n.metadata?.action === 'attendance' && onNavigateToTab) {
      onNavigateToTab('events', { tab: 'attendance', eventId: n.metadata?.eventId || n.eventId });
      return;
    }

    // 6. Certificate issued / generated -> Certificate Details in Profile
    if (
      (n.type === 'CERTIFICATE' ||
        n.metadata?.certificateId ||
        n.link?.includes('tab=certificates')) &&
      onNavigateToTab
    ) {
      onNavigateToTab('profile', { tab: 'certificates', certificateId: n.metadata?.certificateId });
      return;
    }

    // 7. Event details (Approved, Event Update, Connected College Event, Reminder)
    const targetEventId =
      n.eventId ||
      n.metadata?.eventId ||
      (n.link?.startsWith('/events/') ? n.link.split('/')[2] : null);
    if (targetEventId && onSelectEvent) {
      onSelectEvent(targetEventId);
      return;
    }

    // 8. Placement / Facility Post -> Relevant college post view
    if (
      (n.metadata?.type === 'placement' || n.metadata?.type === 'infrastructure') &&
      onNavigateToTab
    ) {
      onNavigateToTab('colleges', {
        collegeId: n.metadata?.collegeId,
        tab: n.metadata?.type === 'placement' ? 'placements' : 'facilities',
      });
      return;
    }

    // 9. General link fallback
    if (n.link && onNavigateToTab) {
      if (n.link.startsWith('/events')) onNavigateToTab('events');
      else if (n.link.startsWith('/profile')) onNavigateToTab('profile');
      else if (n.link.startsWith('/messages')) onNavigateToTab('messages');
      else if (n.link.startsWith('/colleges')) onNavigateToTab('colleges');
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
      case 'ATTENDANCE':
        return <UserCheck className="w-5 h-5 text-emerald-500" />;
      case 'certificate_issued':
      case 'CERTIFICATE':
        return <Award className="w-5 h-5 text-amber-500" />;
      case 'event_reminder':
        return <Calendar className="w-5 h-5 text-indigo-500" />;
      case 'proposal_approved':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'proposal_rejected':
      case 'event_cancelled':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'MESSAGE':
      case 'NEW_MESSAGE':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-[var(--primary-color)]" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header with Title and Global Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-color)] pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Notification Center
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Event updates, administrative notices, pass alerts, and collegiate credentials
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isSelectMode ? (
            <>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsSelectMode(true)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[var(--primary-color)]" /> Select
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="px-3 py-1.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-xs font-semibold text-red-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              )}
            </>
          ) : (
            /* Select Mode Toolbar (Requirement 10) */
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
              >
                {selectedIds.size === filteredNotifications.length ? 'Deselect All' : 'Select All'}
              </button>

              <button
                type="button"
                disabled={selectedIds.size === 0 || isBatchProcessing}
                onClick={handleMarkSelectedRead}
                className="px-3 py-1.5 rounded-xl border border-[var(--primary-color)] bg-[var(--primary-light)] text-xs font-semibold text-[var(--primary-color)] flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Mark Read ({selectedIds.size})
              </button>

              <button
                type="button"
                disabled={selectedIds.size === 0 || isBatchProcessing}
                onClick={handleClearSelected}
                className="px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-semibold text-red-600 flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Selected ({selectedIds.size})
              </button>

              <button
                type="button"
                onClick={handleCancelSelection}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* College Notification Categories Filter Bar (Requirement 11) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Filter className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 mr-1" />
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                  : 'bg-[var(--surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Notification List / Empty States */}
      {filteredNotifications.length === 0 ? (
        <div className="p-16 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
          <Bell className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {activeCategory === 'All' ? 'No notifications' : `No ${activeCategory} notifications`}
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            {activeCategory === 'All'
              ? "You're all caught up! New reminders, college invitations, and event alerts will appear here."
              : `No activity found under the "${activeCategory}" filter category.`}
          </p>
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden divide-y divide-[var(--border-color)] bg-[var(--surface)] shadow-xs">
          {filteredNotifications.map((n) => {
            const isInvite = n.type === 'ADMIN_INVITE';
            const membershipId = n.metadata?.membershipId;
            const isActing = actingInviteId && actingInviteId === membershipId;
            const feedback = inviteFeedback[n._id];
            const permissions: string[] = n.metadata?.permissions || [];
            const collegeLogo = n.metadata?.collegeLogo || DEFAULT_COLLEGE_LOGO;
            const collegeName = n.metadata?.collegeName;
            const isSelected = selectedIds.has(n._id);

            return (
              <div
                key={n._id}
                onClick={() => handleNotificationClick(n)}
                className={`p-4 flex flex-col gap-3 transition-colors cursor-pointer relative ${
                  isSelected
                    ? 'bg-blue-500/10 border-l-4 border-[var(--primary-color)]'
                    : n.read
                    ? 'bg-[var(--surface)] hover:bg-[var(--surface-subtle)]'
                    : 'bg-[var(--primary-light)]/40 hover:bg-[var(--primary-light)]/60'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Select Mode Checkbox */}
                  {isSelectMode && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleSelect(n._id, e)}
                      className="mt-2 text-[var(--primary-color)] cursor-pointer shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[var(--primary-color)]" />
                      ) : (
                        <Square className="w-5 h-5 text-[var(--text-muted)]" />
                      )}
                    </button>
                  )}

                  {/* Icon */}
                  <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] shrink-0 shadow-xs">
                    {getIconForType(n.type)}
                  </div>

                  {/* Text Content */}
                  <div className="grow min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                  </div>

                  {!n.read && !isSelectMode && (
                    <span className="w-2 h-2 rounded-full bg-[var(--primary-color)] shrink-0 mt-2" />
                  )}
                </div>

                {/* SPECIAL CARD: COLLEGE ADMIN INVITATION */}
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

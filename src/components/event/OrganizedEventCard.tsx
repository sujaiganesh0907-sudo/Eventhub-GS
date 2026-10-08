import React from 'react';
import {
  Eye,
  Edit3,
  Trash2,
  BarChart3,
  Calendar,
  MapPin,
  Globe,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Share2,
  Scan,
  UserCheck,
  Award,
  Send,
} from 'lucide-react';
import { IEvent } from '../../types';
import { ActionMenu, ActionMenuItem } from '../common/ActionMenu';
import { DEFAULT_EVENT_POSTER } from '../../services/imageDefaults';

interface OrganizedEventCardProps {
  event: IEvent;
  isStudent: boolean;
  onViewEvent: (event: IEvent) => void;
  onEditEvent?: (event: IEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onSubmitForReview?: (event: IEvent) => void;
  onViewInsights?: (event: IEvent) => void;
  onOpenCheckInDesk?: (event: IEvent) => void;
  onViewRegistrations?: (event: IEvent) => void;
  onManageAttendance?: (event: IEvent) => void;
  onManageCertificates?: (event: IEvent) => void;
  onShareEvent?: (event: IEvent) => void;
}

export const OrganizedEventCard: React.FC<OrganizedEventCardProps> = ({
  event,
  isStudent,
  onViewEvent,
  onEditEvent,
  onDeleteEvent,
  onSubmitForReview,
  onViewInsights,
  onOpenCheckInDesk,
  onViewRegistrations,
  onManageAttendance,
  onManageCertificates,
  onShareEvent,
}) => {
  const posterSrc = event.poster || event.hostCollegeLogo || DEFAULT_EVENT_POSTER;

  // Status checks
  const isApproved = event.status === 'Published' || event.status === 'Approved';
  const isPending = event.status === 'Pending Approval';
  const isChangesRequested = event.status === 'Changes Requested';
  const isRejected = event.status === 'Rejected';
  const isDraft = event.status === 'Draft';
  const isCompleted = event.status === 'Completed';
  const isCancelled = event.status === 'Cancelled';

  // Status badge styling
  const renderStatusBadge = () => {
    if (isApproved) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1 backdrop-blur-sm shadow-xs">
          <CheckCircle2 className="w-3 h-3" /> Approved & Live
        </span>
      );
    }
    if (isChangesRequested) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-600 border border-orange-500/30 flex items-center gap-1 backdrop-blur-sm shadow-xs">
          <AlertCircle className="w-3 h-3" /> Changes Requested
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 flex items-center gap-1 backdrop-blur-sm shadow-xs">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </span>
      );
    }
    if (isCancelled) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 flex items-center gap-1 backdrop-blur-sm shadow-xs">
          <AlertCircle className="w-3 h-3" /> Cancelled
        </span>
      );
    }
    if (isRejected) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-600 border border-red-500/30 flex items-center gap-1 backdrop-blur-sm shadow-xs">
          <AlertCircle className="w-3 h-3" /> Rejected
        </span>
      );
    }
    if (isDraft) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30 flex items-center gap-1 backdrop-blur-sm shadow-xs">
          <Clock className="w-3 h-3" /> Draft
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center gap-1 backdrop-blur-sm shadow-xs">
        <Clock className="w-3 h-3" /> Pending Approval
      </span>
    );
  };

  const handleDelete = () => {
    if (!onDeleteEvent) return;
    if (window.confirm(`Are you sure you want to delete "${event.title}"? This cannot be undone.`)) {
      onDeleteEvent(event._id);
    }
  };

  // Build full authorized options set (Requirement 1)
  const menuItems: ActionMenuItem[] = [
    {
      id: 'view',
      label: 'View Event',
      icon: Eye,
      onClick: () => onViewEvent(event),
    },
  ];

  if (onShareEvent) {
    menuItems.push({
      id: 'share',
      label: 'Share Event',
      icon: Share2,
      onClick: () => onShareEvent(event),
    });
  }

  // Pre-approval actions or draft actions
  if (!isApproved && !isCompleted) {
    if (onSubmitForReview && isDraft) {
      menuItems.push({
        id: 'submit-review',
        label: 'Submit for Review',
        icon: Send,
        onClick: () => onSubmitForReview(event),
      });
    }
    if (onEditEvent) {
      menuItems.push({
        id: 'edit',
        label: 'Edit Event',
        icon: Edit3,
        onClick: () => onEditEvent(event),
      });
    }
    if (onDeleteEvent) {
      menuItems.push({
        id: 'delete',
        label: 'Delete Event',
        icon: Trash2,
        danger: true,
        onClick: handleDelete,
      });
    }
  }

  // Live / Approved / Completed event actions
  if (isApproved || isCompleted) {
    if (onViewInsights) {
      menuItems.push({
        id: 'insights',
        label: 'Event Insights',
        icon: BarChart3,
        onClick: () => onViewInsights(event),
      });
    }
    if (onOpenCheckInDesk) {
      menuItems.push({
        id: 'checkin',
        label: 'Check-In Desk',
        icon: Scan,
        onClick: () => onOpenCheckInDesk(event),
      });
    }
    if (onViewRegistrations) {
      menuItems.push({
        id: 'registrations',
        label: 'Registrations',
        icon: Users,
        onClick: () => onViewRegistrations(event),
      });
    }
    if (onManageAttendance) {
      menuItems.push({
        id: 'attendance',
        label: 'Attendance',
        icon: UserCheck,
        onClick: () => onManageAttendance(event),
      });
    }
    if (onManageCertificates) {
      menuItems.push({
        id: 'certificates',
        label: 'Certificates',
        icon: Award,
        onClick: () => onManageCertificates(event),
      });
    }
    // Allow edit or cancel if college management
    if (!isStudent && onEditEvent) {
      menuItems.push({
        id: 'edit',
        label: 'Edit Event',
        icon: Edit3,
        onClick: () => onEditEvent(event),
      });
    }
    if (!isStudent && onDeleteEvent) {
      menuItems.push({
        id: 'delete',
        label: 'Delete Event',
        icon: Trash2,
        danger: true,
        onClick: handleDelete,
      });
    }
  }

  return (
    // Outer card does NOT have overflow-hidden so that 3-dot dropdown is never clipped!
    <div className="relative rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between group">
      <div>
        {/* Cover / Poster Container - Top of Card, 16:9, rounded-t-2xl overflow-hidden */}
        <div
          onClick={() => onViewEvent(event)}
          className="relative aspect-video w-full bg-slate-950 rounded-t-2xl overflow-hidden cursor-pointer"
        >
          <img
            src={posterSrc}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
            onError={(e) => {
              (e.target as any).src = DEFAULT_EVENT_POSTER;
            }}
          />

          {/* Top Overlays: Category & Status */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider">
              {event.category || 'EVENT'}
            </span>
            <div className="pointer-events-auto">{renderStatusBadge()}</div>
          </div>

          {/* Bottom Overlays: Mode & Fee */}
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-semibold">
            <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-white flex items-center gap-1">
              {event.eventMode === 'Online' ? (
                <Globe className="w-3 h-3 text-sky-400" />
              ) : (
                <MapPin className="w-3 h-3 text-amber-400" />
              )}
              {event.eventMode}
            </span>

            <span
              className={`px-2 py-0.5 rounded-md font-bold backdrop-blur-sm ${
                event.isFree ? 'bg-emerald-600/90 text-white' : 'bg-indigo-600/90 text-white'
              }`}
            >
              {event.isFree ? 'Free' : `$${event.registrationFee}`}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <h3
              onClick={() => onViewEvent(event)}
              className="text-sm sm:text-base font-bold text-[var(--text-primary)] hover:text-[var(--primary-color)] transition-colors cursor-pointer line-clamp-1 flex-1"
            >
              {event.title}
            </h3>

            {/* Clean Professional 3-Dot Action Menu (Requirement 1) */}
            <ActionMenu
              items={menuItems}
              ariaLabel={`Options for ${event.title}`}
              align="right"
            />
          </div>

          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {event.description}
          </p>

          {/* Rejection / Feedback box if changes required */}
          {event.rejectionReason && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
              <span className="font-bold block text-[10px] uppercase tracking-wider mb-0.5">
                Admin Feedback:
              </span>
              <span>{event.rejectionReason}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info with rounded-b-2xl */}
      <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--surface-subtle)] rounded-b-2xl flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1 font-medium">
          <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          {event.eventDate}
        </span>

        {isApproved ? (
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <Users className="w-3 h-3" />
            {event.registeredCount || 0} registered
          </span>
        ) : (
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">
            Capacity: {event.capacity}
          </span>
        )}
      </div>
    </div>
  );
};

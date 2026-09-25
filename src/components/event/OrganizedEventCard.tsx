import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
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
} from 'lucide-react';
import { IEvent } from '../../types';

interface OrganizedEventCardProps {
  event: IEvent;
  isStudent: boolean;
  onViewEvent: (event: IEvent) => void;
  onEditEvent?: (event: IEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onViewInsights?: (event: IEvent) => void;
  onOpenCheckInDesk?: (event: IEvent) => void;
}

export const OrganizedEventCard: React.FC<OrganizedEventCardProps> = ({
  event,
  isStudent,
  onViewEvent,
  onEditEvent,
  onDeleteEvent,
  onViewInsights,
  onOpenCheckInDesk,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  // Clean fallback poster
  const fallbackPoster =
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80';
  const posterSrc = event.poster || event.hostCollegeLogo || fallbackPoster;

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
    setMenuOpen(false);
    if (!onDeleteEvent) return;
    if (window.confirm(`Are you sure you want to delete "${event.title}"? This cannot be undone.`)) {
      onDeleteEvent(event._id);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md flex flex-col justify-between group">
      <div>
        {/* Cover / Poster Container */}
        <div
          onClick={() => onViewEvent(event)}
          className="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-pointer"
        >
          <img
            src={posterSrc}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
            onError={(e) => {
              (e.target as any).src = fallbackPoster;
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

            {/* 3-Dot Dropdown Action Menu */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                aria-label="Event Options"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer border border-transparent hover:border-[var(--border-color)]"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xl py-1.5 z-30 animate-in fade-in-50 zoom-in-95">
                  {/* View Event (Always available) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onViewEvent(event);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-left text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-500" /> View Event
                  </button>

                  {/* Before Approval: Student can Edit and Delete */}
                  {!isApproved && !isCompleted && (
                    <>
                      {onEditEvent && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onEditEvent(event);
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold text-left text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-500" /> Edit Event
                        </button>
                      )}

                      {onDeleteEvent && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold text-left text-red-600 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer transition-colors border-t border-[var(--border-color)] mt-1 pt-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Event
                        </button>
                      )}
                    </>
                  )}

                  {/* After Approval: Student can View, Open Check-In Desk, and See Insights */}
                  {(isApproved || isCompleted) && (
                    <>
                      {onOpenCheckInDesk && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onOpenCheckInDesk(event);
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold text-left text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Users className="w-3.5 h-3.5 text-purple-500" /> Check-In Desk
                        </button>
                      )}

                      {onViewInsights && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onViewInsights(event);
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold text-left text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-emerald-500" /> Event Insights
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
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

      {/* Footer Info */}
      <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
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

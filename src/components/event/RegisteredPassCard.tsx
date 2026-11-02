import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  MoreVertical,
  Ticket,
  Download,
  Eye,
  Share2,
  Bell,
  CheckCircle2,
  Award,
  Users,
} from 'lucide-react';
import { IEvent, IEventRegistration } from '../../types';
import { DEFAULT_EVENT_POSTER } from '../../services/imageDefaults';

interface RegisteredPassCardProps {
  registration: IEventRegistration;
  event?: IEvent;
  isOwner?: boolean;
  onViewTicket: (reg: IEventRegistration) => void;
  onDownloadTicket: (reg: IEventRegistration, ev?: IEvent) => void;
  onViewEvent: (event: IEvent) => void;
  onShareEvent: (event: IEvent) => void;
  onAddReminder: (reg: IEventRegistration, ev: IEvent) => void;
}

export const RegisteredPassCard: React.FC<RegisteredPassCardProps> = ({
  registration,
  event: propEvent,
  isOwner = true,
  onViewTicket,
  onDownloadTicket,
  onViewEvent,
  onShareEvent,
  onAddReminder,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const event = propEvent || registration.event;
  const eventTitle = registration.eventTitle || event?.title || 'Collegiate Event';
  const eventDate = registration.eventDate || event?.eventDate || '';
  const posterSrc = event?.poster || DEFAULT_EVENT_POSTER;
  const eventMode = event?.eventMode || 'Offline';
  const venue = event?.venue || event?.hallRoom || (eventMode === 'Online' ? 'Online Meeting' : 'Campus Venue');
  const tagline = event?.tagline || '';

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleAction = (actionType: 'view_ticket' | 'download_ticket' | 'view_event' | 'share_event' | 'add_reminder') => {
    setIsMenuOpen(false);
    if (!event) return;

    switch (actionType) {
      case 'view_ticket':
        onViewTicket(registration);
        break;
      case 'download_ticket':
        onDownloadTicket(registration, event);
        break;
      case 'view_event':
        onViewEvent(event);
        break;
      case 'share_event':
        onShareEvent(event);
        break;
      case 'add_reminder':
        onAddReminder(registration, event);
        break;
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary)] transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-visible group">
      <div>
        {/* 16:9 Showcase Poster Container */}
        <div className="relative aspect-video w-full bg-slate-950 rounded-t-2xl overflow-hidden">
          <img
            src={posterSrc}
            alt={eventTitle}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
            onError={(e) => {
              (e.target as any).src = DEFAULT_EVENT_POSTER;
            }}
          />

          {/* Top-left Monospace Registration ID */}
          <div className="absolute top-2.5 left-2.5">
            <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-white font-mono text-[10px] font-bold border border-white/20">
              {registration.registrationId}
            </span>
          </div>

          {/* Top-right ONLY ONE Three-Dot Menu (Requirement 6) */}
          <div className="absolute top-2.5 right-2.5 z-20" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors cursor-pointer shadow-sm"
              title="Pass & Event Actions"
              aria-label={`Actions for pass ${registration.registrationId}`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-[var(--surface)] border border-[var(--border-color)] rounded-xl shadow-2xl py-1.5 z-30 text-xs animate-in fade-in duration-150">
                {/* 1. View Ticket */}
                <button
                  type="button"
                  onClick={() => handleAction('view_ticket')}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] flex items-center gap-2.5 cursor-pointer font-medium"
                >
                  <Ticket className="w-3.5 h-3.5 text-blue-500" />
                  <span>1. View Ticket</span>
                </button>

                {/* 2. Download Ticket */}
                <button
                  type="button"
                  onClick={() => handleAction('download_ticket')}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] flex items-center gap-2.5 cursor-pointer font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span>2. Download Ticket</span>
                </button>

                {/* 3. View Event */}
                <button
                  type="button"
                  onClick={() => handleAction('view_event')}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] flex items-center gap-2.5 cursor-pointer font-medium"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-500" />
                  <span>3. View Event</span>
                </button>

                {/* 4. Share Event */}
                <button
                  type="button"
                  onClick={() => handleAction('share_event')}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] flex items-center gap-2.5 cursor-pointer font-medium"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>4. Share Event</span>
                </button>

                {/* 5. Add Reminder */}
                <button
                  type="button"
                  onClick={() => handleAction('add_reminder')}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] flex items-center gap-2.5 cursor-pointer font-medium"
                >
                  <Bell className="w-3.5 h-3.5 text-purple-500" />
                  <span>5. Add Reminder</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Overlay: Event Mode & Status Badges */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-xs text-white flex items-center gap-1 text-[11px]">
              {eventMode === 'Online' ? (
                <Globe className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
              )}
              {eventMode}
            </span>

            <span
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold backdrop-blur-xs ${
                registration.attended
                  ? 'bg-emerald-500/90 text-white'
                  : 'bg-blue-600/90 text-white'
              }`}
            >
              {registration.attended ? 'Attended (Present)' : 'Confirmed Pass'}
            </span>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4 space-y-2">
          {/* Category / Host */}
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
            <span className="text-[var(--primary)]">{event?.category || 'Event'}</span>
            <span>·</span>
            <span>{event?.eventType || 'Session'}</span>
            {registration.registrationType === 'Team' && (
              <>
                <span>·</span>
                <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                  <Users className="w-3 h-3" /> Team
                </span>
              </>
            )}
          </div>

          {/* Event Title */}
          <h3
            onClick={() => event && onViewEvent(event)}
            className="text-base font-bold text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors line-clamp-1 cursor-pointer"
          >
            {eventTitle}
          </h3>

          {/* Tagline */}
          {tagline && (
            <p className="text-xs text-[var(--primary)] font-medium truncate">
              {tagline}
            </p>
          )}

          {/* Date & Time */}
          <div className="pt-1 space-y-1 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
              <span className="truncate">
                {eventDate ? new Date(eventDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled Event'}
                {event?.startTime ? ` · ${event.startTime}` : ''}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">{venue}</span>
            </div>
          </div>

          {/* Additional details: Team name or Certificate status */}
          <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px]">
            {registration.teamName && (
              <span className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)] font-medium">
                Team: <strong>{registration.teamName}</strong>
              </span>
            )}
            {registration.certificateStatus && registration.certificateStatus !== 'Not Eligible' && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-semibold flex items-center gap-1">
                <Award className="w-3 h-3" /> Cert: {registration.certificateStatus}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

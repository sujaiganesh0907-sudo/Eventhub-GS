import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  Globe,
  Maximize2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { IEvent } from '../../types';
import { Modal } from '../common/Modal';

interface EventCardProps {
  event: IEvent;
  onViewEvent: (event: IEvent) => void;
  onRegister?: (event: IEvent) => void;
  isRegistered?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onViewEvent,
  onRegister,
  isRegistered = false,
}) => {
  const [showPosterModal, setShowPosterModal] = useState(false);

  // Poster fallback chain: (1) event.poster, (2) host college logo/cover
  const posterSrc =
    event.poster ||
    event.hostCollegeLogo ||
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80';

  const seatsLeft = event.seatsLeft !== undefined ? event.seatsLeft : Math.max(0, event.capacity - (event.registeredCount || 0));
  const isFull = event.isFull || seatsLeft <= 0;
  const isClosed = event.isClosed || event.deadlineStatus === 'Closed';

  // Format date readable
  const formattedDate = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <>
      <div className="group rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md flex flex-col">
        {/* 16:9 Poster Container with contain behavior (Section 15) */}
        <div className="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-pointer">
          <img
            src={posterSrc}
            alt={event.title}
            onClick={() => setShowPosterModal(true)}
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-102"
            onError={(e) => {
              (e.target as any).src =
                'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80';
            }}
          />

          {/* Expand Full Poster Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPosterModal(true);
            }}
            title="View Full Poster"
            className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Mode & Price Pill-Free Metadata Bar */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-sm text-white flex items-center gap-1">
              {event.eventMode === 'Online' ? (
                <Globe className="w-3.5 h-3.5 text-sky-400" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
              )}
              {event.eventMode}
            </span>

            <span
              className={`px-2.5 py-1 rounded-md font-bold backdrop-blur-sm ${
                event.isFree
                  ? 'bg-emerald-600/90 text-white'
                  : 'bg-indigo-600/90 text-white'
              }`}
            >
              {event.isFree ? 'FREE' : `$${event.registrationFee}`}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 flex flex-col grow justify-between">
          <div>
            {/* Host College Row with Verified Badge */}
            <div className="flex items-center gap-2 mb-2">
              <img
                src={
                  event.hostCollegeLogo ||
                  'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&auto=format&fit=crop&q=80'
                }
                alt="Host College Logo"
                className="w-5 h-5 rounded-md object-cover border border-[var(--border-color)]"
              />
              <span className="text-xs font-medium text-[var(--text-secondary)] truncate">
                {event.hostCollegeName}
              </span>
              {event.isCollegeVerified && (
                <span title="Verified College"><ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" /></span>
              )}
            </div>

            {/* Event Title */}
            <h3
              onClick={() => onViewEvent(event)}
              className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-color)] transition-colors line-clamp-1 cursor-pointer"
            >
              {event.title}
            </h3>

            {/* Quiet Metadata Line (Category, Type) */}
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
              <span>{event.category}</span>
              <span aria-hidden="true">·</span>
              <span>{event.eventType}</span>
              {event.tagline && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-32">{event.tagline}</span>
                </>
              )}
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mt-2.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                {event.startTime}
              </span>
            </div>

            {/* Short Description */}
            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-2 leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Card Footer: Seats Left + Action Buttons */}
          <div className="pt-3 mt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
            <div className="text-xs">
              <span className="text-[var(--text-muted)]">Seats left: </span>
              <span
                className={`font-bold ${
                  seatsLeft <= 5 ? 'text-red-500' : 'text-[var(--text-primary)]'
                }`}
              >
                {seatsLeft} / {event.capacity}
              </span>
              {event.deadlineStatus === 'Closing Soon' && (
                <p className="text-[10px] text-amber-500 font-semibold leading-none mt-0.5">
                  Closing soon!
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onViewEvent(event)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                View
              </button>

              {onRegister && !isRegistered && !isClosed && (
                <button
                  onClick={() => onRegister(event)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  Register
                </button>
              )}

              {isRegistered && (
                <span className="px-2.5 py-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 rounded-lg">
                  Registered
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Poster Modal */}
      <Modal
        isOpen={showPosterModal}
        onClose={() => setShowPosterModal(false)}
        title={event.title}
        subtitle={`${event.hostCollegeName} · ${event.category}`}
        maxWidth="3xl"
      >
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
          <img
            src={posterSrc}
            alt={event.title}
            className="w-full h-full object-contain"
          />
        </div>
      </Modal>
    </>
  );
};

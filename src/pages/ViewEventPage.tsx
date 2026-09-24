import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  Users,
  Award,
  DollarSign,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Share2,
  Ticket,
  Bell,
  BarChart3,
  Scan,
  Send,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  Car,
  Utensils,
  Bed,
  Bus,
  FileText,
  ExternalLink,
  Maximize2,
} from 'lucide-react';
import { IEvent, IEventRegistration } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';
import { RegistrationModal } from '../components/registration/RegistrationModal';
import { TicketModal } from '../components/registration/TicketModal';
import { ReminderModal } from '../components/event/ReminderModal';
import { AttendanceModal } from '../components/attendance/AttendanceModal';
import { IssueCertificateModal } from '../components/certificate/IssueCertificateModal';
import { EventInsightsModal } from '../components/event/EventInsightsModal';

interface ViewEventPageProps {
  eventId: string;
  onBack: () => void;
  onSelectCollege?: (collegeId: string) => void;
}

export const ViewEventPage: React.FC<ViewEventPageProps> = ({
  eventId,
  onBack,
  onSelectCollege,
}) => {
  const { user } = useAuth();

  const [event, setEvent] = useState<IEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userRegistration, setUserRegistration] = useState<IEventRegistration | null>(null);

  // Accordion state for "More Details"
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showFullPosterModal, setShowFullPosterModal] = useState(false);

  // Modals state
  const [showRegModal, setShowRegModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showIssueCertModal, setShowIssueCertModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>(`/events/${eventId}`);
      if (res.success && res.event) {
        setEvent(res.event);
        setIsRegistered(!!res.isRegistered);
        setUserRegistration(res.registration || null);
      } else {
        setError(res.message || 'Event not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--primary-color)] border-t-transparent animate-spin" />
        <p className="text-xs text-[var(--text-muted)]">Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-8 text-center max-w-md mx-auto rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-base font-bold text-[var(--text-primary)]">Event Unavailable</h3>
        <p className="text-xs text-[var(--text-secondary)]">{error || 'Could not find the requested event.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold"
        >
          Return to Events
        </button>
      </div>
    );
  }

  const isHostCollege = user?.collegeId && user.collegeId === event.hostCollegeId;
  const isCollegeStaff = user?.role === 'College Super Admin' || user?.role === 'College Admin';
  const canManage = isHostCollege && isCollegeStaff;

  const seatsLeft = event.seatsLeft !== undefined ? event.seatsLeft : Math.max(0, event.capacity - (event.registeredCount || 0));
  const isFull = event.isFull || seatsLeft <= 0;
  const isClosed = event.isClosed || event.deadlineStatus === 'Closed';
  const progressPercent = Math.min(100, Math.round(((event.registeredCount || 0) / event.capacity) * 100));

  const posterSrc =
    event.poster ||
    event.hostCollegeLogo ||
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80';

  const formattedDate = new Date(event.eventDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
        >
          ← Back to Discovery
        </button>

        {/* Organizer Tools Bar */}
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowInsightsModal(true)}
              className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-500" /> Analytics & Insights
            </button>
            <button
              onClick={() => setShowAttendanceModal(true)}
              className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-emerald-600 flex items-center gap-1.5 cursor-pointer"
            >
              <Scan className="w-3.5 h-3.5" /> Check-in Desk
            </button>
            <button
              onClick={() => setShowIssueCertModal(true)}
              className="px-3 py-1.5 rounded-lg bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Award className="w-3.5 h-3.5" /> Issue Certificates
            </button>
          </div>
        )}
      </div>

      {/* SECTION 17: 16:9 Poster Container with contain behavior */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-[var(--border-color)] shadow-md group">
        <img
          src={posterSrc}
          alt={event.title}
          onClick={() => setShowFullPosterModal(true)}
          className="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-101"
        />
        <button
          onClick={() => setShowFullPosterModal(true)}
          title="Expand Poster"
          className="absolute top-3 right-3 p-2 rounded-xl bg-black/70 text-white hover:bg-black/90 backdrop-blur-xs transition-opacity cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Event Header Card */}
      <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={
                event.hostCollegeLogo ||
                'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&auto=format&fit=crop&q=80'
              }
              alt={event.hostCollegeName}
              className="w-12 h-12 rounded-xl object-cover border border-[var(--border-color)]"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-[var(--text-primary)] hover:underline cursor-pointer">
                  {event.hostCollegeName}
                </span>
                {event.isCollegeVerified && (
                  <span title="Verified College"><ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" /></span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Hosted by {event.creatorRole === 'Student' ? 'Student Chapter' : 'Official University Department'} · {event.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)]">
              {event.eventType}
            </span>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-black ${
                event.isFree
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-indigo-500/10 text-indigo-600'
              }`}
            >
              {event.isFree ? 'FREE ENTRY' : `$${event.registrationFee} FEE`}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
            {event.title}
          </h1>
          {event.tagline && (
            <p className="text-sm font-medium text-[var(--text-secondary)] mt-1">
              "{event.tagline}"
            </p>
          )}
        </div>
      </div>

      {/* SECTION 18: Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: DATE */}
        <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Event Date</span>
            <span className="text-sm font-bold text-[var(--text-primary)] block truncate">{formattedDate}</span>
            <span className="text-[11px] text-[var(--text-muted)]">Check-in at {event.reportingTime || event.startTime}</span>
          </div>
        </div>

        {/* Card 2: TIME */}
        <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Schedule & Time</span>
            <span className="text-sm font-bold text-[var(--text-primary)] block">
              {event.startTime} - {event.endTime}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">Reporting: {event.reportingTime || 'On-time'}</span>
          </div>
        </div>

        {/* Card 3: VENUE / MODE */}
        <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
            {event.eventMode === 'Online' ? <Globe className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
              Mode · {event.eventMode}
            </span>
            <span className="text-sm font-bold text-[var(--text-primary)] block truncate">
              {event.eventMode === 'Online' ? event.meetingPlatform || 'Online Platform' : event.venue || 'Campus Venue'}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] truncate block">
              {event.eventMode === 'Online' ? 'Meeting link sent on pass' : event.hallRoom || 'Main Auditorium'}
            </span>
          </div>
        </div>

        {/* Card 4: PRICE */}
        <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Registration Fee</span>
            <span className="text-base font-black text-[var(--primary-color)] block">
              {event.isFree ? 'FREE REGISTRATION' : `$${event.registrationFee} USD`}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              {event.registrationType} pass
            </span>
          </div>
        </div>

        {/* Card 5: SEATS PROGRESS BAR */}
        <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Capacity & Seats</span>
            <span className={`text-xs font-bold ${seatsLeft <= 5 ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
              {seatsLeft} seats left
            </span>
          </div>
          <div className="w-full bg-[var(--surface-subtle)] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                seatsLeft <= 5 ? 'bg-red-500' : 'bg-[var(--primary-color)]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            {event.registeredCount || 0} registered of {event.capacity} total slots
          </p>
        </div>

        {/* Card 6: DEADLINE STATUS */}
        <div
          className={`p-4 rounded-2xl border shadow-xs space-y-1 ${
            isClosed
              ? 'border-red-500/30 bg-red-500/10 text-red-600'
              : event.deadlineStatus === 'Closing Soon'
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
          }`}
        >
          <span className="text-[10px] uppercase font-bold block">Registration Status</span>
          <span className="text-base font-black block">
            {isClosed ? 'REGISTRATION CLOSED' : event.deadlineStatus === 'Closing Soon' ? 'CLOSING SOON' : 'OPEN FOR ENTRIES'}
          </span>
          <p className="text-[11px] opacity-80 truncate">
            Deadline: {new Date(event.registrationDeadline).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Primary Action Button Bar */}
      <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs">
          {isRegistered ? (
            <div className="flex items-center gap-2 text-emerald-600 font-bold">
              <CheckCircle2 className="w-5 h-5" />
              <span>You have a confirmed entry pass for this event!</span>
            </div>
          ) : isClosed ? (
            <span className="text-red-500 font-bold">
              Registrations are officially closed for this event.
            </span>
          ) : isFull ? (
            <span className="text-amber-500 font-bold">
              Event capacity has been fully reached.
            </span>
          ) : (
            <span className="text-[var(--text-secondary)]">
              Secure your verified entry ticket with instant QR check-in pass.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isRegistered ? (
            <>
              <button
                onClick={() => setShowTicketModal(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
              >
                <Ticket className="w-4 h-4" /> View Entry Pass
              </button>
              <button
                onClick={() => setShowReminderModal(true)}
                className="px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-4 h-4" /> Set Reminder
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowRegModal(true)}
              disabled={isClosed || isFull}
              className="px-8 py-3 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] font-extrabold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Ticket className="w-4 h-4" /> Register Now
            </button>
          )}
        </div>
      </div>

      {/* SECTION 19: Main Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: About & Eligibility */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Event */}
          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-3">
            <h3 className="text-base font-bold text-[var(--text-primary)]">About the Event</h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* Eligibility Criteria */}
          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-3">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Eligibility & Participation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Education Levels</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {event.educationLevel?.join(', ') || 'All Higher Education'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Eligible Years</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {event.eligibleYears?.join(', ') || 'All Academic Years'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Departments</span>
                <span className="font-semibold text-[var(--text-primary)] truncate block">
                  {event.departments?.join(', ') || 'All Departments'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Institutions</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {event.institutionRestriction || 'Open to All Colleges'}
                </span>
              </div>
            </div>
            {event.additionalEligibilityNotes && (
              <p className="text-xs text-[var(--text-muted)] pt-1">
                Note: {event.additionalEligibilityNotes}
              </p>
            )}
          </div>

          {/* Prizes & Certificates Summary */}
          {(event.prizeAvailable || event.certificateAvailable) && (
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" /> Prizes & Verified Certificates
              </h3>

              {event.prizeAvailable && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-700 dark:text-amber-300">Total Prize Pool</span>
                    <span className="text-base font-black text-amber-700 dark:text-amber-300">
                      ${event.totalPrizePool || 0} USD
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {event.firstPrize && (
                      <div className="p-2 rounded-lg bg-[var(--surface)] text-center">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] block">1st Prize</span>
                        <span className="font-bold text-[var(--text-primary)]">{event.firstPrize}</span>
                      </div>
                    )}
                    {event.secondPrize && (
                      <div className="p-2 rounded-lg bg-[var(--surface)] text-center">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] block">2nd Prize</span>
                        <span className="font-bold text-[var(--text-primary)]">{event.secondPrize}</span>
                      </div>
                    )}
                    {event.thirdPrize && (
                      <div className="p-2 rounded-lg bg-[var(--surface)] text-center">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] block">3rd Prize</span>
                        <span className="font-bold text-[var(--text-primary)]">{event.thirdPrize}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {event.certificateAvailable && (
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-[var(--text-primary)]">
                      {event.participationCertificate ? 'Participation Certificate' : 'Merit Certificate'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-[var(--text-primary)]">
                      Verified Digital Credential
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Coordinators & Venue Contact */}
        <div className="space-y-6">
          {/* Primary Coordinator Card */}
          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Lead Event Coordinator
            </h3>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                {event.primaryCoordinator?.name}
              </h4>
              <p className="text-xs text-[var(--text-muted)]">{event.primaryCoordinator?.role}</p>
            </div>
            <div className="space-y-2 pt-2 border-t border-[var(--border-color)] text-xs">
              <a
                href={`tel:${event.primaryCoordinator?.phone}`}
                className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--primary-color)]"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{event.primaryCoordinator?.phone}</span>
              </a>
              <a
                href={`mailto:${event.primaryCoordinator?.email}`}
                className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--primary-color)] truncate"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{event.primaryCoordinator?.email}</span>
              </a>
            </div>
          </div>

          {/* Amenities & Facilities */}
          <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Campus Facilities
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Utensils className={`w-4 h-4 ${event.facilities?.food ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`} />
                <span>{event.facilities?.food ? 'Meals / Refreshments Provided' : 'Food on Own Expense'}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Car className={`w-4 h-4 ${event.facilities?.parking ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`} />
                <span>{event.facilities?.parking ? 'Campus Visitor Parking Available' : 'No Reserved Parking'}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Bus className={`w-4 h-4 ${event.facilities?.transport ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`} />
                <span>{event.facilities?.transport ? 'Campus Transit Shuttles' : 'Self-Arranged Transport'}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <Bed className={`w-4 h-4 ${event.facilities?.accommodation ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`} />
                <span>{event.facilities?.accommodation ? 'Hostel Lodging Available' : 'No Accommodation'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 20: "More Details" Accordion Section */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowMoreDetails(!showMoreDetails)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--primary-color)]" />
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                More Details & Competition Format
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Rounds breakdown, judging criteria, software/hardware requirements, and rules
              </p>
            </div>
          </div>
          {showMoreDetails ? <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />}
        </button>

        {showMoreDetails && (
          <div className="p-6 border-t border-[var(--border-color)] space-y-6 bg-[var(--surface-subtle)]/50">
            {/* Rules & Guidelines */}
            {event.rulesAndGuidelines && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Rules & Guidelines
                </h4>
                <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                  {event.rulesAndGuidelines}
                </p>
              </div>
            )}

            {/* Rounds and Judging */}
            {event.hasMultipleRounds && event.rounds && event.rounds.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Competition Format & Rounds
                </h4>
                <div className="space-y-2.5">
                  {event.rounds.map((r, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--text-primary)]">{r.name}</span>
                        {r.duration && (
                          <span className="text-[11px] text-[var(--text-muted)] font-mono">{r.duration}</span>
                        )}
                      </div>
                      <p className="text-[var(--text-secondary)]">{r.description}</p>
                      {r.judgingCriteria && (
                        <p className="text-[11px] text-[var(--text-muted)]">
                          <span className="font-semibold text-[var(--text-primary)]">Judging Criteria: </span>
                          {r.judgingCriteria}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Materials */}
            {event.requiredMaterials && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Required Materials & Things to Carry
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">{event.requiredMaterials}</p>
              </div>
            )}

            {/* Custom Organizer Fields (Section 20 & 40) */}
            {event.customDetails && event.customDetails.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Additional Event Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.customDetails.map((cd) => (
                    <div key={cd.id} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs">
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">{cd.label}</span>
                      {cd.type === 'Link' ? (
                        <a href={cd.value} target="_blank" rel="noreferrer" className="text-[var(--primary-color)] hover:underline flex items-center gap-1 font-semibold mt-0.5">
                          {cd.value} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="font-bold text-[var(--text-primary)] mt-0.5 block">{cd.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULL POSTER MODAL */}
      <Modal
        isOpen={showFullPosterModal}
        onClose={() => setShowFullPosterModal(false)}
        title={event.title}
        subtitle={`${event.hostCollegeName} · Official Event Poster`}
        maxWidth="3xl"
      >
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
          <img src={posterSrc} alt={event.title} className="w-full h-full object-contain" />
        </div>
      </Modal>

      {/* REGISTRATION MODAL */}
      {showRegModal && (
        <RegistrationModal
          isOpen={showRegModal}
          onClose={() => setShowRegModal(false)}
          event={event}
          onRegistrationSuccess={() => {
            setShowRegModal(false);
            fetchEventData();
          }}
        />
      )}

      {/* TICKET PASS MODAL */}
      {showTicketModal && userRegistration && (
        <TicketModal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          registration={userRegistration}
          event={event}
        />
      )}

      {/* REMINDER MODAL */}
      {showReminderModal && (
        <ReminderModal
          isOpen={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          event={event}
        />
      )}

      {/* ATTENDANCE CHECK-IN MODAL (For Organizer) */}
      {showAttendanceModal && (
        <AttendanceModal
          isOpen={showAttendanceModal}
          onClose={() => setShowAttendanceModal(false)}
          event={event}
        />
      )}

      {/* ISSUE CERTIFICATE MODAL (For Organizer) */}
      {showIssueCertModal && (
        <IssueCertificateModal
          isOpen={showIssueCertModal}
          onClose={() => setShowIssueCertModal(false)}
          event={event}
        />
      )}

      {/* INSIGHTS MODAL (For Organizer) */}
      {showInsightsModal && (
        <EventInsightsModal
          isOpen={showInsightsModal}
          onClose={() => setShowInsightsModal(false)}
          event={event}
        />
      )}
    </div>
  );
};

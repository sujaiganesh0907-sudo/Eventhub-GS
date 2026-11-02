import React, { useState, useEffect } from 'react';
import { IEvent, IEventRegistration, IOrganizerPost } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DEFAULT_COLLEGE_LOGO, DEFAULT_EVENT_POSTER } from '../services/imageDefaults';
import { Modal } from '../components/common/Modal';
import { DocxCertificateManagerModal } from '../components/certificate/DocxCertificateManagerModal';
import { AttendanceModal } from '../components/attendance/AttendanceModal';
import { EventRegistrationsModal } from '../components/registration/EventRegistrationsModal';
import { CreateOrganizerPostModal } from '../components/profile/CreateOrganizerPostModal';
import { MultiStepEventForm } from '../components/event/MultiStepEventForm';
import {
  Calendar,
  Users,
  CheckCircle2,
  Award,
  Plus,
  Scan,
  ShieldCheck,
  ChevronRight,
  Eye,
  FileText,
  Clock,
  MapPin,
  MessageSquare,
  Edit,
  Heart,
  MessageCircle,
  Share2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface OrganizerHomePageProps {
  onOpenCreateEvent: () => void;
  onSelectTab: (tab: string) => void;
  onViewEvent: (event: IEvent) => void;
}

export const OrganizerHomePage: React.FC<OrganizerHomePageProps> = ({
  onOpenCreateEvent,
  onSelectTab,
  onViewEvent,
}) => {
  const { user, organizerProfile } = useAuth();

  const [events, setEvents] = useState<IEvent[]>([]);
  const [registrations, setRegistrations] = useState<IEventRegistration[]>([]);
  const [posts, setPosts] = useState<IOrganizerPost[]>([]);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = React.useRef(false);

  // Modals
  const [activeDrilldownModal, setActiveDrilldownModal] = useState<
    'active_events' | 'upcoming_events' | 'registrations' | 'attendance' | 'certificates' | null
  >(null);
  const [drilldownSelectedEventId, setDrilldownSelectedEventId] = useState<string | null>(null);
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<IEvent | null>(null);
  const [selectedEventForCertificates, setSelectedEventForCertificates] = useState<IEvent | null>(null);
  const [selectedEventForRegistrations, setSelectedEventForRegistrations] = useState<IEvent | null>(null);
  const [eventToEdit, setEventToEdit] = useState<IEvent | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  const fetchOrganizerData = async () => {
    const token = localStorage.getItem('eventhub_token');
    if (!user || !token || user.role !== 'Organizer') {
      setLoading(false);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      setLoading(true);
      const [eventsRes, regsRes, postsRes] = await Promise.all([
        api.get<any>('/organizer/events'),
        api.get<any>('/registrations/college'),
        api.get<any>('/organizer/posts'),
      ]);

      if (eventsRes.success) setEvents(eventsRes.events || eventsRes.proposals || []);
      if (regsRes.success) setRegistrations(regsRes.registrations || []);
      if (postsRes.success) {
        const myPosts = (postsRes.posts || []).filter(
          (p: IOrganizerPost) => p.organizerUserId === user._id || p.organizerId === (organizerProfile?._id || user._id)
        );
        setPosts(myPosts);
      }
    } catch (err) {
      console.error('Failed to load organizer dashboard data', err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizerData();
  }, [user?._id, organizerProfile?._id]);

  // Derived metrics
  const activeEventsCount = events.filter((e) => e.status === 'Published').length;
  const upcomingEventsCount = events.filter(
    (e) => (e.status === 'Published' || e.status === 'Approved') && new Date(e.eventDate).getTime() >= Date.now()
  ).length;
  const totalRegistrations = registrations.length;
  const attendanceMarked = registrations.filter((r) => r.attended).length;
  const certificatesIssued = registrations.filter((r) => r.certificateIssued).length;

  const orgName = organizerProfile?.organizationName || user?.fullName || 'Event Organizer';
  const orgLogo = organizerProfile?.logo || DEFAULT_COLLEGE_LOGO;

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Organizer Hero Banner (Matching Approver Banner Structure) */}
      <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <img
              src={orgLogo}
              alt={orgName}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[var(--border-color)] bg-[var(--surface-subtle)] shrink-0 shadow-sm"
              onError={(e) => {
                (e.target as any).src = DEFAULT_COLLEGE_LOGO;
              }}
            />
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight truncate">
                  {orgName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Organizer
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-2 flex-wrap">
                <span>{organizerProfile?.organizationType || 'Professional Event Organization'}</span>
                <span>•</span>
                <span>{organizerProfile?.location || 'India'}</span>
                <span>•</span>
                <span>{user?.email}</span>
              </p>
              {organizerProfile?.bio && (
                <p className="text-xs text-[var(--text-secondary)] line-clamp-1 max-w-xl">
                  {organizerProfile.bio}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={onOpenCreateEvent}
              className="px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" /> Propose Event
            </button>
            <button
              type="button"
              onClick={() => setIsCreatePostOpen(true)}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <FileText className="w-4 h-4 text-indigo-500" /> New Post
            </button>
          </div>
        </div>
      </div>

      {/* 2. Stat Metric Cards (Matching Approver Grid Structure) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Active Events */}
        <div
          onClick={() => setActiveDrilldownModal('active_events')}
          className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all cursor-pointer shadow-xs group"
          title="Click to view published events"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block group-hover:text-[var(--primary-color)]">
              Active Events
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--primary-color)]" />
          </div>
          <span className="text-2xl font-black text-[var(--text-primary)] mt-1 block">
            {activeEventsCount}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Live published</span>
        </div>

        {/* Upcoming Events */}
        <div
          onClick={() => setActiveDrilldownModal('upcoming_events')}
          className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-blue-500 transition-all cursor-pointer shadow-xs group"
          title="Click to view upcoming events"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block group-hover:text-blue-500">
              Upcoming
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-blue-500" />
          </div>
          <span className="text-2xl font-black text-blue-600 mt-1 block">
            {upcomingEventsCount}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Scheduled</span>
        </div>

        {/* Total Registrations */}
        <div
          onClick={() => setActiveDrilldownModal('registrations')}
          className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all cursor-pointer shadow-xs group"
          title="Click to view registrations and student roster"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block group-hover:text-[var(--primary-color)]">
              Registrations
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--primary-color)]" />
          </div>
          <span className="text-2xl font-black text-[var(--primary-color)] mt-1 block">
            {totalRegistrations}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Total attendees</span>
        </div>

        {/* Attendance */}
        <div
          onClick={() => setActiveDrilldownModal('attendance')}
          className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-emerald-500 transition-all cursor-pointer shadow-xs group"
          title="Click to view Attendance per event and launch Check-In Desk"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block">
              Attendance
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {attendanceMarked}
          </span>
          <span className="text-[10px] text-emerald-600/70 mt-1 block">Checked-in</span>
        </div>

        {/* Certificates */}
        <div
          onClick={() => setActiveDrilldownModal('certificates')}
          className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-amber-500 transition-all cursor-pointer shadow-xs group"
          title="Click to view and manage Certificates"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-600 block">
              Certificates
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {certificatesIssued}
          </span>
          <span className="text-[10px] text-amber-600/70 mt-1 block">Issued</span>
        </div>

        {/* Posts & Followers */}
        <div
          onClick={() => onSelectTab('profile')}
          className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-purple-500 transition-all cursor-pointer shadow-xs group"
          title="Click to view profile and followers"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-purple-600 block">
              Followers
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <span className="text-2xl font-black text-purple-600 mt-1 block">
            {organizerProfile?.followersCount || 0}
          </span>
          <span className="text-[10px] text-purple-600/70 mt-1 block">
            {posts.length} Posts
          </span>
        </div>
      </div>

      {/* 3. Quick Management Actions Grid (Matching Approver Grid Structure) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Quick Management Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={onOpenCreateEvent}
            className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all cursor-pointer shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Propose Event</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Submit hackathons or workshop proposals to accredited partner colleges.
            </p>
          </div>

          <div
            onClick={() => setActiveDrilldownModal('attendance')}
            className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-emerald-500 transition-all cursor-pointer shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Scan className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Check-In Desk</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Launch live camera QR scanner or search pass ID for instant check-in.
            </p>
          </div>

          <div
            onClick={() => setActiveDrilldownModal('certificates')}
            className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-amber-500 transition-all cursor-pointer shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Certificate Studio</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Upload custom DOCX templates and batch issue verified credentials.
            </p>
          </div>

          <div
            onClick={() => setIsCreatePostOpen(true)}
            className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-purple-500 transition-all cursor-pointer shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Publish Update</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Broadcast event posters, teaser videos, or updates to student participants.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout: Organized Events & Organizer Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Organized Events List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--primary-color)]" /> Your Organized Events ({events.length})
            </h3>
            <button
              onClick={() => onSelectTab('events')}
              className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Manage all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {events.length === 0 ? (
            <div className="p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] text-center space-y-3">
              <Calendar className="w-10 h-10 mx-auto text-[var(--text-muted)]" />
              <p className="text-sm font-bold text-[var(--text-primary)]">No events proposed or organized yet</p>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Submit an event proposal to partner colleges to start welcoming student participants.
              </p>
              <button
                type="button"
                onClick={onOpenCreateEvent}
                className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold cursor-pointer hover:opacity-90"
              >
                Propose Your First Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 6).map((ev) => {
                const regCount = registrations.filter((r) => r.eventId === ev._id).length;
                const attendedEvCount = registrations.filter((r) => r.eventId === ev._id && r.attended).length;

                return (
                  <div
                    key={ev._id}
                    className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={ev.poster || DEFAULT_EVENT_POSTER}
                        alt={ev.title}
                        className="w-16 h-12 rounded-xl object-cover border border-[var(--border-color)] shrink-0 bg-slate-900"
                        onError={(e) => {
                          (e.target as any).src = DEFAULT_EVENT_POSTER;
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            onClick={() => onViewEvent(ev)}
                            className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--primary-color)] cursor-pointer truncate"
                          >
                            {ev.title}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              ev.status === 'Published'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : ev.status === 'Pending Approval'
                                ? 'bg-amber-500/10 text-amber-600'
                                : ev.status === 'Draft'
                                ? 'bg-zinc-500/10 text-zinc-500'
                                : 'bg-red-500/10 text-red-600'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                          {ev.eventDate} · {ev.venue || ev.meetingPlatform || ev.eventMode} · Partner: {ev.hostCollegeName}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                          Registrations: <strong>{regCount || ev.registeredCount || 0}</strong> / {ev.capacity} · Attended: <strong>{attendedEvCount}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedEventForRegistrations(ev)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1 cursor-pointer shadow-xs"
                        title="View spreadsheet-style participant registrations & export CSV"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        Registrations ({regCount})
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedEventForAttendance(ev)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Launch check-in scanner"
                      >
                        <Scan className="w-3.5 h-3.5 text-emerald-500" />
                        Attendance
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEventToEdit(ev);
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        title="Edit event proposal"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onViewEvent(ev)}
                        className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        title="View event public page"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Organizer Posts & Updates */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" /> Posts & Announcements
            </h3>
            <button
              onClick={() => setIsCreatePostOpen(true)}
              className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New Post
            </button>
          </div>

          <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-3">
            {posts.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <FileText className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
                <p className="text-xs font-bold text-[var(--text-primary)]">No updates posted yet</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Share event announcements, posters, and highlights with your collegiate followers.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreatePostOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Create First Post
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 divide-y divide-[var(--border-color)]">
                {posts.slice(0, 5).map((post) => (
                  <div key={post._id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600">
                        {post.postType}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-primary)] line-clamp-2">
                      {post.content}
                    </p>

                    {post.mediaUrl && (
                      <img
                        src={post.mediaUrl}
                        alt="Post media"
                        className="w-full h-28 object-cover rounded-xl border border-[var(--border-color)]"
                      />
                    )}

                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] pt-1">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500" /> {post.likesCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5 text-blue-500" /> {post.commentsCount || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE DRILLDOWN MODALS PER SUMMARY CARD                             */}
      {/* ========================================================================= */}

      {/* 1. Active Events Modal */}
      {activeDrilldownModal === 'active_events' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveDrilldownModal(null)}
          title="Active Events (Published)"
          subtitle="Events currently accepting participant registrations"
          maxWidth="3xl"
        >
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {events.filter((e) => e.status === 'Published').length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">
                No active published events at this moment.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {events
                  .filter((e) => e.status === 'Published')
                  .map((ev) => (
                    <div
                      key={ev._id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] p-2.5 rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{ev.title}</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          📅 {ev.eventDate} · 📍 {ev.venue || ev.eventMode} · Partner: {ev.hostCollegeName}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                          Registrations: <strong>{ev.registeredCount || 0}</strong> / {ev.capacity}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDrilldownModal(null);
                            setSelectedEventForRegistrations(ev);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-semibold hover:bg-[var(--surface-subtle)] flex items-center gap-1 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-blue-500" /> Registrations
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDrilldownModal(null);
                            onViewEvent(ev);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[var(--primary-color)] text-white text-xs font-semibold hover:opacity-90 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 2. Upcoming Events Modal */}
      {activeDrilldownModal === 'upcoming_events' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveDrilldownModal(null)}
          title="Upcoming Events"
          subtitle="All scheduled future events"
          maxWidth="3xl"
        >
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {events.filter((e) => new Date(e.eventDate).getTime() >= Date.now()).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">
                No upcoming events scheduled.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {events
                  .filter((e) => new Date(e.eventDate).getTime() >= Date.now())
                  .map((ev) => (
                    <div
                      key={ev._id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] p-2.5 rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{ev.title}</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          📅 {ev.eventDate} ({ev.startTime} - {ev.endTime}) · 📍 {ev.venue || ev.eventMode}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 mt-1 inline-block">
                          Status: {ev.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDrilldownModal(null);
                            onViewEvent(ev);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[var(--primary-color)] text-white text-xs font-semibold hover:opacity-90 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 3. Registrations Drilldown Modal */}
      {activeDrilldownModal === 'registrations' && (
        <Modal
          isOpen={true}
          onClose={() => {
            setActiveDrilldownModal(null);
            setDrilldownSelectedEventId(null);
          }}
          title={
            drilldownSelectedEventId
              ? `Registered Students — ${events.find((e) => e._id === drilldownSelectedEventId)?.title || 'Event'}`
              : 'Registrations By Event'
          }
          subtitle={
            drilldownSelectedEventId
              ? 'Select student to view details or launch spreadsheet view'
              : 'Select an event to view full participant roster and spreadsheet export'
          }
          maxWidth="3xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="divide-y divide-[var(--border-color)]">
              {events.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-8">No events available.</p>
              ) : (
                events.map((ev) => {
                  const regCount = registrations.filter((r) => r.eventId === ev._id).length;
                  return (
                    <div
                      key={ev._id}
                      onClick={() => {
                        setActiveDrilldownModal(null);
                        setSelectedEventForRegistrations(ev);
                      }}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] p-2.5 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{ev.title}</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {ev.eventDate} · Capacity: {ev.capacity} · Mode: {ev.eventMode}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-base font-black text-[var(--primary-color)]">
                            {regCount}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] block">Registered</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 4. Attendance Desk Selection Modal */}
      {activeDrilldownModal === 'attendance' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveDrilldownModal(null)}
          title="Check-In Desk / Attendance Scanner"
          subtitle="Select an event to launch QR scanner or manage attendee attendance"
          maxWidth="2xl"
        >
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {events.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">No events found.</p>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {events.map((ev) => {
                  const attendedEvCount = registrations.filter((r) => r.eventId === ev._id && r.attended).length;
                  const regCount = registrations.filter((r) => r.eventId === ev._id).length;

                  return (
                    <div
                      key={ev._id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] p-2 rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{ev.title}</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {ev.eventDate} · Checked In: {attendedEvCount} / {regCount}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveDrilldownModal(null);
                          setSelectedEventForAttendance(ev);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Scan className="w-3.5 h-3.5" /> Launch Check-In
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 5. Certificates Selection Modal */}
      {activeDrilldownModal === 'certificates' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveDrilldownModal(null)}
          title="Certificate Studio"
          subtitle="Select an event to upload templates and issue certificates"
          maxWidth="2xl"
        >
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {events.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">No events found.</p>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {events.map((ev) => (
                  <div
                    key={ev._id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] p-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">{ev.title}</h4>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {ev.eventDate} · Issued: {ev.certificatesIssuedCount || 0}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveDrilldownModal(null);
                        setSelectedEventForCertificates(ev);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Award className="w-3.5 h-3.5" /> Manage Certificates
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Spreadsheet-Style Registrations Modal with CSV Export */}
      {selectedEventForRegistrations && (
        <EventRegistrationsModal
          isOpen={true}
          onClose={() => setSelectedEventForRegistrations(null)}
          event={selectedEventForRegistrations}
        />
      )}

      {/* Live QR Attendance Modal */}
      {selectedEventForAttendance && (
        <AttendanceModal
          isOpen={true}
          onClose={() => {
            setSelectedEventForAttendance(null);
            fetchOrganizerData();
          }}
          event={selectedEventForAttendance}
        />
      )}

      {/* DOCX Certificate Template & Bulk Issuer Modal */}
      {selectedEventForCertificates && (
        <DocxCertificateManagerModal
          isOpen={true}
          onClose={() => {
            setSelectedEventForCertificates(null);
            fetchOrganizerData();
          }}
          event={selectedEventForCertificates}
        />
      )}


      {/* Create Organizer Post Modal */}
      {isCreatePostOpen && (
        <CreateOrganizerPostModal
          isOpen={true}
          onClose={() => setIsCreatePostOpen(false)}
          organizerEvents={events}
          onPostCreated={() => {
            setIsCreatePostOpen(false);
            fetchOrganizerData();
          }}
        />
      )}

      {/* Edit Event Proposal Modal */}
      {isEditModalOpen && eventToEdit && (
        <MultiStepEventForm
          isOpen={true}
          eventToEdit={eventToEdit}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setEventToEdit(null);
            fetchOrganizerData();
          }}
          onClose={() => {
            setIsEditModalOpen(false);
            setEventToEdit(null);
          }}
        />
      )}
    </div>
  );
};

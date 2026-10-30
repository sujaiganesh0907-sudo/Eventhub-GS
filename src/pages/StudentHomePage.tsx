import React, { useState, useEffect } from 'react';
import { IEvent, ICollege } from '../types';
import { useAuth } from '../context/AuthContext';
import { EventCard } from '../components/event/EventCard';
import { EventCardSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { FilterState, CATEGORIES } from '../components/event/EventFilterModal';
import { CredentialFeedSection } from '../components/certificate/CredentialFeedSection';
import { api } from '../services/api';
import { DEFAULT_COLLEGE_LOGO } from '../services/imageDefaults';
import {
  Sparkles,
  Calendar,
  Flame,
  TrendingUp,
  Building2,
  Compass,
  ArrowRight,
  Award,
  CheckCircle2,
  FileText,
  MapPin,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { CreateOrganizerPostModal } from '../components/profile/CreateOrganizerPostModal';

interface StudentHomePageProps {
  searchQuery: string;
  filters: FilterState;
  onViewEvent: (event: IEvent) => void;
  onRegister: (event: IEvent) => void;
  onSelectTab: (tab: string) => void;
  onOpenFilter: () => void;
}

export const StudentHomePage: React.FC<StudentHomePageProps> = ({
  searchQuery,
  filters,
  onViewEvent,
  onRegister,
  onSelectTab,
  onOpenFilter,
}) => {
  const { user, studentProfile } = useAuth();
  const [mainView, setMainView] = useState<'events' | 'credentials'>('events');
  const [events, setEvents] = useState<IEvent[]>([]);
  const [colleges, setColleges] = useState<ICollege[]>([]);
  const [connectedCollegeIds, setConnectedCollegeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryChip, setSelectedCategoryChip] = useState('All');
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [stats, setStats] = useState({
    upcomingCount: 0,
    registeredCount: 0,
    proposalsCount: 0,
    certificatesCount: 0,
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (filters.category && filters.category !== 'All') params.category = filters.category;
      if (filters.isFree && filters.isFree !== 'all') params.isFree = filters.isFree;
      if (filters.mode && filters.mode !== 'all') params.mode = filters.mode;
      if (filters.collegeId) params.collegeId = filters.collegeId;
      if (filters.sort) params.sort = filters.sort;

      const [eventRes, collegeRes] = await Promise.all([
        api.get<any>('/events', params),
        api.get<any>('/colleges'),
      ]);

      if (eventRes.success) setEvents(eventRes.events || []);
      if (collegeRes.success) setColleges(collegeRes.colleges || []);

      if (user?.role === 'Student' && studentProfile?._id) {
        try {
          const connRes = await api.get<any>(`/social/student/${studentProfile._id}/connected-colleges`);
          if (connRes?.success && Array.isArray(connRes.colleges)) {
            setConnectedCollegeIds(connRes.colleges.map((c: any) => c._id));
          }
        } catch {
          // graceful
        }
      }
    } catch (err) {
      console.error('Failed to load home events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [searchQuery, filters]);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (user?.role !== 'Student') return;
      try {
        const [regRes, propRes, certRes] = await Promise.all([
          api.get<any>('/registrations/student').catch(() => ({ registrations: [] })),
          api.get<any>('/student/my-events').catch(() => ({ events: [] })),
          api.get<any>('/certificates/my-certificates').catch(() => ({ certificates: [] })),
        ]);
        setStats((prev) => ({
          ...prev,
          registeredCount: Array.isArray(regRes?.registrations) ? regRes.registrations.length : 0,
          proposalsCount: Array.isArray(propRes?.events) ? propRes.events.length : 0,
          certificatesCount: Array.isArray(certRes?.certificates) ? certRes.certificates.length : 0,
        }));
      } catch {
        // graceful
      }
    };
    fetchUserStats();
  }, [user]);

  // Client category chip filter
  const displayedEvents = selectedCategoryChip === 'All'
    ? events
    : events.filter((e) => e.category.toLowerCase() === selectedCategoryChip.toLowerCase());

  // Connected colleges events (Requirement 5)
  const connectedCollegeEvents = displayedEvents.filter(
    (e) => connectedCollegeIds.includes(e.hostCollegeId)
  );

  // Segregate sections for Discovery (Section 12)
  const upcomingEvents = [...displayedEvents].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );
  const popularEvents = [...displayedEvents].sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0));
  const latestEvents = [...displayedEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-8 pb-16 w-full max-w-[1440px] mx-auto">
      {/* Top Feed View Selector: Events Discovery vs Verified Credentials Community Feed */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMainView('events')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mainView === 'events'
                ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discover Events</span>
          </button>

          <button
            type="button"
            onClick={() => setMainView('credentials')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mainView === 'credentials'
                ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Verified Credentials Feed</span>
          </button>
        </div>
      </div>

      {mainView === 'credentials' ? (
        <CredentialFeedSection />
      ) : (
        <>
          {/* Participant Dashboard Header & Stats (Reference Collage: Row 1, Image 3) */}
          {!searchQuery && (
            <div className="space-y-6">
              {/* Greeting */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                    Hello, {user?.fullName || 'Rahul Kumar'}! <span>👋</span>
                  </h1>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {user?.role === 'Organizer' ? 'Organize, Announce, Broadcast' : 'Discover, Participate, Grow'}
                  </p>
                </div>

                {user?.role === 'Organizer' && (
                  <button
                    type="button"
                    onClick={() => setIsCreatePostModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Create Post</span>
                  </button>
                )}
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] block">Upcoming Events</span>
                    <span className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-0.5 block">{stats.upcomingCount || events.length}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] block">Registered Events</span>
                    <span className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-0.5 block">{stats.registeredCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] block">My Proposals</span>
                    <span className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-0.5 block">{stats.proposalsCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] block">Certificates</span>
                    <span className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-0.5 block">{stats.certificatesCount}</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Hero Featured Event Banner & Upcoming Events Mini List */}
              {events.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  {/* Featured Event Banner */}
                  <div className="lg:col-span-8 rounded-2xl overflow-hidden border border-[var(--border-color)] bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative p-6 sm:p-8 flex flex-col justify-between shadow-lg">
                    {events[0].poster && (
                      <div className="absolute inset-0 opacity-25 mix-blend-overlay">
                        <img src={events[0].poster} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="relative z-10 space-y-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 inline-block">
                        Featured Event
                      </span>
                      <h2 className="text-xl sm:text-3xl font-black tracking-tight line-clamp-2">
                        {events[0].title}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 max-w-xl">
                        {events[0].tagline || events[0].description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>{events[0].eventDate}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="truncate">{events[0].venue || events[0].meetingPlatform || 'College Auditorium'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 pt-5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onRegister(events[0])}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Register Now
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewEvent(events[0])}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all backdrop-blur-xs cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  </div>

                  {/* Upcoming Events Mini List */}
                  <div className="lg:col-span-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-[var(--text-primary)]">Upcoming Events</h3>
                        <span className="text-[10px] font-semibold text-indigo-600">Quick Register</span>
                      </div>
                      <div className="space-y-2.5">
                        {upcomingEvents.slice(0, 3).map((ev) => (
                          <div
                            key={ev._id}
                            className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex items-center justify-between gap-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <h4
                                onClick={() => onViewEvent(ev)}
                                className="text-xs font-bold text-[var(--text-primary)] truncate hover:text-indigo-600 cursor-pointer"
                              >
                                {ev.title}
                              </h4>
                              <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                                📅 {ev.eventDate}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRegister(ev)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0 shadow-2xs active:scale-95 cursor-pointer"
                            >
                              Register
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions Row */}
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {user?.role === 'Organizer' ? (
                    <button
                      type="button"
                      onClick={() => setIsCreatePostModalOpen(true)}
                      className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 hover:border-indigo-500 transition-all flex items-center gap-3 cursor-pointer shadow-xs text-left group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">+ Create Post</span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block">Announce or video update</span>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('events-discovery-section');
                        el?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-indigo-500 transition-all flex items-center gap-3 cursor-pointer shadow-xs text-left group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[var(--text-primary)] block">Register Event</span>
                        <span className="text-[10px] text-[var(--text-muted)] block">Explore fests</span>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectTab('my-proposals')}
                    className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-amber-500 transition-all flex items-center gap-3 cursor-pointer shadow-xs text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">Submit Proposal</span>
                      <span className="text-[10px] text-[var(--text-muted)] block">Pitch event idea</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('messages')}
                    className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-blue-500 transition-all flex items-center gap-3 cursor-pointer shadow-xs text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">View Messages</span>
                      <span className="text-[10px] text-[var(--text-muted)] block">Chat with peers</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('colleges')}
                    className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-emerald-500 transition-all flex items-center gap-3 cursor-pointer shadow-xs text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">Browse Colleges</span>
                      <span className="text-[10px] text-[var(--text-muted)] block">Connect & discover</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Discovery Events Section Anchor */}
          <div id="events-discovery-section" />

          {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const active = selectedCategoryChip === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategoryChip(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                active
                  ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      ) : displayedEvents.length === 0 ? (
        <EmptyState
          icon={Compass}
          title={searchQuery ? `No Events Found for "${searchQuery}"` : "No Events Found"}
          description={
            searchQuery
              ? `We couldn't find any events matching "${searchQuery}". Try searching by category, host college, or another keyword.`
              : "No collegiate events match your current active filters."
          }
          actionLabel="Reset Search & Filters"
          onAction={onOpenFilter}
        />
      ) : searchQuery.trim().length > 0 ? (
        /* Matching Results Only (Requirement 6) */
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black tracking-tight text-[var(--text-primary)]">
              Search Results ({displayedEvents.length} event{displayedEvents.length === 1 ? '' : 's'})
            </h2>
            <span className="text-xs text-[var(--text-muted)] font-medium">
              Matching "{searchQuery}"
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayedEvents.map((ev) => (
              <EventCard
                key={ev._id}
                event={ev}
                onViewEvent={onViewEvent}
                onRegister={onRegister}
              />
            ))}
          </div>
        </section>
      ) : (
        <>
          {/* SECTION: Connected Colleges Feed (Requirement 5) */}
          {connectedCollegeEvents.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                    Events from Your Connected Colleges
                  </h2>
                </div>
                <button
                  onClick={() => onSelectTab('events')}
                  className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {connectedCollegeEvents.slice(0, 4).map((ev) => (
                  <EventCard
                    key={ev._id}
                    event={ev}
                    onViewEvent={onViewEvent}
                    onRegister={onRegister}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SECTION 1: Trending & Popular Events */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                  Popular Collegiate Events
                </h2>
              </div>
              <button
                onClick={() => onSelectTab('events')}
                className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {popularEvents.slice(0, 4).map((ev) => (
                <EventCard
                  key={ev._id}
                  event={ev}
                  onViewEvent={onViewEvent}
                  onRegister={onRegister}
                />
              ))}
            </div>
          </section>

          {/* SECTION 2: Upcoming Events Calendar */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[var(--primary-color)]" />
                <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                  Upcoming Events Schedule
                </h2>
              </div>
              <button
                onClick={() => onSelectTab('events')}
                className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {upcomingEvents.slice(0, 4).map((ev) => (
                <EventCard
                  key={ev._id}
                  event={ev}
                  onViewEvent={onViewEvent}
                  onRegister={onRegister}
                />
              ))}
            </div>
          </section>

          {/* SECTION 3: Premier Partner Colleges Spotlight */}
          {colleges.length > 0 && (
            <section className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Explore Premier Partner Colleges
                  </h3>
                </div>
                <button
                  onClick={() => onSelectTab('colleges')}
                  className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  See all {colleges.length} colleges <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {colleges.slice(0, 4).map((col) => (
                  <div
                    key={col._id}
                    onClick={() => onSelectTab('colleges')}
                    className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer flex items-center gap-3"
                  >
                    <img
                      src={col.logo || DEFAULT_COLLEGE_LOGO}
                      alt={col.name}
                      className="w-10 h-10 rounded-lg object-cover border border-[var(--border-color)]"
                      onError={(e) => {
                        (e.target as any).src = DEFAULT_COLLEGE_LOGO;
                      }}
                    />
                    <div className="min-w-0 grow">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {col.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        {col.location} · {col.connectionsCount || 0} connections
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION 4: Recently Added Events */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                  Recently Published
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {latestEvents.slice(0, 8).map((ev) => (
                <EventCard
                  key={ev._id}
                  event={ev}
                  onViewEvent={onViewEvent}
                  onRegister={onRegister}
                />
              ))}
            </div>
          </section>
        </>
      )}
        </>
      )}

      {/* Create Organizer Post Modal */}
      {user?.role === 'Organizer' && (
        <CreateOrganizerPostModal
          isOpen={isCreatePostModalOpen}
          onClose={() => setIsCreatePostModalOpen(false)}
          onPostCreated={() => {
            onSelectTab('profile');
          }}
        />
      )}
    </div>
  );
};

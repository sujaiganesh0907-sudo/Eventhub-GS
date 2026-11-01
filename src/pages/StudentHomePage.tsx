import React, { useState, useEffect } from 'react';
import { IEvent, ICollege } from '../types';
import { useAuth } from '../context/AuthContext';
import { EventCard } from '../components/event/EventCard';
import { EventCardSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { FilterState } from '../components/event/EventFilterModal';
import { api } from '../services/api';
import {
  Calendar,
  Building2,
  Compass,
  ArrowRight,
  Award,
  CheckCircle2,
  FileText,
  Plus,
  Layers,
  Cpu,
  Palette,
  Sparkles,
  Music,
  GraduationCap,
  Trophy,
  Briefcase,
  FolderDot,
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

// Category definitions with matched Lucide icons (Anti-AI Slop: no emojis)
const CATEGORY_SECTIONS = [
  { name: 'Hackathon', icon: Sparkles, color: 'text-indigo-500' },
  { name: 'Robotics', icon: Cpu, color: 'text-cyan-500' },
  { name: 'Design', icon: Palette, color: 'text-pink-500' },
  { name: 'Technical', icon: Layers, color: 'text-blue-500' },
  { name: 'Cultural', icon: Music, color: 'text-amber-500' },
  { name: 'Workshop', icon: GraduationCap, color: 'text-emerald-500' },
  { name: 'Seminar', icon: FileText, color: 'text-violet-500' },
  { name: 'Sports', icon: Trophy, color: 'text-rose-500' },
  { name: 'Management', icon: Briefcase, color: 'text-teal-500' },
  { name: 'Other', icon: FolderDot, color: 'text-slate-500' },
];

export const StudentHomePage: React.FC<StudentHomePageProps> = ({
  searchQuery,
  filters,
  onViewEvent,
  onRegister,
  onSelectTab,
  onOpenFilter,
}) => {
  const { user, studentProfile } = useAuth();
  const [events, setEvents] = useState<IEvent[]>([]);
  const [colleges, setColleges] = useState<ICollege[]>([]);
  const [connectedCollegeIds, setConnectedCollegeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
          // graceful fallback
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
    const fetchDashboardCounts = async () => {
      try {
        const [regRes, certRes, propRes] = await Promise.all([
          api.get<any>('/registrations/my')
            .catch(() => api.get<any>('/registrations/student'))
            .catch(() => ({ success: false, registrations: [] })),
          api.get<any>('/certificates/my-certificates')
            .catch(() => api.get<any>('/certificates/my'))
            .catch(() => ({ success: false, certificates: [] })),
          user?.role === 'Student'
            ? api.get<any>('/events/my-proposals')
                .catch(() => api.get<any>('/student/my-events'))
                .catch(() => ({ success: false, proposals: [], events: [] }))
            : Promise.resolve({ success: true, proposals: [] }),
        ]);

        const regs = regRes?.success ? (regRes.registrations || []) : [];
        const certs = certRes?.success ? (certRes.certificates || []) : [];
        const props = propRes?.success ? (propRes.proposals || propRes.events || []) : [];

        setStats({
          upcomingCount: regs.filter((r: any) => r.status === 'Confirmed' && (!r.eventDate || new Date(r.eventDate).getTime() >= Date.now())).length,
          registeredCount: regs.length,
          proposalsCount: props.length,
          certificatesCount: certs.length,
        });
      } catch (err) {
        console.error('Failed to load participant stats', err);
      }
    };

    if (user) {
      fetchDashboardCounts();
    }
  }, [user]);

  // Section 1: Connected Colleges Events
  const connectedCollegeEvents = events.filter((e) =>
    connectedCollegeIds.includes(e.hostCollegeId)
  );

  // Section 3: Suggested Events - Other Colleges
  const otherCollegesEvents = events.filter(
    (e) => !connectedCollegeIds.includes(e.hostCollegeId)
  );

  return (
    <div className="space-y-8 pb-16 w-full max-w-[1440px] mx-auto">
      {/* Participant Dashboard Header & Stats */}
      {!searchQuery && (
        <div className="space-y-6">
          {/* Greeting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                Hello, {user?.fullName || 'Student'}
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {user?.role === 'Organizer'
                  ? 'Organize, Announce, and Manage Campus Events'
                  : 'Discover inter-collegiate events, participate, and build verified credentials'}
              </p>
            </div>

            {user?.role === 'Organizer' && (
              <button
                type="button"
                onClick={() => setIsCreatePostModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Create Post</span>
              </button>
            )}
          </div>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[var(--text-muted)] block">Upcoming Events</span>
                <span className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-0.5 block">
                  {stats.upcomingCount || events.length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[var(--text-muted)] block">Registered Events</span>
                <span className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-0.5 block">
                  {stats.registeredCount}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[var(--text-muted)] block">My Proposals</span>
                <span className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-0.5 block">
                  {stats.proposalsCount}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[var(--text-muted)] block">Certificates</span>
                <span className="text-xl sm:text-2xl font-black text-[var(--text-primary)] mt-0.5 block">
                  {stats.certificatesCount}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      ) : events.length === 0 ? (
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
        /* Matching Search Results Grid */
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black tracking-tight text-[var(--text-primary)]">
              Search Results ({events.length} event{events.length === 1 ? '' : 's'})
            </h2>
            <span className="text-xs text-[var(--text-muted)] font-medium">
              Matching "{searchQuery}"
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {events.map((ev) => (
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
        /* Part 3 Mandatory Display Order */
        <div className="space-y-10">
          {/* MANDATORY SECTION 1: Connected Colleges Events (Horizontal Swipe/Scroll) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                <div>
                  <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                    Connected Colleges Events
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Events hosted by colleges and organizers you follow
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab('colleges')}
                className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Find More Colleges</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {connectedCollegeEvents.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth">
                {connectedCollegeEvents.map((ev) => (
                  <div key={ev._id} className="min-w-[280px] sm:min-w-[320px] max-w-[340px] shrink-0">
                    <EventCard
                      event={ev}
                      onViewEvent={onViewEvent}
                      onRegister={onRegister}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Connect with partner colleges to see their upcoming events first
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Follow universities, colleges, and event organizers in the Colleges directory.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectTab('colleges')}
                  className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold shrink-0 cursor-pointer shadow-xs active:scale-95"
                >
                  Explore Colleges
                </button>
              </div>
            )}
          </section>

          {/* MANDATORY SECTION 2: Category-wise Event Showcase (Horizontal Swipe Sections) */}
          <section className="space-y-8">
            <div className="border-b border-[var(--border-color)] pb-2 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                  Category-Wise Event Showcase
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Explore specialized competitions, workshops, and exhibitions across categories
                </p>
              </div>
            </div>

            {CATEGORY_SECTIONS.map((cat) => {
              const categoryEvents = events.filter(
                (e) => e.category?.toLowerCase() === cat.name.toLowerCase()
              );

              if (categoryEvents.length === 0) return null;

              const Icon = cat.icon;

              return (
                <div key={cat.name} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-color)] ${cat.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        {cat.name}
                      </h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]">
                        {categoryEvents.length}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Swipe Container */}
                  <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth">
                    {categoryEvents.map((ev) => (
                      <div key={ev._id} className="min-w-[280px] sm:min-w-[320px] max-w-[340px] shrink-0">
                        <EventCard
                          event={ev}
                          onViewEvent={onViewEvent}
                          onRegister={onRegister}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* MANDATORY SECTION 3: Suggested Events – Other Colleges */}
          {otherCollegesEvents.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                    Suggested Events – Other Colleges
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Broaden your horizons with popular events across partner campuses
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectTab('events')}
                  className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Events</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {otherCollegesEvents.slice(0, 8).map((ev) => (
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
        </div>
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

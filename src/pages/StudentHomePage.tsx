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
} from 'lucide-react';

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
    </div>
  );
};

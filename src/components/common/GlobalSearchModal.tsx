import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  User,
  Building2,
  Calendar,
  ShieldCheck,
  MapPin,
  ChevronRight,
  Loader2,
  Globe,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  IGlobalSearchStudent,
  IGlobalSearchCollege,
  IGlobalSearchEvent,
} from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSelectStudent: (studentId: string) => void;
  onSelectCollege: (collegeId: string) => void;
  onSelectEvent: (eventId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onSelectStudent,
  onSelectCollege,
  onSelectEvent,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'students' | 'colleges' | 'events'>('all');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<IGlobalSearchStudent[]>([]);
  const [colleges, setColleges] = useState<IGlobalSearchCollege[]>([]);
  const [events, setEvents] = useState<IGlobalSearchEvent[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setStudents([]);
      setColleges([]);
      setEvents([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get<any>('/search/global', { q: trimmed, type: activeTab });
        if (res.success) {
          setStudents(res.students || []);
          setColleges(res.colleges || []);
          setEvents(res.events || []);
        }
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, activeTab]);

  if (!isOpen) return null;

  const totalResults = students.length + colleges.length + events.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50">
      <div
        className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="p-3.5 border-b border-[var(--border-color)] flex items-center gap-3 bg-[var(--surface)]">
          <Search className="w-5 h-5 text-[var(--text-muted)] shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students (@username), colleges, or events..."
            className="w-full bg-transparent text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
          >
            Esc
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs font-bold overflow-x-auto">
          {[
            { id: 'all', label: 'All Results' },
            { id: 'students', label: `Students (${students.length})` },
            { id: 'colleges', label: `Colleges (${colleges.length})` },
            { id: 'events', label: `Events (${events.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                activeTab === t.id
                  ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Results Body */}
        <div className="p-4 overflow-y-auto grow space-y-6">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
              <p className="text-xs text-[var(--text-muted)]">Searching EVENTHUB ecosystem...</p>
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="py-12 text-center space-y-2">
              <Search className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-50" />
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Search Students, Colleges, and Events
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Type a name, @username, university, or event category to explore across the inter-collegiate network.
              </p>
            </div>
          )}

          {!loading && query.trim() && totalResults === 0 && (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-bold text-[var(--text-primary)]">No matching results found</p>
              <p className="text-xs text-[var(--text-muted)]">
                No students, verified colleges, or live events matched "{query}".
              </p>
            </div>
          )}

          {/* STUDENTS SECTION */}
          {!loading && (activeTab === 'all' || activeTab === 'students') && students.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
                <User className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                <span>Students</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {students.map((st) => (
                  <div
                    key={st._id}
                    onClick={() => {
                      onSelectStudent(st._id);
                      onClose();
                    }}
                    className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] hover:bg-[var(--surface-subtle)] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={st.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                        alt={st.fullName}
                        className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--primary-color)] transition-colors">
                            {st.fullName}
                          </p>
                          {st.username && (
                            <span className="text-xs font-semibold text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-1.5 py-0.5 rounded-md">
                              {st.username}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-[var(--text-muted)]" />
                          <span>{st.collegeName}</span>
                          {st.department && (
                            <>
                              <span>·</span>
                              <span>{st.department}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary-color)] shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COLLEGES SECTION */}
          {!loading && (activeTab === 'all' || activeTab === 'colleges') && colleges.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Colleges & Universities</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {colleges.map((col) => (
                  <div
                    key={col._id}
                    onClick={() => {
                      onSelectCollege(col._id);
                      onClose();
                    }}
                    className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-blue-500 hover:bg-[var(--surface-subtle)] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={col.logo || 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=120&auto=format&fit=crop&q=80'}
                        alt={col.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-blue-500 transition-colors">
                            {col.name}
                          </p>
                          {col.isVerified && (
                            <span title="Verified Campus">
                              <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                            </span>
                          )}
                          {col.username && (
                            <span className="text-[11px] font-mono text-[var(--text-muted)]">
                              {col.username}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[var(--text-muted)]" />
                          <span>{col.location || 'Collegiate Campus'}</span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-blue-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EVENTS SECTION */}
          {!loading && (activeTab === 'all' || activeTab === 'events') && events.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>Events</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {events.map((ev) => (
                  <div
                    key={ev._id}
                    onClick={() => {
                      onSelectEvent(ev._id);
                      onClose();
                    }}
                    className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-emerald-500 hover:bg-[var(--surface-subtle)] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={ev.poster || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=120&auto=format&fit=crop&q=80'}
                        alt={ev.title}
                        className="w-12 h-10 rounded-lg object-cover border border-[var(--border-color)] shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-emerald-500 transition-colors">
                          {ev.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-[var(--text-secondary)]">{ev.hostCollegeName}</span>
                          <span>·</span>
                          <span>{ev.eventDate}</span>
                          <span>·</span>
                          <span className={`font-bold ${ev.isFree ? 'text-emerald-600' : 'text-indigo-600'}`}>
                            {ev.isFree ? 'Free' : `$${ev.registrationFee}`}
                          </span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

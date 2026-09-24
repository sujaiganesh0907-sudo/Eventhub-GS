import React, { useState, useEffect } from 'react';
import { IEvent, ICollege, IEventRegistration } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Calendar,
  Users,
  CheckCircle2,
  Award,
  FileQuestion,
  Plus,
  Scan,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface CollegeHomePageProps {
  onOpenCreateEvent: () => void;
  onSelectTab: (tab: string) => void;
  onViewEvent: (event: IEvent) => void;
}

export const CollegeHomePage: React.FC<CollegeHomePageProps> = ({
  onOpenCreateEvent,
  onSelectTab,
  onViewEvent,
}) => {
  const { user, college } = useAuth();

  const [events, setEvents] = useState<IEvent[]>([]);
  const [registrations, setRegistrations] = useState<IEventRegistration[]>([]);
  const [studentRequests, setStudentRequests] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [eventsRes, regsRes, reqsRes] = await Promise.all([
        api.get<any>('/college/events'),
        api.get<any>('/registrations/college'),
        api.get<any>('/college/student-requests'),
      ]);

      if (eventsRes.success) setEvents(eventsRes.events || []);
      if (regsRes.success) setRegistrations(regsRes.registrations || []);
      if (reqsRes.success) setStudentRequests(reqsRes.requests || []);
    } catch (err) {
      console.error('Failed to load college dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const isPending = college?.verificationStatus === 'Pending';
  const isVerified = college?.verificationStatus === 'Verified';

  // Metrics
  const activeEventsCount = events.filter((e) => e.status === 'Published').length;
  const upcomingEventsCount = events.filter(
    (e) => e.status === 'Published' && new Date(e.eventDate).getTime() >= Date.now()
  ).length;
  const totalRegistrations = registrations.length;
  const attendanceMarked = registrations.filter((r) => r.attended).length;
  const certificatesIssued = registrations.filter((r) => r.certificateIssued).length;

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* SECTION 25: Verification Banner */}
      {isPending && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold">Institution Verification in Progress</h3>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
              Our university relations compliance team is verifying your official institutional domain ({college?.officialDomain}). Once verified, public event publishing, payment gateway settlements, and verified digital certificate signing will be fully unlocked.
            </p>
          </div>
        </div>
      )}

      {/* Institution Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs">
        <div className="flex items-center gap-4">
          <img
            src={
              college?.logo ||
              'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&auto=format&fit=crop&q=80'
            }
            alt={college?.name || 'College'}
            className="w-16 h-16 rounded-xl object-cover border border-[var(--border-color)]"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[var(--text-primary)]">
                {college?.name || user?.fullName}
              </h1>
              {isVerified && (
                <span title="Accredited Institution"><ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" /></span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {college?.location} · Official Domain: <span className="font-mono">{college?.officialDomain}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreateEvent}
          disabled={isPending}
          className="px-5 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Create New Event
        </button>
      </div>

      {/* SECTION 26: Metrics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
            Active Events
          </span>
          <span className="text-2xl font-black text-[var(--text-primary)] mt-1 block">
            {activeEventsCount}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
            Upcoming Events
          </span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">
            {upcomingEventsCount}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
            Total Registrations
          </span>
          <span className="text-2xl font-black text-[var(--primary-color)] mt-1 block">
            {totalRegistrations}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block">
            Attended (Present)
          </span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {attendanceMarked}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-600 block">
            Certificates Issued
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {certificatesIssued}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs">
          <span className="text-[10px] uppercase font-bold text-indigo-600 block">
            Student Proposals
          </span>
          <span className="text-2xl font-black text-indigo-600 mt-1 block">
            {studentRequests.length}
          </span>
        </div>
      </div>

      {/* SECTION 27: Quick Action Cards */}
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
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Create Event</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Launch symposiums, workshops, or inter-college hackathons.
            </p>
          </div>

          <div
            onClick={() => onSelectTab('events')}
            className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all cursor-pointer shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileQuestion className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Student Proposals</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Review, approve, or reject student-initiated event submissions ({studentRequests.length} pending).
            </p>
          </div>

          <div
            onClick={() => onSelectTab('events')}
            className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all cursor-pointer shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Scan className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Scan Attendance</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Fast pass check-in desk for registered event participants.
            </p>
          </div>

          <div
            onClick={() => onSelectTab('college-profile')}
            className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all cursor-pointer shadow-xs space-y-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Placements & Campus</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Publish recruitment updates and campus infrastructure.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 28: Recent Registrations & Events Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations List */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--primary-color)]" /> Recent Participant Registrations
            </h3>
            <span className="text-xs text-[var(--text-muted)]">{registrations.length} Total</span>
          </div>

          {registrations.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-6 text-center">
              No registrations recorded for your events yet.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-color)] max-h-72 overflow-y-auto">
              {registrations.slice(0, 5).map((reg) => (
                <div key={reg._id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 grow">
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {reg.studentName}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {reg.studentCollege} · {reg.eventTitle || 'Campus Event'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        reg.paymentStatus === 'Completed' || reg.isFree
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {reg.isFree ? 'Free Pass' : reg.paymentStatus}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                      {new Date(reg.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Published Events List */}
        <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--primary-color)]" /> Your Published Events
            </h3>
            <button
              onClick={() => onSelectTab('events')}
              className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Manage all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {events.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-6 text-center">
              No events published yet. Click Create Event to get started.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-color)] max-h-72 overflow-y-auto">
              {events.slice(0, 5).map((ev) => (
                <div
                  key={ev._id}
                  onClick={() => onViewEvent(ev)}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] px-2 rounded-lg transition-colors cursor-pointer"
                >
                  <div className="min-w-0 grow">
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {ev.title}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {ev.eventDate} · {ev.eventMode} · {ev.category}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {ev.registeredCount || 0} / {ev.capacity}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] block">Registered</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

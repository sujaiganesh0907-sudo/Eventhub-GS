import React, { useState, useEffect } from 'react';
import { IEvent, ICollege, IEventRegistration } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DEFAULT_COLLEGE_LOGO } from '../services/imageDefaults';
import { Modal } from '../components/common/Modal';
import { DocxCertificateManagerModal } from '../components/certificate/DocxCertificateManagerModal';
import { AttendanceModal } from '../components/attendance/AttendanceModal';
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
  ChevronRight,
  Filter,
  Check,
  X,
  FileText,
  Eye,
  Copy,
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
  const isFetchingDashboardRef = React.useRef(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('eventhub_token');
    if (!user || !token) {
      setLoading(false);
      return;
    }

    // Role guard: Only college accounts should fetch college dashboard data
    if (user.role === 'Student') {
      setLoading(false);
      return;
    }

    if (isFetchingDashboardRef.current) return;
    isFetchingDashboardRef.current = true;

    const activeCollege = localStorage.getItem('eventhub_active_college') || college?._id || user.collegeId;
    if (activeCollege) {
      localStorage.setItem('eventhub_active_college', activeCollege);
    }

    try {
      setLoading(true);
      const query = activeCollege ? `?collegeId=${activeCollege}` : '';
      const [eventsRes, regsRes, reqsRes] = await Promise.all([
        api.get<any>(`/college/events${query}`),
        api.get<any>(`/registrations/college${query}`),
        api.get<any>(`/college/student-requests${query}`),
      ]);

      if (eventsRes.success) setEvents(eventsRes.events || []);
      if (regsRes.success) setRegistrations(regsRes.registrations || []);
      if (reqsRes.success) setStudentRequests(reqsRes.requests || []);
    } catch (err) {
      console.error('Failed to load college dashboard data', err);
    } finally {
      isFetchingDashboardRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && localStorage.getItem('eventhub_token') && (user.role === 'College Super Admin' || user.role === 'College Admin')) {
      fetchDashboardData();
    }
  }, [user?._id, college?._id]);

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

  // Step 9 Drilldown Modal States:
  const [activeDrilldownModal, setActiveDrilldownModal] = useState<
    'active_events' | 'upcoming_events' | 'registrations' | 'attendance' | 'certificates' | 'student_requests' | null
  >(null);

  // Drilldown Selected Event / Request States
  const [drilldownSelectedEventId, setDrilldownSelectedEventId] = useState<string | null>(null);
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<IEvent | null>(null);
  const [selectedEventForCertificates, setSelectedEventForCertificates] = useState<IEvent | null>(null);
  const [requestFilter, setRequestFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected' | 'Changes Requested'>('All');
  const [actionProcessing, setActionProcessing] = useState(false);

  // Requirement 11: Domain Ownership Verification State
  const [showDomainVerifyModal, setShowDomainVerifyModal] = useState(false);
  const [domainVerifyLoading, setDomainVerifyLoading] = useState(false);
  const [domainVerifyMethod, setDomainVerifyMethod] = useState<'DNS_TXT' | 'WEB_FILE'>('DNS_TXT');
  const [domainTokenData, setDomainTokenData] = useState<{
    token: string;
    dnsTxtRecord: string;
    webFileUrl: string;
    isDomainVerified: boolean;
  } | null>(null);
  const [domainVerifyStatus, setDomainVerifyStatus] = useState<string | null>(null);
  const [domainVerifyError, setDomainVerifyError] = useState<string | null>(null);
  const [copiedTxt, setCopiedTxt] = useState(false);

  const handleOpenDomainVerify = async () => {
    setShowDomainVerifyModal(true);
    setDomainVerifyError(null);
    setDomainVerifyStatus(null);
    try {
      const res = await api.get<any>('/colleges/domain-verification/token');
      if (res.success) {
        setDomainTokenData(res);
      }
    } catch (err: any) {
      setDomainVerifyError(err.message || 'Failed to fetch domain verification token.');
    }
  };

  const handleRunDomainVerification = async () => {
    setDomainVerifyLoading(true);
    setDomainVerifyError(null);
    setDomainVerifyStatus(null);
    try {
      const res = await api.post<any>('/colleges/domain-verification/verify', {
        method: domainVerifyMethod,
      });
      if (res.success) {
        setDomainVerifyStatus(res.message || 'Domain ownership successfully verified!');
        if (college) {
          (college as any).isDomainVerified = true;
        }
      } else {
        setDomainVerifyError(res.message || 'Domain ownership verification check failed.');
      }
    } catch (err: any) {
      setDomainVerifyError(err.message || 'Failed to verify domain ownership.');
    } finally {
      setDomainVerifyLoading(false);
    }
  };

  // Request review actions
  const handleApproveProposal = async (eventId: string) => {
    try {
      setActionProcessing(true);
      const res = await api.put<any>(`/events/${eventId}/approve`, {});
      if (res.success) {
        setStudentRequests((prev) =>
          prev.map((ev) => (ev._id === eventId ? { ...ev, status: 'Approved' } : ev))
        );
        fetchDashboardData();
      } else {
        alert(res.message || 'Failed to approve event');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to approve event');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleRejectProposal = async (eventId: string) => {
    const reason = window.prompt('Enter rejection or change request reason:');
    if (reason === null) return;
    try {
      setActionProcessing(true);
      const res = await api.put<any>(`/events/${eventId}/reject`, { reason });
      if (res.success) {
        setStudentRequests((prev) =>
          prev.map((ev) => (ev._id === eventId ? { ...ev, status: 'Rejected', rejectionReason: reason } : ev))
        );
        fetchDashboardData();
      } else {
        alert(res.message || 'Failed to reject event');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reject event');
    } finally {
      setActionProcessing(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* SECTION 25: Verification Banner */}
      {isPending && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200">Institution Verification in Progress</h3>
                {college?.isDomainVerified ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Domain Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Domain Proof Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                Our university relations compliance team is verifying your official institutional domain ({college?.officialDomain}). Once verified, public event publishing, payment settlements, and digital certificates will be fully unlocked.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenDomainVerify}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
          >
            <ShieldCheck className="w-4 h-4" /> Verify Domain
          </button>
        </div>
      )}

      {/* Institution Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs">
        <div className="flex items-center gap-4">
          <img
            src={college?.logo || DEFAULT_COLLEGE_LOGO}
            alt={college?.name || 'College'}
            className="w-16 h-16 rounded-xl object-cover border border-[var(--border-color)]"
            onError={(e) => {
              (e.target as any).src = DEFAULT_COLLEGE_LOGO;
            }}
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
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center flex-wrap gap-2">
              <span>{college?.location} · Official Domain: <span className="font-mono">{college?.officialDomain}</span></span>
              {college?.isDomainVerified && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Domain Verified
                </span>
              )}
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

      {/* SECTION 26: Metrics Dashboard - Clickable cards per Step 9 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => {
            setDrilldownSelectedEventId(null);
            setActiveDrilldownModal('active_events');
          }}
          className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all cursor-pointer shadow-xs group"
          title="Click to view Active Events list and management"
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
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Click to view list</span>
        </div>

        <div
          onClick={() => {
            setDrilldownSelectedEventId(null);
            setActiveDrilldownModal('upcoming_events');
          }}
          className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-blue-500 transition-all cursor-pointer shadow-xs group"
          title="Click to view Upcoming Events list and management"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block group-hover:text-blue-500">
              Upcoming Events
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-blue-500" />
          </div>
          <span className="text-2xl font-black text-blue-600 mt-1 block">
            {upcomingEventsCount}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Click to view list</span>
        </div>

        <div
          onClick={() => {
            setDrilldownSelectedEventId(null);
            setActiveDrilldownModal('registrations');
          }}
          className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all cursor-pointer shadow-xs group"
          title="Click to view Total Registrations per event and student rosters"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block group-hover:text-[var(--primary-color)]">
              Total Registrations
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--primary-color)]" />
          </div>
          <span className="text-2xl font-black text-[var(--primary-color)] mt-1 block">
            {totalRegistrations}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] mt-1 block">Click to view counts</span>
        </div>

        <div
          onClick={() => {
            setDrilldownSelectedEventId(null);
            setActiveDrilldownModal('attendance');
          }}
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
          <span className="text-[10px] text-emerald-600/70 mt-1 block">Open / Finalized stats</span>
        </div>

        <div
          onClick={() => {
            setDrilldownSelectedEventId(null);
            setActiveDrilldownModal('certificates');
          }}
          className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-amber-500 transition-all cursor-pointer shadow-xs group"
          title="Click to view Certificates Issued and manage batches"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-600 block">
              Certificates Issued
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {certificatesIssued}
          </span>
          <span className="text-[10px] text-amber-600/70 mt-1 block">Eligible / Sent stats</span>
        </div>

        <div
          onClick={() => {
            setDrilldownSelectedEventId(null);
            setActiveDrilldownModal('student_requests');
          }}
          className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-indigo-500 transition-all cursor-pointer shadow-xs group"
          title="Click to review Student Event Requests"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-indigo-600 block">
              Student Requests
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-indigo-600 mt-1 block">
            {studentRequests.length}
          </span>
          <span className="text-[10px] text-indigo-600/70 mt-1 block">Review proposals</span>
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

      {/* ========================================================================= */}
      {/* STEP 9: INTERACTIVE DRILLDOWN MODALS PER SUMMARY CARD                     */}
      {/* ========================================================================= */}

      {/* 1. Active Events Modal */}
      {activeDrilldownModal === 'active_events' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveDrilldownModal(null)}
          title="Active Events (Published)"
          subtitle="Select an event to view full details, manage attendance, certificates, or open its public page"
          maxWidth="3xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
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
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] p-2 rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{ev.title}</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          📅 {ev.eventDate} · 📍 {ev.venue || ev.eventMode} · 🏷️ {ev.category}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-secondary)]">
                          <span>Registrations: <strong>{ev.registeredCount || 0} / {ev.capacity}</strong></span>
                          <span>·</span>
                          <span>Attendance: <strong>{ev.attendanceCount || 0}</strong></span>
                          <span>·</span>
                          <span>Finalized: <strong>{ev.attendanceFinalized ? 'Yes' : 'No'}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDrilldownModal(null);
                            onViewEvent(ev);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-semibold hover:bg-[var(--surface-subtle)] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEventForAttendance(ev);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Scan className="w-3.5 h-3.5" /> Check-In
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEventForCertificates(ev);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" /> Certificates
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
          subtitle="Scheduled events happening on or after today"
          maxWidth="3xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {events.filter((e) => e.status === 'Published' && new Date(e.eventDate).getTime() >= Date.now()).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">
                No upcoming events scheduled.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {events
                  .filter((e) => e.status === 'Published' && new Date(e.eventDate).getTime() >= Date.now())
                  .map((ev) => (
                    <div
                      key={ev._id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] p-2 rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{ev.title}</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          📅 {ev.eventDate} ({ev.startTime} - {ev.endTime}) · 📍 {ev.venue || ev.eventMode}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                          Deadline: {ev.registrationDeadline ? new Date(ev.registrationDeadline).toLocaleString() : 'N/A'} · Registered: {ev.registeredCount || 0}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDrilldownModal(null);
                            onViewEvent(ev);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-semibold hover:bg-[var(--surface-subtle)] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDrilldownModal(null);
                            onSelectTab('events');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[var(--primary-color)] text-white text-xs font-semibold hover:opacity-90 flex items-center gap-1 cursor-pointer"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 3. Total Registrations Modal (Event list with count -> Select event -> Registered student list) */}
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
              ? 'Select a student to view details or go back to event list'
              : 'Select an event to view its full student registration roster'
          }
          maxWidth="3xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {!drilldownSelectedEventId ? (
              // Event List with registration counts
              <div className="divide-y divide-[var(--border-color)]">
                {events.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-8">No events available.</p>
                ) : (
                  events.map((ev) => {
                    const regCount = registrations.filter((r) => r.eventId === ev._id).length;
                    return (
                      <div
                        key={ev._id}
                        onClick={() => setDrilldownSelectedEventId(ev._id)}
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
                            <span className="text-[10px] text-[var(--text-muted)] block">Students</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              // Selected Event Student Roster
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setDrilldownSelectedEventId(null)}
                  className="text-xs font-semibold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  ← Back to event registration list
                </button>

                {registrations.filter((r) => r.eventId === drilldownSelectedEventId).length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] text-center py-8">
                    No students registered for this event yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                    {registrations
                      .filter((r) => r.eventId === drilldownSelectedEventId)
                      .map((reg) => (
                        <div key={reg._id} className="p-3 flex items-center justify-between gap-3 bg-[var(--surface)]">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--text-primary)]">{reg.studentName}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {reg.studentEmail} · {reg.studentCollege} ({reg.studentDepartment} - {reg.studentYear})
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                              Pass ID: {reg.registrationId}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                reg.attended
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : 'bg-zinc-500/10 text-zinc-500'
                              }`}
                            >
                              {reg.attended ? 'Present' : 'Not Checked In'}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                              {reg.isFree ? 'Free Pass' : reg.paymentStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 4. Attendance Modal (Event list with Present/Absent/Open/Finalized -> Select event -> Attendance Desk) */}
      {activeDrilldownModal === 'attendance' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveDrilldownModal(null)}
          title="Attendance & Check-In Desk"
          subtitle="Overview of participant attendance state and check-in desk per event"
          maxWidth="3xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="divide-y divide-[var(--border-color)]">
              {events.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-8">No events available.</p>
              ) : (
                events.map((ev) => {
                  const evRegs = registrations.filter((r) => r.eventId === ev._id);
                  const presentCount = evRegs.filter((r) => r.attended).length;
                  const absentCount = evRegs.length - presentCount;

                  return (
                    <div
                      key={ev._id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] p-2.5 rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[var(--text-primary)]">{ev.title}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              ev.attendanceFinalized
                                ? 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                                : 'bg-emerald-500/10 text-emerald-600'
                            }`}
                          >
                            {ev.attendanceFinalized ? '🔒 Finalized' : '🟢 Open for Check-In'}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          📅 {ev.eventDate} · 📍 {ev.venue || ev.eventMode}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                          <span>Total: <strong>{evRegs.length}</strong></span>
                          <span className="text-emerald-600">Present: <strong>{presentCount}</strong></span>
                          <span className="text-red-500">Absent: <strong>{absentCount}</strong></span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEventForAttendance(ev);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Scan className="w-3.5 h-3.5" /> Open Check-In Desk
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Certificates Issued Modal (Eligible / Generated / Sent / Failed per event -> Select event -> Certificate Management) */}
      {activeDrilldownModal === 'certificates' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveDrilldownModal(null)}
          title="Digital Certificates Issued"
          subtitle="Certificate generation, verification, and dispatch status per event"
          maxWidth="3xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="divide-y divide-[var(--border-color)]">
              {events.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-8">No events available.</p>
              ) : (
                events.map((ev) => {
                  const evRegs = registrations.filter((r) => r.eventId === ev._id);
                  const eligibleCount = evRegs.filter((r) => r.attended).length;
                  const generatedCount = evRegs.filter((r) => r.certificateIssued).length;
                  const sentCount = evRegs.filter((r) => r.certificateEmailSent || r.certificateIssued).length;
                  const failedCount = evRegs.filter((r) => r.certificateStatus === 'Failed').length;

                  return (
                    <div
                      key={ev._id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] p-2.5 rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[var(--text-primary)]">{ev.title}</h4>
                          {ev.certificateTemplate?.fileUrl && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600">
                              DOCX Template {ev.certificateTemplate.version ? `v${ev.certificateTemplate.version}` : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          📅 {ev.eventDate} · Attendance Finalized: {ev.attendanceFinalized ? 'Yes' : 'No'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-xs">
                          <span className="text-blue-600">Eligible (Present): <strong>{eligibleCount}</strong></span>
                          <span>·</span>
                          <span className="text-emerald-600">Generated: <strong>{generatedCount}</strong></span>
                          <span>·</span>
                          <span className="text-indigo-600">Sent: <strong>{sentCount}</strong></span>
                          {failedCount > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-red-500 font-bold">Failed: {failedCount}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEventForCertificates(ev);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" /> Manage Certificates
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Student Event Requests Modal (Pending / Changes Requested / Approved / Rejected) */}
      {activeDrilldownModal === 'student_requests' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveDrilldownModal(null)}
          title="Student Event Proposals"
          subtitle="Proposals initiated by students targeting this college for hosting or affiliation"
          maxWidth="3xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(['All', 'Pending', 'Approved', 'Rejected', 'Changes Requested'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setRequestFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    requestFilter === st
                      ? 'bg-[var(--primary-color)] text-white'
                      : 'border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {studentRequests.filter((req) => {
              if (requestFilter === 'All') return true;
              if (requestFilter === 'Pending') return req.status === 'Pending Approval';
              if (requestFilter === 'Approved') return req.status === 'Approved' || req.status === 'Published';
              if (requestFilter === 'Rejected') return req.status === 'Rejected';
              if (requestFilter === 'Changes Requested') return req.status === 'Changes Requested';
              return true;
            }).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-8">
                No student proposals found for this filter.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {studentRequests
                  .filter((req) => {
                    if (requestFilter === 'All') return true;
                    if (requestFilter === 'Pending') return req.status === 'Pending Approval';
                    if (requestFilter === 'Approved') return req.status === 'Approved' || req.status === 'Published';
                    if (requestFilter === 'Rejected') return req.status === 'Rejected';
                    if (requestFilter === 'Changes Requested') return req.status === 'Changes Requested';
                    return true;
                  })
                  .map((ev) => (
                    <div
                      key={ev._id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-subtle)] p-2.5 rounded-xl transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[var(--text-primary)]">{ev.title}</h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              ev.status === 'Approved' || ev.status === 'Published'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : ev.status === 'Rejected'
                                ? 'bg-red-500/10 text-red-600'
                                : ev.status === 'Changes Requested'
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-blue-500/10 text-blue-600'
                            }`}
                          >
                            {ev.status}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                          {ev.description}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                          Proposed Date: {ev.eventDate} · Mode: {ev.eventMode} · Category: {ev.category}
                        </p>
                        {ev.rejectionReason && (
                          <p className="text-xs text-red-500 mt-1 font-semibold">
                            Note: {ev.rejectionReason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDrilldownModal(null);
                            onViewEvent(ev);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-semibold hover:bg-[var(--surface-subtle)] flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                        {ev.status === 'Pending Approval' && (
                          <>
                            <button
                              type="button"
                              disabled={actionProcessing}
                              onClick={() => handleApproveProposal(ev._id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={actionProcessing}
                              onClick={() => handleRejectProposal(ev._id)}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              Reject / Changes
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Attendance Modal connected from drilldown */}
      {selectedEventForAttendance && (
        <AttendanceModal
          isOpen={true}
          onClose={() => setSelectedEventForAttendance(null)}
          event={selectedEventForAttendance}
          onEventUpdated={() => {
            fetchDashboardData();
          }}
        />
      )}

      {/* DOCX Certificate Manager Modal connected from drilldown */}
      {selectedEventForCertificates && (
        <DocxCertificateManagerModal
          isOpen={true}
          onClose={() => setSelectedEventForCertificates(null)}
          event={selectedEventForCertificates}
          onUpdated={() => {
            fetchDashboardData();
          }}
        />
      )}

      {/* Requirement 11: Domain Ownership Verification Modal */}
      {showDomainVerifyModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowDomainVerifyModal(false)}
          title="Institutional Domain Ownership Proof"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              To verify administrative ownership of <span className="font-mono font-bold">{college?.officialDomain}</span>, choose a verification method below and publish the security token.
            </p>

            {domainVerifyStatus && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {domainVerifyStatus}
              </div>
            )}

            {domainVerifyError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {domainVerifyError}
              </div>
            )}

            {/* Method Tabs */}
            <div className="flex border-b border-[var(--border-color)] gap-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDomainVerifyMethod('DNS_TXT')}
                className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
                  domainVerifyMethod === 'DNS_TXT'
                    ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Method 1: DNS TXT Record (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setDomainVerifyMethod('WEB_FILE')}
                className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
                  domainVerifyMethod === 'WEB_FILE'
                    ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Method 2: Well-Known Web File
              </button>
            </div>

            {domainVerifyMethod === 'DNS_TXT' ? (
              <div className="space-y-3 bg-[var(--surface-subtle)] p-4 rounded-xl border border-[var(--border-color)]">
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Add this TXT record to your institutional DNS manager:
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] font-medium mb-1">
                    Record Type:
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="TXT"
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] font-medium mb-1">
                    Host / Name:
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`@ or ${college?.officialDomain}`}
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] font-medium mb-1">
                    TXT Value / Security Token:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={domainTokenData?.dnsTxtRecord || `eventhub-verification=${domainTokenData?.token || 'generating...'}`}
                      className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs font-mono font-bold text-[var(--text-primary)] select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const rec = domainTokenData?.dnsTxtRecord || `eventhub-verification=${domainTokenData?.token || ''}`;
                        navigator.clipboard?.writeText(rec);
                        setCopiedTxt(true);
                        setTimeout(() => setCopiedTxt(false), 2000);
                      }}
                      className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border-color)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedTxt ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-[var(--surface-subtle)] p-4 rounded-xl border border-[var(--border-color)]">
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Upload a verification file on your official website:
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] font-medium mb-1">
                    File Location:
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`https://${college?.officialDomain}/.well-known/eventhub-verification.txt`}
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] font-medium mb-1">
                    File Content (Exact Token):
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={domainTokenData?.token || 'generating...'}
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs font-mono font-bold text-[var(--text-primary)] select-all"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <span className="text-[11px] text-[var(--text-muted)]">
                Status: {college?.isDomainVerified ? 'Verified ✓' : 'Awaiting Proof'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDomainVerifyModal(false)}
                  className="px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={domainVerifyLoading}
                  onClick={handleRunDomainVerification}
                  className="px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {domainVerifyLoading ? 'Querying DNS / Web...' : 'Run Verification Check'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IEvent, IEventRegistration, IReminder } from '../types';
import { EventCard } from '../components/event/EventCard';
import { TicketModal } from '../components/registration/TicketModal';
import { AttendanceModal } from '../components/attendance/AttendanceModal';
import { EventInsightsModal } from '../components/event/EventInsightsModal';
import { ReminderModal } from '../components/event/ReminderModal';
import { OrganizedEventCard } from '../components/event/OrganizedEventCard';
import { MultiStepEventForm } from '../components/event/MultiStepEventForm';
import { Modal } from '../components/common/Modal';
import { EventRegistrationsModal } from '../components/registration/EventRegistrationsModal';
import { DocxCertificateManagerModal } from '../components/certificate/DocxCertificateManagerModal';
import { IssueCertificateModal } from '../components/certificate/IssueCertificateModal';
import { DEFAULT_EVENT_POSTER } from '../services/imageDefaults';
import {
  Calendar,
  Ticket,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  Scan,
  Award,
  Trash2,
  Edit,
  Loader2,
  FileQuestion,
  Eye,
  Bell,
  BellRing,
  Share2,
  MoreVertical,
  Users,
  UserCheck,
  Send,
} from 'lucide-react';
import { ActionMenu } from '../components/common/ActionMenu';
import { ShareToChatModal } from '../components/common/ShareToChatModal';

interface EventsManagementPageProps {
  onOpenCreateEvent: (isProposal?: boolean) => void;
  onViewEvent: (event: IEvent) => void;
  onNavigateToMessages?: (conversationId?: string) => void;
}

export const EventsManagementPage: React.FC<EventsManagementPageProps> = ({
  onOpenCreateEvent,
  onViewEvent,
  onNavigateToMessages,
}) => {
  const { user, isCollege, isStudent } = useAuth();

  // Tabs
  const [activeTab, setActiveTab] = useState<string>(
    isCollege ? 'published' : 'registered'
  );
  const [studentRegSubTab, setStudentRegSubTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [studentProposalSubTab, setStudentProposalSubTab] = useState<'all' | 'drafts' | 'pending' | 'approved'>('all');

  // Data
  const [registrations, setRegistrations] = useState<IEventRegistration[]>([]);
  const [reminders, setReminders] = useState<IReminder[]>([]);
  const [collegeEvents, setCollegeEvents] = useState<IEvent[]>([]);
  const [studentProposals, setStudentProposals] = useState<IEvent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Sharing
  const [eventToShare, setEventToShare] = useState<IEvent | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Modals
  const [selectedReg, setSelectedReg] = useState<IEventRegistration | null>(null);
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<IEvent | null>(null);
  const [selectedEventForInsights, setSelectedEventForInsights] = useState<IEvent | null>(null);
  const [selectedEventForReminder, setSelectedEventForReminder] = useState<IEvent | null>(null);
  const [selectedRegForReminder, setSelectedRegForReminder] = useState<IEventRegistration | null>(null);
  const [selectedEventForRegistrations, setSelectedEventForRegistrations] = useState<IEvent | null>(null);
  const [selectedEventForCertificates, setSelectedEventForCertificates] = useState<IEvent | null>(null);
  const [editingCollegeEvent, setEditingCollegeEvent] = useState<IEvent | null>(null);

  // College proposal rejection modal
  const [rejectingEventId, setRejectingEventId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Student proposal edit modal
  const [editingProposal, setEditingProposal] = useState<IEvent | null>(null);
  const [isEditProposalOpen, setIsEditProposalOpen] = useState(false);

  const handleEditProposal = (event: IEvent) => {
    setEditingProposal(event);
    setIsEditProposalOpen(true);
  };

  const handleDeleteProposal = async (eventId: string) => {
    try {
      const res = await api.delete<any>(`/events/${eventId}`);
      if (res.success) {
        setStudentProposals((prev) => prev.filter((p) => p._id !== eventId));
      } else {
        alert(res.message || 'Failed to delete event proposal');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete event proposal');
    }
  };

  const handleSubmitForReview = async (event: IEvent) => {
    try {
      if (!confirm(`Submit "${event.title}" for review to host college?`)) return;
      const res = await api.put<any>(`/events/${event._id}`, { submitForReview: true });
      if (res.success) {
        fetchData();
      } else {
        alert(res.message || 'Failed to submit proposal for review');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit proposal for review');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      if (isCollege) {
        const activeCollege = localStorage.getItem('eventhub_active_college');
        const query = activeCollege ? `?collegeId=${activeCollege}` : '';
        const [evRes, reqRes] = await Promise.all([
          api.get<any>(`/college/events${query}`),
          api.get<any>(`/college/student-requests${query}`),
        ]);
        if (evRes.success) setCollegeEvents(evRes.events || []);
        if (reqRes.success) setPendingRequests(reqRes.requests || []);
      } else {
        const [regRes, propRes, remRes] = await Promise.all([
          api.get<any>('/registrations/student'),
          api.get<any>('/students/my-proposals'),
          api.get<any>('/reminders'),
        ]);
        if (regRes.success) setRegistrations(regRes.registrations || []);
        if (propRes.success) setStudentProposals(propRes.events || []);
        if (remRes.success) setReminders(remRes.reminders || []);
      }
    } catch (err) {
      console.error('Failed to load events management data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isCollege, isStudent]);

  // College handles student proposals
  const handleApproveProposal = async (eventId: string) => {
    setProcessingAction(true);
    try {
      const res = await api.put<any>(`/events/${eventId}/review`, {
        action: 'approve',
      });
      if (res.success) {
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to approve');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectProposal = async () => {
    if (!rejectingEventId) return;
    setProcessingAction(true);
    try {
      const res = await api.put<any>(`/events/${rejectingEventId}/review`, {
        action: 'reject',
        rejectionReason,
      });
      if (res.success) {
        setRejectingEventId(null);
        setRejectionReason('');
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reject proposal');
    } finally {
      setProcessingAction(false);
    }
  };

  // Student Filter registrations
  const upcomingRegistrations = registrations.filter(
    (r) => !r.attended && (r.status === 'Confirmed' || r.paymentStatus === 'Completed')
  );
  const completedRegistrations = registrations.filter((r) => r.attended);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header & Main Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            {isCollege ? 'Events & Proposals Hub' : 'My Campus Events'}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {isCollege
              ? 'Organize institution events, track entry desks, and review student proposals'
              : 'Access your entry tickets, event schedules, reminders, and club proposals'}
          </p>
        </div>

        <button
          onClick={() => onOpenCreateEvent(isStudent)}
          className="px-4 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          {isCollege ? 'Create New Event' : 'Propose Student Event'}
        </button>
      </div>

      {/* Tabs Row */}
      {isCollege ? (
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
          {[
            { id: 'published', label: `Published Events (${collegeEvents.filter((e) => e.status === 'Published').length})` },
            { id: 'drafts', label: `Drafts (${collegeEvents.filter((e) => e.status === 'Draft').length})` },
            { id: 'requests', label: `Student Proposals (${pendingRequests.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('registered')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'registered'
                  ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              My Registered Passes ({registrations.length})
            </button>
            <button
              onClick={() => setActiveTab('proposals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'proposals'
                  ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              My Proposed Events ({studentProposals.length})
            </button>
          </div>

          {activeTab === 'registered' && (
            <div className="flex items-center gap-1 bg-[var(--surface-subtle)] p-1 rounded-xl border border-[var(--border-color)]">
              <button
                onClick={() => setStudentRegSubTab('upcoming')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  studentRegSubTab === 'upcoming'
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Upcoming ({upcomingRegistrations.length})
              </button>
              <button
                onClick={() => setStudentRegSubTab('completed')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  studentRegSubTab === 'completed'
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Completed & Attended ({completedRegistrations.length})
              </button>
            </div>
          )}

          {activeTab === 'proposals' && (
            <div className="flex items-center gap-1 bg-[var(--surface-subtle)] p-1 rounded-xl border border-[var(--border-color)]">
              <button
                onClick={() => setStudentProposalSubTab('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  studentProposalSubTab === 'all'
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                All ({studentProposals.length})
              </button>
              <button
                onClick={() => setStudentProposalSubTab('drafts')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  studentProposalSubTab === 'drafts'
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Drafts ({studentProposals.filter((p) => p.status === 'Draft').length})
              </button>
              <button
                onClick={() => setStudentProposalSubTab('pending')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  studentProposalSubTab === 'pending'
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Pending ({studentProposals.filter((p) => p.status === 'Pending Approval').length})
              </button>
              <button
                onClick={() => setStudentProposalSubTab('approved')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  studentProposalSubTab === 'approved'
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Live ({studentProposals.filter((p) => p.status === 'Published' || p.status === 'Approved').length})
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-color)]" />
        </div>
      ) : (
        <>
          {/* STUDENT: REGISTERED PASSES VIEW */}
          {isStudent && activeTab === 'registered' && (
            <div>
              {(studentRegSubTab === 'upcoming' ? upcomingRegistrations : completedRegistrations).length === 0 ? (
                <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
                  <Ticket className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    No {studentRegSubTab} event passes
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {studentRegSubTab === 'upcoming'
                      ? 'Browse the discovery feed to register for hackathons and workshops!'
                      : 'Attended events and verified credentials will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(studentRegSubTab === 'upcoming' ? upcomingRegistrations : completedRegistrations).map((reg) => {
                    const existingRem = reminders.find(
                      (r) => r.registrationId === reg.registrationId || r.eventId === reg.eventId
                    );

                    return (
                      <div
                        key={reg._id}
                        className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]">
                              {reg.registrationId}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  reg.attended
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-blue-500/10 text-blue-600'
                                }`}
                              >
                                {reg.attended ? 'Attended (Present)' : 'Confirmed Pass'}
                              </span>

                              <ActionMenu
                                items={[
                                  {
                                    id: 'view',
                                    label: 'View Event',
                                    icon: Eye,
                                    onClick: async () => {
                                      if (reg.event) onViewEvent(reg.event);
                                      else {
                                        try {
                                          const res = await api.get<any>(`/events/${reg.eventId}`);
                                          if (res.success && res.event) onViewEvent(res.event);
                                        } catch (e) {}
                                      }
                                    },
                                  },
                                  {
                                    id: 'pass',
                                    label: 'View Entry Pass',
                                    icon: Ticket,
                                    onClick: () => setSelectedReg(reg),
                                  },
                                  {
                                    id: 'share',
                                    label: 'Share Event',
                                    icon: Share2,
                                    onClick: async () => {
                                      if (reg.event) {
                                        setEventToShare(reg.event);
                                        setShowShareModal(true);
                                      } else {
                                        try {
                                          const res = await api.get<any>(`/events/${reg.eventId}`);
                                          if (res.success && res.event) {
                                            setEventToShare(res.event);
                                            setShowShareModal(true);
                                          }
                                        } catch (e) {}
                                      }
                                    },
                                  },
                                ]}
                                ariaLabel={`Actions for pass ${reg.registrationId}`}
                              />
                            </div>
                          </div>

                          <h3 className="text-base font-bold text-[var(--text-primary)] line-clamp-1">
                            {reg.eventTitle || 'Collegiate Event'}
                          </h3>
                          <p className="text-xs text-[var(--text-muted)]">
                            {reg.eventDate} · {reg.registrationType} Registration
                          </p>

                          {reg.certificateStatus && reg.certificateStatus !== 'Not Eligible' && (
                            <div className="pt-1">
                              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                <Award className="w-3 h-3" /> Certificate: {reg.certificateStatus}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              if (reg.event) {
                                onViewEvent(reg.event);
                              } else {
                                try {
                                  const res = await api.get<any>(`/events/${reg.eventId}`);
                                  if (res.success && res.event) onViewEvent(res.event);
                                } catch (e) {
                                  console.error('Failed to open event', e);
                                }
                              }
                            }}
                            className="flex-1 min-w-[110px] px-3 py-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-500" /> View Event
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedReg(reg)}
                            className="flex-1 min-w-[110px] px-3 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                          >
                            <Ticket className="w-3.5 h-3.5" /> View Pass QR
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              let ev = reg.event;
                              if (!ev) {
                                try {
                                  const res = await api.get<any>(`/events/${reg.eventId}`);
                                  if (res.success && res.event) ev = res.event;
                                } catch (e) {}
                              }
                              if (ev) {
                                setSelectedEventForReminder(ev);
                                setSelectedRegForReminder(reg);
                              }
                            }}
                            className={`w-full px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                              existingRem
                                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20'
                                : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {existingRem ? (
                              <>
                                <BellRing className="w-3.5 h-3.5 text-indigo-600" />
                                <span>
                                  Reminder: {new Date(existingRem.reminderTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                                  {new Date(existingRem.reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Click to edit)
                                </span>
                              </>
                            ) : (
                              <>
                                <Bell className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                <span>Add Event Reminder</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STUDENT: PROPOSALS VIEW */}
          {isStudent && activeTab === 'proposals' && (
            <div>
              {studentProposals.length === 0 ? (
                <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
                  <FileQuestion className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    No student proposals submitted yet
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Want to organize a campus meetup or competition? Submit a proposal for university admin approval.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {studentProposals
                    .filter((p) => {
                      if (studentProposalSubTab === 'drafts') return p.status === 'Draft';
                      if (studentProposalSubTab === 'pending') return p.status === 'Pending Approval';
                      if (studentProposalSubTab === 'approved') return p.status === 'Published' || p.status === 'Approved';
                      return true;
                    })
                    .map((prop) => (
                      <OrganizedEventCard
                        key={prop._id}
                        event={prop}
                        isStudent={true}
                        onViewEvent={onViewEvent}
                        onEditEvent={handleEditProposal}
                        onDeleteEvent={handleDeleteProposal}
                        onSubmitForReview={handleSubmitForReview}
                        onViewInsights={(ev) => setSelectedEventForInsights(ev)}
                        onOpenCheckInDesk={(ev) => setSelectedEventForAttendance(ev)}
                        onShareEvent={(ev) => {
                          setEventToShare(ev);
                          setShowShareModal(true);
                        }}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* COLLEGE: PUBLISHED / DRAFTS VIEW */}
          {isCollege && (activeTab === 'published' || activeTab === 'drafts') && (
            <div>
              {collegeEvents.filter(
                (e) => (activeTab === 'published' ? e.status === 'Published' : e.status === 'Draft')
              ).length === 0 ? (
                <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    No {activeTab} events found
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Click Create New Event to launch your institution's symposium or hackathon.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {collegeEvents
                    .filter((e) => (activeTab === 'published' ? e.status === 'Published' : e.status === 'Draft'))
                    .map((ev) => {
                      const posterSrc = ev.poster || ev.hostCollegeLogo || DEFAULT_EVENT_POSTER;
                      return (
                        <div
                          key={ev._id}
                          className="relative rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between group"
                        >
                          <div>
                            {/* Poster container at top of card (Requirement 2) */}
                            <div
                              onClick={() => onViewEvent(ev)}
                              className="relative aspect-video w-full bg-slate-950 rounded-t-2xl overflow-hidden cursor-pointer"
                            >
                              <img
                                src={posterSrc}
                                alt={ev.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                                onError={(e) => {
                                  (e.target as any).src = DEFAULT_EVENT_POSTER;
                                }}
                              />

                              {/* Overlays */}
                              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                                <span className="px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider">
                                  {ev.category || 'EVENT'}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-sm border ${
                                    ev.status === 'Published'
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-zinc-700/60 text-zinc-300 border-zinc-600'
                                  }`}
                                >
                                  {ev.status}
                                </span>
                              </div>

                              <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-semibold">
                                <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-white">
                                  {ev.eventMode}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md font-bold backdrop-blur-sm ${
                                    ev.isFree ? 'bg-emerald-600/90 text-white' : 'bg-indigo-600/90 text-white'
                                  }`}
                                >
                                  {ev.isFree ? 'Free' : `$${ev.registrationFee}`}
                                </span>
                              </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h3
                                  onClick={() => onViewEvent(ev)}
                                  className="text-base font-bold text-[var(--text-primary)] hover:text-[var(--primary-color)] transition-colors cursor-pointer line-clamp-1 flex-1"
                                >
                                  {ev.title}
                                </h3>

                                {/* Complete 3-Dot Action Menu (Requirement 7) */}
                                <ActionMenu
                                  items={
                                    ev.status === 'Draft'
                                      ? [
                                          {
                                            id: 'view',
                                            label: 'Preview Event',
                                            icon: Eye,
                                            onClick: () => onViewEvent(ev),
                                          },
                                          {
                                            id: 'edit',
                                            label: 'Edit Draft',
                                            icon: Edit,
                                            onClick: () => {
                                              setEditingCollegeEvent(ev);
                                            },
                                          },
                                          {
                                            id: 'publish',
                                            label: 'Publish Event Now',
                                            icon: Send,
                                            onClick: async () => {
                                              if (confirm(`Publish "${ev.title}" live on EVENTHUB now?`)) {
                                                const res = await api.put<any>(`/events/${ev._id}`, { status: 'Published' });
                                                if (res.success) fetchData();
                                                else alert(res.message || 'Failed to publish event');
                                              }
                                            },
                                          },
                                          {
                                            id: 'delete',
                                            label: 'Delete Draft',
                                            icon: Trash2,
                                            danger: true,
                                            onClick: async () => {
                                              if (confirm(`Are you sure you want to delete draft "${ev.title}"?`)) {
                                                await api.delete(`/events/${ev._id}`);
                                                fetchData();
                                              }
                                            },
                                          },
                                        ]
                                      : [
                                          {
                                            id: 'view',
                                            label: 'View Event',
                                            icon: Eye,
                                            onClick: () => onViewEvent(ev),
                                          },
                                          {
                                            id: 'share',
                                            label: 'Share Event',
                                            icon: Share2,
                                            onClick: () => {
                                              setEventToShare(ev);
                                              setShowShareModal(true);
                                            },
                                          },
                                          {
                                            id: 'edit',
                                            label: 'Edit Event',
                                            icon: Edit,
                                            onClick: () => {
                                              setEditingCollegeEvent(ev);
                                            },
                                          },
                                          {
                                            id: 'checkin',
                                            label: 'Check-In Desk',
                                            icon: Scan,
                                            onClick: () => setSelectedEventForAttendance(ev),
                                          },
                                          {
                                            id: 'registrations',
                                            label: 'Registrations',
                                            icon: Users,
                                            onClick: () => setSelectedEventForRegistrations(ev),
                                          },
                                          {
                                            id: 'attendance',
                                            label: 'Attendance',
                                            icon: UserCheck,
                                            onClick: () => setSelectedEventForAttendance(ev),
                                          },
                                          {
                                            id: 'certificates',
                                            label: 'Certificates',
                                            icon: Award,
                                            onClick: () => setSelectedEventForCertificates(ev),
                                          },
                                          {
                                            id: 'insights',
                                            label: 'Analytics & Insights',
                                            icon: BarChart3,
                                            onClick: () => setSelectedEventForInsights(ev),
                                          },
                                          {
                                            id: 'delete',
                                            label: 'Delete Event',
                                            icon: Trash2,
                                            danger: true,
                                            onClick: async () => {
                                              if (confirm(`Are you sure you want to delete "${ev.title}"?`)) {
                                                await api.delete(`/events/${ev._id}`);
                                                fetchData();
                                              }
                                            },
                                          },
                                        ]
                                  }
                                  ariaLabel={`Options for ${ev.title}`}
                                  align="right"
                                />
                              </div>

                              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                {ev.eventDate} ({ev.startTime} - {ev.endTime})
                              </p>

                              <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                                {ev.description}
                              </p>
                            </div>
                          </div>

                          {/* Card Footer with Capacity & Quick Actions */}
                          <div className="p-3 border-t border-[var(--border-color)] bg-[var(--surface-subtle)] rounded-b-2xl flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {ev.status === 'Draft' ? 'Draft (Not Live)' : `${ev.registeredCount || 0} / ${ev.capacity}`}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {ev.status === 'Draft' ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingCollegeEvent(ev)}
                                  className="px-3 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors"
                                >
                                  <Edit className="w-3 h-3 text-[var(--primary-color)]" /> Edit Draft
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedEventForAttendance(ev)}
                                    className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-500/20 transition-colors"
                                  >
                                    <Scan className="w-3 h-3" /> Desk
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedEventForRegistrations(ev)}
                                    className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors"
                                  >
                                    <Users className="w-3 h-3 text-blue-500" /> Attendees
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* COLLEGE: STUDENT REQUESTS TAB */}
          {isCollege && activeTab === 'requests' && (
            <div>
              {pendingRequests.length === 0 ? (
                <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    All caught up! No pending student proposals
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    New student club event proposals will appear here for staff approval.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((req) => (
                    <div
                      key={req._id}
                      className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[var(--primary-color)]">
                            Student Proposal · {req.category}
                          </span>
                          <h3 className="text-base font-bold text-[var(--text-primary)]">
                            {req.title}
                          </h3>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Proposed Date: <span className="font-bold text-[var(--text-primary)]">{req.eventDate}</span>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)]">{req.description}</p>

                      <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                        <div className="text-xs text-[var(--text-muted)]">
                          Organizer Contact: {req.primaryCoordinator?.name} ({req.primaryCoordinator?.email})
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={processingAction}
                            onClick={() => setRejectingEventId(req._id)}
                            className="px-4 py-2 rounded-xl border border-red-500/20 text-red-600 hover:bg-red-500/10 text-xs font-bold cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={processingAction}
                            onClick={() => handleApproveProposal(req._id)}
                            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Approve & Publish
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Ticket Modal */}
      {selectedReg && (
        <TicketModal
          isOpen={!!selectedReg}
          onClose={() => setSelectedReg(null)}
          registration={selectedReg}
        />
      )}

      {/* Attendance Check-in Modal */}
      {selectedEventForAttendance && (
        <AttendanceModal
          isOpen={!!selectedEventForAttendance}
          onClose={() => setSelectedEventForAttendance(null)}
          event={selectedEventForAttendance}
        />
      )}

      {/* Insights Modal */}
      {selectedEventForInsights && (
        <EventInsightsModal
          isOpen={!!selectedEventForInsights}
          onClose={() => setSelectedEventForInsights(null)}
          event={selectedEventForInsights}
        />
      )}

      {/* Reminder Modal */}
      {selectedEventForReminder && (
        <ReminderModal
          isOpen={!!selectedEventForReminder}
          onClose={() => {
            setSelectedEventForReminder(null);
            setSelectedRegForReminder(null);
          }}
          event={selectedEventForReminder}
          registrationId={selectedRegForReminder?.registrationId}
          existingReminder={reminders.find(
            (r) =>
              r.eventId === selectedEventForReminder._id ||
              (selectedRegForReminder && r.registrationId === selectedRegForReminder.registrationId)
          )}
          onReminderSaved={() => {
            fetchData();
          }}
        />
      )}

      {/* Rejection Feedback Modal */}
      {rejectingEventId && (
        <Modal
          isOpen={!!rejectingEventId}
          onClose={() => setRejectingEventId(null)}
          title="Decline Student Proposal"
          subtitle="Provide helpful feedback to the student organizers"
          maxWidth="md"
        >
          <div className="space-y-4 py-2">
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain required changes, date conflicts, or safety protocols..."
              className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setRejectingEventId(null)}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingAction || !rejectionReason.trim()}
                onClick={handleRejectProposal}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Student Proposal Modal */}
      {isEditProposalOpen && editingProposal && (
        <MultiStepEventForm
          isOpen={isEditProposalOpen}
          eventToEdit={editingProposal}
          isStudentProposal={true}
          onClose={() => {
            setIsEditProposalOpen(false);
            setEditingProposal(null);
          }}
          onSuccess={(updated) => {
            setIsEditProposalOpen(false);
            setEditingProposal(null);
            fetchData();
          }}
        />
      )}

      {/* SHARE EVENT MODAL */}
      {showShareModal && eventToShare && (
        <ShareToChatModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setEventToShare(null);
          }}
          event={eventToShare}
          onShareSuccess={(convId) => {
            setShowShareModal(false);
            setEventToShare(null);
            if (onNavigateToMessages) onNavigateToMessages(convId);
          }}
        />
      )}

      {/* REGISTRATIONS MODAL */}
      {selectedEventForRegistrations && (
        <EventRegistrationsModal
          isOpen={!!selectedEventForRegistrations}
          onClose={() => setSelectedEventForRegistrations(null)}
          event={selectedEventForRegistrations}
        />
      )}

      {/* DOCX PARTICIPATION CERTIFICATES MANAGER (Requirement 1) */}
      {selectedEventForCertificates && (
        <DocxCertificateManagerModal
          isOpen={!!selectedEventForCertificates}
          onClose={() => setSelectedEventForCertificates(null)}
          event={selectedEventForCertificates}
          onUpdated={() => fetchData()}
        />
      )}

      {/* EDIT COLLEGE EVENT MODAL */}
      {editingCollegeEvent && (
        <MultiStepEventForm
          isOpen={!!editingCollegeEvent}
          eventToEdit={editingCollegeEvent}
          onClose={() => setEditingCollegeEvent(null)}
          onSuccess={() => {
            setEditingCollegeEvent(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

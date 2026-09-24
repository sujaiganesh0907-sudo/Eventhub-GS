import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IEvent, IEventRegistration } from '../types';
import { EventCard } from '../components/event/EventCard';
import { TicketModal } from '../components/registration/TicketModal';
import { AttendanceModal } from '../components/attendance/AttendanceModal';
import { EventInsightsModal } from '../components/event/EventInsightsModal';
import { ReminderModal } from '../components/event/ReminderModal';
import { Modal } from '../components/common/Modal';
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
} from 'lucide-react';

interface EventsManagementPageProps {
  onOpenCreateEvent: (isProposal?: boolean) => void;
  onViewEvent: (event: IEvent) => void;
}

export const EventsManagementPage: React.FC<EventsManagementPageProps> = ({
  onOpenCreateEvent,
  onViewEvent,
}) => {
  const { user, isCollege, isStudent } = useAuth();

  // Tabs
  const [activeTab, setActiveTab] = useState<string>(
    isCollege ? 'published' : 'registered'
  );
  const [studentRegSubTab, setStudentRegSubTab] = useState<'upcoming' | 'completed'>('upcoming');

  // Data
  const [registrations, setRegistrations] = useState<IEventRegistration[]>([]);
  const [collegeEvents, setCollegeEvents] = useState<IEvent[]>([]);
  const [studentProposals, setStudentProposals] = useState<IEvent[]>([]);
  const [pendingRequests, setPendingRequests] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedReg, setSelectedReg] = useState<IEventRegistration | null>(null);
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<IEvent | null>(null);
  const [selectedEventForInsights, setSelectedEventForInsights] = useState<IEvent | null>(null);
  const [selectedEventForReminder, setSelectedEventForReminder] = useState<IEvent | null>(null);

  // College proposal rejection modal
  const [rejectingEventId, setRejectingEventId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (isCollege) {
        const [evRes, reqRes] = await Promise.all([
          api.get<any>('/college/events'),
          api.get<any>('/college/student-requests'),
        ]);
        if (evRes.success) setCollegeEvents(evRes.events || []);
        if (reqRes.success) setPendingRequests(reqRes.requests || []);
      } else {
        const [regRes, propRes] = await Promise.all([
          api.get<any>('/registrations/student'),
          api.get<any>('/students/my-proposals'),
        ]);
        if (regRes.success) setRegistrations(regRes.registrations || []);
        if (propRes.success) setStudentProposals(propRes.events || []);
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
                  {(studentRegSubTab === 'upcoming' ? upcomingRegistrations : completedRegistrations).map((reg) => (
                    <div
                      key={reg._id}
                      className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]">
                            {reg.registrationId}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              reg.attended
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-blue-500/10 text-blue-600'
                            }`}
                          >
                            {reg.attended ? 'Attended (Present)' : 'Confirmed Pass'}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-[var(--text-primary)] line-clamp-1">
                          {reg.eventTitle || 'Collegiate Event'}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          {reg.eventDate} · {reg.registrationType} Registration
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedReg(reg)}
                          className="grow px-3 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        >
                          <Ticket className="w-3.5 h-3.5" /> View Ticket Pass
                        </button>
                      </div>
                    </div>
                  ))}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studentProposals.map((prop) => (
                    <div
                      key={prop._id}
                      className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                          {prop.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            prop.status === 'Published'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : prop.status === 'Rejected'
                              ? 'bg-red-500/10 text-red-600'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}
                        >
                          {prop.status === 'Published' ? 'Approved & Live' : prop.status}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[var(--text-primary)]">{prop.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{prop.description}</p>

                      {prop.rejectionReason && (
                        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
                          <span className="font-bold">Admin Feedback: </span>
                          {prop.rejectionReason}
                        </div>
                      )}

                      <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>Date: {prop.eventDate}</span>
                        <span>Fee: {prop.isFree ? 'Free' : `$${prop.registrationFee}`}</span>
                      </div>
                    </div>
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
                    .map((ev) => (
                      <div
                        key={ev._id}
                        className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                              {ev.category} · {ev.eventMode}
                            </span>
                            <span className="text-xs font-bold text-[var(--primary-color)]">
                              {ev.registeredCount || 0} / {ev.capacity} Registered
                            </span>
                          </div>

                          <h3
                            onClick={() => onViewEvent(ev)}
                            className="text-base font-black text-[var(--text-primary)] hover:text-[var(--primary-color)] transition-colors cursor-pointer line-clamp-1"
                          >
                            {ev.title}
                          </h3>
                          <p className="text-xs text-[var(--text-muted)]">
                            {ev.eventDate} ({ev.startTime} - {ev.endTime})
                          </p>
                        </div>

                        <div className="pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => setSelectedEventForAttendance(ev)}
                            className="grow px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Scan className="w-3.5 h-3.5" /> Check-in Desk
                          </button>
                          <button
                            onClick={() => setSelectedEventForInsights(ev)}
                            className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <BarChart3 className="w-3.5 h-3.5 text-blue-500" /> Analytics
                          </button>
                        </div>
                      </div>
                    ))}
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
    </div>
  );
};

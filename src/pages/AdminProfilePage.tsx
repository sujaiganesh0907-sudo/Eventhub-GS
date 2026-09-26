import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ICollege, IEvent } from '../types';
import { DEFAULT_COLLEGE_LOGO, DEFAULT_COLLEGE_COVER } from '../services/imageDefaults';
import {
  ShieldCheck,
  Building2,
  Calendar,
  Users,
  Scan,
  Award,
  BarChart3,
  Briefcase,
  Layers,
  FileText,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Clock,
  Loader2,
  AlertCircle,
  ExternalLink,
  Plus,
  History,
  Shield,
} from 'lucide-react';
import { AttendanceModal } from '../components/attendance/AttendanceModal';
import { IssueCertificateModal } from '../components/certificate/IssueCertificateModal';
import { MultiStepEventForm } from '../components/event/MultiStepEventForm';
import { AddPlacementPostModal } from '../components/profile/AddPlacementPostModal';
import { AddInfrastructureModal } from '../components/profile/AddInfrastructureModal';

interface AdminProfilePageProps {
  onViewEvent?: (event: IEvent) => void;
  onNavigateToMessages?: (conversationId?: string) => void;
  onSelectCollege?: (collegeId: string) => void;
  onBack?: () => void;
}

export const AdminProfilePage: React.FC<AdminProfilePageProps> = ({
  onViewEvent,
  onNavigateToMessages,
  onSelectCollege,
  onBack,
}) => {
  const { user } = useAuth();
  const [adminRoles, setAdminRoles] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any | null>(null);

  // Workspace sub-tabs
  const [activeModule, setActiveModule] = useState<string>('events');

  // Workspace data
  const [workspaceEvents, setWorkspaceEvents] = useState<IEvent[]>([]);
  const [workspacePlacements, setWorkspacePlacements] = useState<any[]>([]);
  const [workspaceInfra, setWorkspaceInfra] = useState<any[]>([]);
  const [workspaceActivity, setWorkspaceActivity] = useState<any[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // Modals inside workspace
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<IEvent | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedEventForCert, setSelectedEventForCert] = useState<IEvent | null>(null);
  const [showAddPlacementModal, setShowAddPlacementModal] = useState(false);
  const [showAddInfraModal, setShowAddInfraModal] = useState(false);

  // Load user's admin memberships and invitations
  const fetchAdminRolesAndInvites = async () => {
    try {
      setLoading(true);
      const [rolesRes, invitesRes] = await Promise.all([
        api.get<any>('/admins/my-roles'),
        api.get<any>('/admins/my-invitations'),
      ]);

      if (rolesRes.success) setAdminRoles(rolesRes.adminRoles || []);
      if (invitesRes.success) setPendingInvitations(invitesRes.invitations || []);
    } catch (err: any) {
      console.error('Failed to load admin roles', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminRolesAndInvites();
  }, []);

  // When a workspace is selected, fetch data for that college
  const fetchWorkspaceData = async (collegeId: string) => {
    try {
      setWorkspaceLoading(true);
      const [evRes, plRes, infRes, actRes] = await Promise.all([
        api.get<any>('/events', { collegeId }),
        api.get<any>('/placements', { collegeId }),
        api.get<any>('/infrastructure', { collegeId }),
        api.get<any>('/admins/activity', { collegeId }),
      ]);

      if (evRes.success) setWorkspaceEvents(evRes.events || []);
      if (plRes.success) setWorkspacePlacements(plRes.posts || []);
      if (infRes.success) setWorkspaceInfra(infRes.posts || []);
      if (actRes.success) setWorkspaceActivity(actRes.logs || []);
    } catch (err) {
      console.error('Failed to load workspace data', err);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const handleSelectWorkspace = (role: any) => {
    setSelectedWorkspace(role);
    const perms = role.permissions || [];
    // Set default active tab based on allowed permissions
    if (perms.includes('manageEvents') || perms.length === 0) setActiveModule('events');
    else if (perms.includes('manageEventRequests')) setActiveModule('proposals');
    else if (perms.includes('manageAttendance')) setActiveModule('attendance');
    else if (perms.includes('manageCertificates')) setActiveModule('certificates');
    else if (perms.includes('manageMessages')) setActiveModule('messages');
    else if (perms.includes('managePlacements')) setActiveModule('placements');
    else if (perms.includes('manageInfrastructure')) setActiveModule('infra');
    else setActiveModule('activity');

    fetchWorkspaceData(role.collegeId);
  };

  // Invitation Actions
  const handleAcceptInvite = async (invitationId: string) => {
    try {
      const res = await api.post<any>(`/admins/invitations/${invitationId}/accept`, {});
      if (res.success) {
        fetchAdminRolesAndInvites();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to accept invitation.');
    }
  };

  const handleRejectInvite = async (invitationId: string) => {
    try {
      const res = await api.post<any>(`/admins/invitations/${invitationId}/reject`, {});
      if (res.success) {
        fetchAdminRolesAndInvites();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to decline invitation.');
    }
  };

  const hasPerm = (permId: string) => {
    if (!selectedWorkspace) return false;
    const perms = selectedWorkspace.permissions || [];
    return perms.length === 0 || perms.includes(permId);
  };

  // -------------------------------------------------------------
  // VIEW 1: DEDICATED COLLEGE ADMIN WORKSPACE (Requirement 15)
  // -------------------------------------------------------------
  if (selectedWorkspace) {
    const col = selectedWorkspace.college;
    const perms = selectedWorkspace.permissions || [];

    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        {/* Workspace Top Header */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedWorkspace(null)}
                className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Admin Profile</span>
              </button>

              <div className="flex items-center gap-3">
                <img
                  src={col?.logo || DEFAULT_COLLEGE_LOGO}
                  alt={col?.name || 'College'}
                  className="w-12 h-12 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                  onError={(e) => {
                    (e.target as any).src = DEFAULT_COLLEGE_LOGO;
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-black text-[var(--text-primary)]">
                      {col?.name || 'Institution Workspace'}
                    </h1>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      College Admin Workspace
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {col?.location || 'Campus'} · Granted {perms.length} Permissions
                  </p>
                </div>
              </div>
            </div>

            {hasPerm('manageEvents') && (
              <button
                type="button"
                onClick={() => setShowCreateEventModal(true)}
                className="px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" /> Create College Event
              </button>
            )}
          </div>

          {/* Module Navigation Tabs (Filtered strictly by assigned permissions - Section 15) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-[var(--border-color)] pt-3 no-scrollbar">
            {hasPerm('manageEvents') && (
              <button
                type="button"
                onClick={() => setActiveModule('events')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModule === 'events'
                    ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                    : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Events ({workspaceEvents.length})
              </button>
            )}

            {hasPerm('manageEventRequests') && (
              <button
                type="button"
                onClick={() => setActiveModule('proposals')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModule === 'proposals'
                    ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                    : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Proposals
              </button>
            )}

            {hasPerm('manageAttendance') && (
              <button
                type="button"
                onClick={() => setActiveModule('attendance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModule === 'attendance'
                    ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                    : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <Scan className="w-3.5 h-3.5" /> Check-In Desk
              </button>
            )}

            {hasPerm('manageCertificates') && (
              <button
                type="button"
                onClick={() => setActiveModule('certificates')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModule === 'certificates'
                    ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                    : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <Award className="w-3.5 h-3.5" /> Certificates
              </button>
            )}

            {hasPerm('manageMessages') && (
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToMessages) onNavigateToMessages();
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> College Messages
              </button>
            )}

            {hasPerm('managePlacements') && (
              <button
                type="button"
                onClick={() => setActiveModule('placements')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModule === 'placements'
                    ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                    : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" /> Placements ({workspacePlacements.length})
              </button>
            )}

            {hasPerm('manageInfrastructure') && (
              <button
                type="button"
                onClick={() => setActiveModule('infra')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeModule === 'infra'
                    ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                    : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Infrastructure ({workspaceInfra.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveModule('activity')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeModule === 'activity'
                  ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                  : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Admin Activity ({workspaceActivity.length})
            </button>
          </div>
        </div>

        {/* WORKSPACE CONTENT PANELS */}
        {workspaceLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-color)]" />
          </div>
        ) : (
          <div>
            {/* MODULE: EVENTS */}
            {activeModule === 'events' && hasPerm('manageEvents') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Events for {col?.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateEventModal(true)}
                    className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Event
                  </button>
                </div>

                {workspaceEvents.length === 0 ? (
                  <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
                    <Calendar className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">No events hosted yet</h4>
                    <p className="text-xs text-[var(--text-muted)]">
                      Create symposiums, workshops, and hackathons on behalf of this college.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {workspaceEvents.map((ev) => (
                      <div
                        key={ev._id}
                        className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4 flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
                            <span className="font-bold uppercase tracking-wider">{ev.category}</span>
                            <span className="font-semibold text-emerald-600">
                              {ev.registeredCount || 0}/{ev.capacity} Registered
                            </span>
                          </div>
                          <h4
                            onClick={() => onViewEvent && onViewEvent(ev)}
                            className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--primary-color)] transition-colors cursor-pointer line-clamp-1"
                          >
                            {ev.title}
                          </h4>
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {ev.eventDate} ({ev.startTime})
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewEvent && onViewEvent(ev)}
                            className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold cursor-pointer"
                          >
                            View
                          </button>
                          {hasPerm('manageAttendance') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEventForAttendance(ev);
                                setShowAttendanceModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Scan className="w-3.5 h-3.5 text-blue-500" /> Desk
                            </button>
                          )}
                          {hasPerm('manageCertificates') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEventForCert(ev);
                                setShowCertModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Award className="w-3.5 h-3.5 text-amber-500" /> Certificate
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MODULE: CHECK-IN DESK & ATTENDANCE */}
            {activeModule === 'attendance' && hasPerm('manageAttendance') && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Attendance Desk & Pass Scanning
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Select an active event below to open the camera QR scanner, verify registration passes, and mark attendance:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {workspaceEvents.map((ev) => (
                    <div
                      key={ev._id}
                      onClick={() => {
                        setSelectedEventForAttendance(ev);
                        setShowAttendanceModal(true);
                      }}
                      className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all cursor-pointer space-y-2 group"
                    >
                      <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-color)] line-clamp-1">
                        {ev.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>{ev.eventDate}</span>
                        <span className="font-bold text-emerald-600">
                          {ev.registeredCount || 0} participants
                        </span>
                      </div>
                      <button
                        type="button"
                        className="w-full py-1.5 rounded-lg bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Scan className="w-3.5 h-3.5" /> Launch Check-In Desk
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODULE: PLACEMENTS */}
            {activeModule === 'placements' && hasPerm('managePlacements') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Campus Placement Posts
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddPlacementModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Placement Drive
                  </button>
                </div>

                {workspacePlacements.length === 0 ? (
                  <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
                    <Briefcase className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                    <p className="text-xs text-[var(--text-muted)]">No placement posts published yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {workspacePlacements.map((p) => (
                      <div key={p._id} className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] space-y-2">
                        <span className="text-[10px] font-bold text-[var(--primary-color)] uppercase">
                          {p.company} · {p.packageLPA ? `${p.packageLPA} LPA` : 'Recruitment'}
                        </span>
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">{p.title}</h4>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2">{p.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MODULE: INFRASTRUCTURE */}
            {activeModule === 'infra' && hasPerm('manageInfrastructure') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Campus Infrastructure Posts
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddInfraModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Facility Showcase
                  </button>
                </div>

                {workspaceInfra.length === 0 ? (
                  <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
                    <Building2 className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                    <p className="text-xs text-[var(--text-muted)]">No campus infrastructure facilities showcased yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {workspaceInfra.map((inf) => (
                      <div key={inf._id} className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] space-y-2">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase">{inf.facilityType}</span>
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">{inf.facilityTitle}</h4>
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2">{inf.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MODULE: ADMIN ACTIVITY LOG (Requirement 17) */}
            {activeModule === 'activity' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Institution Admin Activity History
                </h3>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
                  {workspaceActivity.length === 0 ? (
                    <p className="text-center py-8 text-xs text-[var(--text-muted)]">
                      No administrator actions recorded yet for this college.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--border-color)] space-y-3">
                      {workspaceActivity.map((act) => (
                        <div key={act._id} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-[var(--text-primary)]">
                              {act.details}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              By {act.adminName} ({act.actionType})
                            </p>
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                            {new Date(act.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE MODALS */}
        {showCreateEventModal && (
          <MultiStepEventForm
            isOpen={showCreateEventModal}
            onClose={() => setShowCreateEventModal(false)}
            onSuccess={() => {
              setShowCreateEventModal(false);
              fetchWorkspaceData(selectedWorkspace.collegeId);
            }}
          />
        )}

        {showAttendanceModal && selectedEventForAttendance && (
          <AttendanceModal
            isOpen={showAttendanceModal}
            onClose={() => {
              setShowAttendanceModal(false);
              setSelectedEventForAttendance(null);
            }}
            event={selectedEventForAttendance}
            onEventUpdated={() => fetchWorkspaceData(selectedWorkspace.collegeId)}
          />
        )}

        {showCertModal && selectedEventForCert && (
          <IssueCertificateModal
            isOpen={showCertModal}
            onClose={() => {
              setShowCertModal(false);
              setSelectedEventForCert(null);
            }}
            event={selectedEventForCert}
          />
        )}

        {showAddPlacementModal && (
          <AddPlacementPostModal
            isOpen={showAddPlacementModal}
            onClose={() => setShowAddPlacementModal(false)}
            onSuccess={() => {
              setShowAddPlacementModal(false);
              fetchWorkspaceData(selectedWorkspace.collegeId);
            }}
          />
        )}

        {showAddInfraModal && (
          <AddInfrastructureModal
            isOpen={showAddInfraModal}
            onClose={() => setShowAddInfraModal(false)}
            onSuccess={() => {
              setShowAddInfraModal(false);
              fetchWorkspaceData(selectedWorkspace.collegeId);
            }}
          />
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: ADMIN PROFILE - LIST OF COLLEGES USER ADMINISTERS (Requirement 14)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-muted)] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[var(--primary-color)]" />
              <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
                Admin Profile
              </h1>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Colleges and universities where you have authorized administrator access
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-color)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION A: PENDING INVITATIONS (Requirement 13) */}
          {pendingInvitations.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                <Clock className="w-4 h-4" />
                <span>Pending College Admin Invitations ({pendingInvitations.length})</span>
              </div>

              <div className="space-y-2.5">
                {pendingInvitations.map((inv) => (
                  <div
                    key={inv._id}
                    className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={inv.college?.logo || DEFAULT_COLLEGE_LOGO}
                        alt="College"
                        className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {inv.college?.name || 'Institution'}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Invited you to become a College Admin · {inv.permissions?.length || 0} permissions
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleRejectInvite(inv._id)}
                        className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptInvite(inv._id)}
                        className="px-4 py-1.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept Invite
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION B: ACTIVE ADMIN ROLES (Requirement 14) */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Authorized College Workspaces ({adminRoles.length})
            </h2>

            {adminRoles.length === 0 ? (
              <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-3">
                <Shield className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  No Active College Admin Roles
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                  When a university or college invites you as an Administrator using your @username, the invitation and your authorized workspace will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {adminRoles.map((role) => {
                  const col = role.college;
                  const perms = role.permissions || [];

                  return (
                    <div
                      key={role.membershipId}
                      className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={col?.logo || DEFAULT_COLLEGE_LOGO}
                              alt={col?.name || 'College'}
                              className="w-12 h-12 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                              onError={(e) => {
                                (e.target as any).src = DEFAULT_COLLEGE_LOGO;
                              }}
                            />
                            <div>
                              <h3 className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">
                                {col?.name}
                              </h3>
                              <p className="text-[11px] text-[var(--text-muted)]">
                                {col?.location || 'Campus'}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                            Active Admin
                          </span>
                        </div>

                        {/* Granted Permissions summary */}
                        <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
                          <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">
                            Assigned Roles ({perms.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {perms.slice(0, 4).map((p: string) => (
                              <span
                                key={p}
                                className="px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border-color)]"
                              >
                                {p.replace('manage', '').replace('view', '')}
                              </span>
                            ))}
                            {perms.length > 4 && (
                              <span className="px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                                +{perms.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectWorkspace(role)}
                        className="w-full py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <span>Open Admin Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

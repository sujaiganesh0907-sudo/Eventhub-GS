import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  IStudentProfile,
  ICertificate,
  IEventRegistration,
  IEvent,
  ICollege,
} from '../types';
import { EditStudentProfileModal } from '../components/profile/EditStudentProfileModal';
import { AddCertificateModal } from '../components/certificate/AddCertificateModal';
import { CertificateModal } from '../components/certificate/CertificateModal';
import { TicketModal } from '../components/registration/TicketModal';
import { OrganizedEventCard } from '../components/event/OrganizedEventCard';
import { EventInsightsModal } from '../components/event/EventInsightsModal';
import { MultiStepEventForm } from '../components/event/MultiStepEventForm';
import { Modal } from '../components/common/Modal';
import { ShareToChatModal } from '../components/common/ShareToChatModal';
import {
  Building2,
  Calendar,
  Award,
  Edit,
  Plus,
  Ticket,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Users,
  Compass,
  UserCheck,
  UserPlus,
  ExternalLink,
  Flame,
  ArrowRight,
  ArrowLeft,
  Clock,
  AlertCircle,
  Eye,
  MessageSquare,
} from 'lucide-react';

interface StudentProfilePageProps {
  onViewEvent?: (event: IEvent) => void;
  onSelectCollege?: (collegeId: string) => void;
  studentId?: string; // Optional: view another student's profile
  onNavigateToMessages?: (conversationId?: string) => void;
  onBack?: () => void;
}

export const StudentProfilePage: React.FC<StudentProfilePageProps> = ({
  onViewEvent,
  onSelectCollege,
  studentId,
  onNavigateToMessages,
  onBack,
}) => {
  const { user, studentProfile, updateStudentProfileLocal } = useAuth();

  const [profile, setProfile] = useState<IStudentProfile | null>(
    !studentId && studentProfile ? studentProfile : null
  );
  const isOwnProfile = !studentId || (profile && profile._id === studentProfile?._id) || (user && profile && profile.userId === user._id);

  const [isFollowingTarget, setIsFollowingTarget] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const [certificates, setCertificates] = useState<ICertificate[]>([]);
  const [registrations, setRegistrations] = useState<IEventRegistration[]>([]);
  const [organizedEvents, setOrganizedEvents] = useState<IEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile active sub-section tab
  const [activeSection, setActiveSection] = useState<'credentials' | 'events'>('credentials');
  const [eventSectionTab, setEventSectionTab] = useState<'participated' | 'organized'>('participated');

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddCertModal, setShowAddCertModal] = useState(false);
  const [editingCert, setEditingCert] = useState<ICertificate | null>(null);
  const [selectedCert, setSelectedCert] = useState<ICertificate | null>(null);
  const [selectedReg, setSelectedReg] = useState<IEventRegistration | null>(null);

  // Social Connections & Follow Modals
  const [socialModalType, setSocialModalType] = useState<'connections' | 'following' | 'followers' | null>(null);
  const [connectedColleges, setConnectedColleges] = useState<ICollege[]>([]);
  const [followingStudents, setFollowingStudents] = useState<IStudentProfile[]>([]);
  const [followerStudents, setFollowerStudents] = useState<IStudentProfile[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);

  // Events Modal / Management State
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [selectedEventForInsights, setSelectedEventForInsights] = useState<IEvent | null>(null);
  const [editingEventProposal, setEditingEventProposal] = useState<IEvent | null>(null);
  const [isEditingProposalOpen, setIsEditingProposalOpen] = useState(false);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const targetId = studentId || 'me';

      const [profRes, certRes, regRes, orgRes] = await Promise.all([
        api.get<any>(`/students/${targetId}`),
        api.get<any>(targetId === 'me' ? '/certificates/my-certificates' : `/certificates/student/${targetId}`),
        api.get<any>('/registrations/student'),
        api.get<any>('/student/my-events'),
      ]);

      if (profRes.success && (profRes.student || profRes.profile)) {
        const p = profRes.student || profRes.profile;
        setProfile(p);
        setIsFollowingTarget(!!p.isFollowing);
        if (!studentId && updateStudentProfileLocal) {
          updateStudentProfileLocal(p);
        }
      }

      if (certRes.success) setCertificates(certRes.certificates || []);
      if (regRes.success) setRegistrations(regRes.registrations || []);
      if (orgRes.success) setOrganizedEvents(orgRes.events || []);
    } catch (err) {
      console.error('Failed to load student profile data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [studentId]);

  // Follow/unfollow currently viewed student
  const handleToggleFollowCurrent = async () => {
    if (!profile) return;
    try {
      setFollowLoading(true);
      const res = await api.post<any>('/social/student/follow', { targetStudentId: profile._id });
      if (res.success) {
        setIsFollowingTarget(res.following);
        setProfile((prev) => {
          if (!prev) return prev;
          const currentFollowers = prev.followersCount || 0;
          return {
            ...prev,
            followersCount: res.following ? currentFollowers + 1 : Math.max(0, currentFollowers - 1),
            isFollowing: res.following,
            isPrivateRestricted: prev.profileVisibility === 'Private' && !res.following,
          };
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  // Direct Message currently viewed student
  const handleStartMessage = async () => {
    if (!profile) return;
    try {
      setMessagingLoading(true);
      const res = await api.post<any>('/messages/conversations', {
        targetStudentId: profile._id,
      });
      if (res.success && res.conversation) {
        if (onNavigateToMessages) {
          onNavigateToMessages(res.conversation._id);
        }
      } else {
        alert(res.message || 'Cannot message this user due to their messaging privacy settings.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to open message conversation');
    } finally {
      setMessagingLoading(false);
    }
  };

  // Load Social Modals data on click
  const openSocialModal = async (type: 'connections' | 'following' | 'followers') => {
    if (!profile) return;
    setSocialModalType(type);
    setSocialLoading(true);

    try {
      if (type === 'connections') {
        const res = await api.get<any>(`/social/student/${profile._id}/connected-colleges`);
        if (res.success) setConnectedColleges(res.colleges || []);
      } else if (type === 'following') {
        const res = await api.get<any>(`/social/student/${profile._id}/following`);
        if (res.success) setFollowingStudents(res.following || []);
      } else if (type === 'followers') {
        const res = await api.get<any>(`/social/student/${profile._id}/followers`);
        if (res.success) setFollowerStudents(res.followers || []);
      }
    } catch (err) {
      console.error('Error loading social data', err);
    } finally {
      setSocialLoading(false);
    }
  };

  // Follow / Unfollow student toggle
  const handleToggleFollow = async (targetStudentId: string) => {
    try {
      const res = await api.post<any>('/social/student/follow', { targetStudentId });
      if (res.success) {
        // Update local counts
        setProfile((prev) => {
          if (!prev) return prev;
          const currentCount = prev.followingCount || 0;
          return {
            ...prev,
            followingCount: res.following ? currentCount + 1 : Math.max(0, currentCount - 1),
          };
        });

        // Re-load list if currently in following modal
        if (socialModalType === 'following' && profile) {
          const updatedRes = await api.get<any>(`/social/student/${profile._id}/following`);
          if (updatedRes.success) setFollowingStudents(updatedRes.following || []);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update follow status');
    }
  };

  // Delete event proposal / organized event
  const handleDeleteOrganizedEvent = async (eventId: string) => {
    try {
      const res = await api.delete<any>(`/events/${eventId}`);
      if (res.success) {
        setOrganizedEvents((prev) => prev.filter((e) => e._id !== eventId));
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            organizedCount: Math.max(0, (prev.organizedCount || 1) - 1),
            eventsCount: Math.max(0, (prev.eventsCount || 1) - 1),
          };
        });
      } else {
        alert(res.message || 'Failed to delete event');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    }
  };

  // Delete Certificate
  const handleDeleteCertificate = async (id: string) => {
    if (!confirm('Are you sure you want to remove this certificate?')) return;
    try {
      const res = await api.delete<any>(`/certificates/student/${id}`);
      if (res.success) {
        setCertificates((prev) => prev.filter((c) => c._id !== id));
        setSelectedCert(null);
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            certificatesCount: Math.max(0, (prev.certificatesCount || 1) - 1),
          };
        });
      }
    } catch (err) {
      alert('Failed to delete certificate');
    }
  };

  if (loading && !profile) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-color)]" />
        <p className="text-xs font-semibold text-[var(--text-muted)]">Loading Student Profile...</p>
      </div>
    );
  }

  const attendedEvents = registrations.filter((r) => r.attended);
  const totalEventsCount = profile?.eventsCount ?? (registrations.length + organizedEvents.length);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* SECTION 1: Digital Student ID Banner Card */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-xs">
        {/* Cover Photo */}
        <div className="h-44 sm:h-56 w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 relative">
          {profile?.coverPhoto && (
            <img
              src={profile.coverPhoto}
              alt="Profile Cover"
              className="w-full h-full object-cover"
            />
          )}
          {/* Back button when viewing other student */}
          {!isOwnProfile && onBack && (
            <button
              onClick={onBack}
              className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}

          {isOwnProfile && (
            <button
              onClick={() => setShowEditModal(true)}
              className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Edit className="w-3.5 h-3.5" /> Edit Profile
            </button>
          )}
        </div>

        {/* Profile Card Info */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            <div className="flex items-end gap-4">
              <img
                src={
                  profile?.profilePhoto ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
                }
                alt={profile?.fullName || 'Student'}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-[var(--surface)] bg-[var(--surface)] shadow-lg shrink-0"
              />
              <div className="mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
                    {profile?.fullName || user?.fullName}
                  </h1>
                  {profile?.username && (
                    <span className="text-xs font-bold text-[var(--primary-color)] bg-[var(--primary-color)]/10 px-2 py-0.5 rounded-lg border border-[var(--primary-color)]/20">
                      @{profile.username.replace(/^@/, '')}
                    </span>
                  )}
                  <span title="Verified Collegiate ID">
                    <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
                  </span>
                </div>
                <p className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                  {profile?.collegeName || 'Apex Institute of Technology'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {/* If viewing another student: Follow & Message buttons */}
              {!isOwnProfile && (
                <>
                  <button
                    onClick={handleToggleFollowCurrent}
                    disabled={followLoading}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                      isFollowingTarget
                        ? 'border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-red-500'
                        : 'bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] shadow-xs'
                    }`}
                  >
                    {followLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isFollowingTarget ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" /> Follow
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleStartMessage}
                    disabled={messagingLoading}
                    className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    {messagingLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5 text-[var(--primary-color)]" /> Message
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Share Profile button */}
              <button
                onClick={() => setShowShareModal(true)}
                className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Share Student Profile"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>

              {isOwnProfile && (
                <button
                  onClick={() => {
                    setEditingCert(null);
                    setShowAddCertModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Certificate
                </button>
              )}
            </div>
          </div>

          {/* SECTION 2: NEW SOCIAL & STATS NAVIGATION ROW (Connections | Following | Followers | Events) */}
          <div className="grid grid-cols-4 gap-2 sm:gap-6 py-3 my-2 border-t border-[var(--border-color)]">
            {/* Connections */}
            <button
              type="button"
              onClick={() => openSocialModal('connections')}
              className="group text-left p-2 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
            >
              <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)] group-hover:text-[var(--primary-color)] block transition-colors">
                Connections
              </span>
              <span className="text-base sm:text-xl font-black text-[var(--text-primary)] block mt-0.5">
                {profile?.connectionsCount ?? 0}
              </span>
            </button>

            {/* Following */}
            <button
              type="button"
              onClick={() => openSocialModal('following')}
              className="group text-left p-2 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
            >
              <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)] group-hover:text-[var(--primary-color)] block transition-colors">
                Following
              </span>
              <span className="text-base sm:text-xl font-black text-[var(--text-primary)] block mt-0.5">
                {profile?.followingCount ?? 0}
              </span>
            </button>

            {/* Followers */}
            <button
              type="button"
              onClick={() => openSocialModal('followers')}
              className="group text-left p-2 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
            >
              <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)] group-hover:text-[var(--primary-color)] block transition-colors">
                Followers
              </span>
              <span className="text-base sm:text-xl font-black text-[var(--text-primary)] block mt-0.5">
                {profile?.followersCount ?? 0}
              </span>
            </button>

            {/* Events */}
            <button
              type="button"
              onClick={() => {
                setActiveSection('events');
                setShowEventsModal(true);
              }}
              className="group text-left p-2 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
            >
              <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)] group-hover:text-[var(--primary-color)] block transition-colors">
                Events
              </span>
              <span className="text-base sm:text-xl font-black text-[var(--text-primary)] block mt-0.5">
                {totalEventsCount}
              </span>
            </button>
          </div>

          {/* SECTION 3: Academic Metadata Row (Department | Year of Study | Verified Awards | Attended Events) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-[var(--border-color)] text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Department</span>
              <span className="font-bold text-[var(--text-primary)]">{profile?.department || 'Computer Science'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Year of Study</span>
              <span className="font-bold text-[var(--text-primary)]">{profile?.yearOfStudy || '3rd Year'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Verified Awards</span>
              <span className="font-bold text-amber-600">{certificates.length} Credentials</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Attended Events</span>
              <span className="font-bold text-emerald-600">{attendedEvents.length} Events</span>
            </div>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] pt-4 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Skills tags */}
          {profile?.skills && profile.skills.length > 0 && (
            <div className="pt-4">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1.5">
                Technical Competencies & Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--surface-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: Navigation Tabs for Profile Body (Verified Awards & Credentials / Events Portfolio) */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
        <button
          onClick={() => setActiveSection('credentials')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSection === 'credentials'
              ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
          }`}
        >
          <Award className="w-4 h-4" />
          Verified Awards & Credentials ({certificates.length})
        </button>

        <button
          onClick={() => setActiveSection('events')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSection === 'events'
              ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Events Portfolio ({totalEventsCount})
        </button>
      </div>

      {/* TAB CONTENT A: VERIFIED CREDENTIALS & AWARDS PORTFOLIO */}
      {activeSection === 'credentials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                Verified Collegiate Awards & Credentials
              </h2>
            </div>

            {isOwnProfile && (
              <button
                onClick={() => {
                  setEditingCert(null);
                  setShowAddCertModal(true);
                }}
                className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Credential
              </button>
            )}
          </div>

          {certificates.length === 0 ? (
            <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-3">
              <Award className="w-10 h-10 mx-auto text-[var(--text-muted)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">No verified certificates yet</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Certificates issued by host colleges upon event attendance and awards will automatically appear here.
              </p>
              {isOwnProfile && (
                <button
                  onClick={() => {
                    setEditingCert(null);
                    setShowAddCertModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold cursor-pointer shadow-xs active:scale-95"
                >
                  Upload Certificate
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert._id}
                  onClick={() => setSelectedCert(cert)}
                  className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all cursor-pointer shadow-xs space-y-3 group"
                >
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-[var(--border-color)] relative">
                    <img
                      src={cert.fileUrl}
                      alt={cert.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                      onError={(e) => {
                        (e.target as any).src =
                          'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-bold text-amber-400">
                      {cert.achievementType}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                      {cert.title}
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {cert.issuingOrganization} · {cert.issueDate}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT B: EVENTS PORTFOLIO (Participated & Organized) */}
      {activeSection === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-[var(--surface-subtle)] p-1 rounded-xl border border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setEventSectionTab('participated')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  eventSectionTab === 'participated'
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Participated ({registrations.length})
              </button>
              <button
                type="button"
                onClick={() => setEventSectionTab('organized')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  eventSectionTab === 'organized'
                    ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Organized ({organizedEvents.length})
              </button>
            </div>
          </div>

          {/* Sub-tab 1: Participated */}
          {eventSectionTab === 'participated' && (
            <div>
              {registrations.length === 0 ? (
                <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
                  <Ticket className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">No participated events yet</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Events you register for or attend will appear here in your portfolio.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {registrations.map((reg) => (
                    <div
                      key={reg._id}
                      className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]">
                            {reg.registrationId}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              reg.attended
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : 'bg-blue-500/15 text-blue-600'
                            }`}
                          >
                            {reg.attended ? 'Attended' : 'Registered'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">
                          {reg.eventTitle || 'Campus Event'}
                        </h4>
                        <p className="text-xs text-[var(--text-muted)]">
                          {reg.eventDate} · {reg.registrationType}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
                        <button
                          type="button"
                          onClick={() => setSelectedReg(reg)}
                          className="grow px-3 py-1.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs active:scale-95"
                        >
                          <Ticket className="w-3.5 h-3.5" /> View Ticket
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: Organized */}
          {eventSectionTab === 'organized' && (
            <div>
              {organizedEvents.length === 0 ? (
                <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
                  <Flame className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">No organized events yet</h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Events or proposals created by you will be listed here with status tracking.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {organizedEvents.map((ev) => (
                    <OrganizedEventCard
                      key={ev._id}
                      event={ev}
                      isStudent={true}
                      onViewEvent={(event) => {
                        if (onViewEvent) onViewEvent(event);
                      }}
                      onEditEvent={(event) => {
                        setEditingEventProposal(event);
                        setIsEditingProposalOpen(true);
                      }}
                      onDeleteEvent={handleDeleteOrganizedEvent}
                      onViewInsights={(event) => setSelectedEventForInsights(event)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Connected Colleges */}
      {socialModalType === 'connections' && (
        <Modal
          isOpen={true}
          onClose={() => setSocialModalType(null)}
          title="Connected Colleges"
          subtitle="Institutions you are connected to on EVENTHUB"
          maxWidth="lg"
        >
          <div className="space-y-3 py-2">
            {socialLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
              </div>
            ) : connectedColleges.length === 0 ? (
              <div className="py-10 text-center space-y-2 text-[var(--text-muted)]">
                <Building2 className="w-8 h-8 mx-auto" />
                <p className="text-xs font-semibold">No connected colleges yet.</p>
                <p className="text-[11px]">Explore universities in the Colleges tab to connect.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {connectedColleges.map((col) => (
                  <div key={col._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={
                          col.logo ||
                          'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=120&auto=format&fit=crop&q=80'
                        }
                        alt={col.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {col.name}
                          </h4>
                          {(col.isVerified || col.verificationStatus === 'Verified') && (
                            <span title="Verified Institution">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {col.location || col.officialDomain}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSocialModalType(null);
                        if (onSelectCollege) onSelectCollege(col._id);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      View Profile <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL 2: Following Students */}
      {socialModalType === 'following' && (
        <Modal
          isOpen={true}
          onClose={() => setSocialModalType(null)}
          title="Following"
          subtitle="Fellow students you follow across campuses"
          maxWidth="lg"
        >
          <div className="space-y-3 py-2">
            {socialLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
              </div>
            ) : followingStudents.length === 0 ? (
              <div className="py-10 text-center space-y-2 text-[var(--text-muted)]">
                <Users className="w-8 h-8 mx-auto" />
                <p className="text-xs font-semibold">Not following any students yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {followingStudents.map((stud) => (
                  <div key={stud._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={
                          stud.profilePhoto ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
                        }
                        alt={stud.fullName}
                        className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {stud.fullName}
                        </h4>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {stud.collegeName} · {stud.department}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFollow(stud._id)}
                      className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-red-500/10 hover:text-red-600 text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Following
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL 3: Followers */}
      {socialModalType === 'followers' && (
        <Modal
          isOpen={true}
          onClose={() => setSocialModalType(null)}
          title="Followers"
          subtitle="Students who follow your collegiate journey"
          maxWidth="lg"
        >
          <div className="space-y-3 py-2">
            {socialLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
              </div>
            ) : followerStudents.length === 0 ? (
              <div className="py-10 text-center space-y-2 text-[var(--text-muted)]">
                <Users className="w-8 h-8 mx-auto" />
                <p className="text-xs font-semibold">No followers yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {followerStudents.map((stud) => (
                  <div key={stud._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={
                          stud.profilePhoto ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
                        }
                        alt={stud.fullName}
                        className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {stud.fullName}
                        </h4>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {stud.collegeName} · {stud.department}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFollow(stud._id)}
                      className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Follow
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL 4: Edit Student Profile Modal */}
      {showEditModal && profile && (
        <EditStudentProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          profile={profile}
          onSuccess={(updated) => {
            setProfile(updated);
            if (updateStudentProfileLocal) updateStudentProfileLocal(updated);
          }}
        />
      )}

      {/* MODAL 5: Add / Edit Certificate Modal */}
      {showAddCertModal && (
        <AddCertificateModal
          isOpen={showAddCertModal}
          onClose={() => {
            setShowAddCertModal(false);
            setEditingCert(null);
          }}
          certificateToEdit={editingCert}
          onSuccess={(savedCert) => {
            if (editingCert) {
              setCertificates((prev) =>
                prev.map((c) => (c._id === savedCert._id ? savedCert : c))
              );
            } else {
              setCertificates((prev) => [savedCert, ...prev]);
              setProfile((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  certificatesCount: (prev.certificatesCount || 0) + 1,
                };
              });
            }
            setShowAddCertModal(false);
            setEditingCert(null);
          }}
        />
      )}

      {/* MODAL 6: View Certificate Details Modal */}
      {selectedCert && (
        <CertificateModal
          isOpen={!!selectedCert}
          onClose={() => setSelectedCert(null)}
          certificate={selectedCert}
          onDelete={handleDeleteCertificate}
          onEdit={(cert) => {
            setSelectedCert(null);
            setEditingCert(cert);
            setShowAddCertModal(true);
          }}
        />
      )}

      {/* MODAL 7: Ticket Modal */}
      {selectedReg && (
        <TicketModal
          isOpen={!!selectedReg}
          onClose={() => setSelectedReg(null)}
          registration={selectedReg}
        />
      )}

      {/* MODAL 8: Event Analytics & Insights Modal */}
      {selectedEventForInsights && (
        <EventInsightsModal
          isOpen={!!selectedEventForInsights}
          onClose={() => setSelectedEventForInsights(null)}
          event={selectedEventForInsights}
        />
      )}

      {/* MODAL 9: Edit Event Proposal Modal */}
      {isEditingProposalOpen && editingEventProposal && (
        <MultiStepEventForm
          isOpen={isEditingProposalOpen}
          eventToEdit={editingEventProposal}
          isStudentProposal={true}
          onClose={() => {
            setIsEditingProposalOpen(false);
            setEditingEventProposal(null);
          }}
          onSuccess={(updated) => {
            setIsEditingProposalOpen(false);
            setEditingEventProposal(null);
            fetchProfileData();
          }}
        />
      )}
    </div>
  );
};

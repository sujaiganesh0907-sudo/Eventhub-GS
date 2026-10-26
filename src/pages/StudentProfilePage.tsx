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
import { AttendanceModal } from '../components/attendance/AttendanceModal';
import { DocxCertificateManagerModal } from '../components/certificate/DocxCertificateManagerModal';
import { IssueCertificateModal } from '../components/certificate/IssueCertificateModal';
import { ReshareCertificateModal } from '../components/certificate/ReshareCertificateModal';
import { PublicVerificationModal } from '../components/certificate/PublicVerificationModal';
import { EventRegistrationsModal } from '../components/registration/EventRegistrationsModal';
import { ResumeModal } from '../components/profile/ResumeModal';
import {
  DEFAULT_STUDENT_AVATAR,
  DEFAULT_STUDENT_COVER,
  DEFAULT_COLLEGE_LOGO,
  DEFAULT_CERTIFICATE_TEMPLATE,
} from '../services/imageDefaults';
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
  Shield,
  ShieldAlert,
  Lock,
  Upload,
  ChevronRight,
  FileText,
  Trash2,
} from 'lucide-react';

interface StudentProfilePageProps {
  onViewEvent?: (event: IEvent) => void;
  onSelectCollege?: (collegeId: string) => void;
  studentId?: string; // Optional: view another student's profile
  onNavigateToMessages?: (conversationId?: string) => void;
  onOpenAdminAccess?: (collegeId?: string) => void;
  onBack?: () => void;
}

export const StudentProfilePage: React.FC<StudentProfilePageProps> = ({
  onViewEvent,
  onSelectCollege,
  studentId,
  onNavigateToMessages,
  onOpenAdminAccess,
  onBack,
}) => {
  const { user, studentProfile, updateStudentProfileLocal } = useAuth();

  const [profile, setProfile] = useState<IStudentProfile | null>(
    !studentId && studentProfile ? studentProfile : null
  );
  const isOwnProfile = Boolean(!studentId || (profile && profile._id === studentProfile?._id) || (user && profile && profile.userId === user._id));

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
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showDeleteResumeConfirm, setShowDeleteResumeConfirm] = useState(false);
  const [deletingResume, setDeletingResume] = useState(false);
  const [showAddCertModal, setShowAddCertModal] = useState(false);
  const [editingCert, setEditingCert] = useState<ICertificate | null>(null);
  const [selectedCert, setSelectedCert] = useState<ICertificate | null>(null);
  const [selectedReg, setSelectedReg] = useState<IEventRegistration | null>(null);
  const [certToReshare, setCertToReshare] = useState<ICertificate | null>(null);
  const [certIdToVerify, setCertIdToVerify] = useState<string | null>(null);

  // Social Connections & Follow Modals
  const [socialModalType, setSocialModalType] = useState<'connections' | 'following' | 'followers' | null>(null);
  const [connectedColleges, setConnectedColleges] = useState<ICollege[]>([]);
  const [followingStudents, setFollowingStudents] = useState<IStudentProfile[]>([]);
  const [followerStudents, setFollowerStudents] = useState<IStudentProfile[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);

  // Admin Access Modal State (Requirements 2, 3, 4, 5)
  const [showAdminAccessModal, setShowAdminAccessModal] = useState(false);
  const [adminRoles, setAdminRoles] = useState<any[]>([]);
  const [loadingAdminRoles, setLoadingAdminRoles] = useState(false);
  const [isPinVerifiedInSession, setIsPinVerifiedInSession] = useState(false);
  const [hasConfiguredPin, setHasConfiguredPin] = useState<boolean | null>(null);
  const [pinStep, setPinStep] = useState<'enter' | 'setup' | 'forgot'>('enter');
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotConfirmPin, setForgotConfirmPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinNotice, setPinNotice] = useState<string | null>(null);

  const handleOpenAdminAccessModal = async () => {
    setShowAdminAccessModal(true);
    setLoadingAdminRoles(true);
    setPinError(null);
    setPinNotice(null);
    setPinInput('');
    setConfirmPinInput('');
    try {
      const res = await api.get<any>('/admins/my-roles');
      const roles = res.success ? (res.adminRoles || []) : [];
      setAdminRoles(roles);

      const activeList = roles.filter((r: any) => r.status === 'Active');
      if (activeList.length > 0 && !isPinVerifiedInSession) {
        // Check PIN status
        const pinRes = await api.get<any>('/admins/pin/status');
        if (pinRes.success) {
          setHasConfiguredPin(pinRes.hasPin);
          setPinStep(pinRes.hasPin ? 'enter' : 'setup');
        }
      }
    } catch {
      setAdminRoles([]);
    } finally {
      setLoadingAdminRoles(false);
    }
  };

  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinNotice(null);
    if (!/^\d{4}$/.test(pinInput.trim())) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    if (pinInput.trim() !== confirmPinInput.trim()) {
      setPinError('PINs do not match.');
      return;
    }
    setPinLoading(true);
    try {
      const res = await api.post<any>('/admins/pin/setup', {
        pin: pinInput.trim(),
        confirmPin: confirmPinInput.trim(),
      });
      if (res.success) {
        setHasConfiguredPin(true);
        setIsPinVerifiedInSession(true);
        setPinInput('');
        setConfirmPinInput('');
      } else {
        setPinError(res.message || 'Failed to setup PIN.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Error setting up PIN.');
    } finally {
      setPinLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinNotice(null);
    if (!/^\d{4}$/.test(pinInput.trim())) {
      setPinError('Please enter your 4-digit PIN.');
      return;
    }
    setPinLoading(true);
    try {
      const res = await api.post<any>('/admins/pin/verify', {
        pin: pinInput.trim(),
      });
      if (res.success && res.verified) {
        setIsPinVerifiedInSession(true);
        setPinInput('');
      } else {
        setPinError(res.message || 'Incorrect PIN.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Incorrect 4-digit PIN. Please try again.');
    } finally {
      setPinLoading(false);
    }
  };

  const handleRequestForgotOtp = async () => {
    setPinError(null);
    setPinNotice(null);
    setPinLoading(true);
    try {
      const res = await api.post<any>('/admins/pin/forgot', {});
      if (res.success) {
        setPinStep('forgot');
        setPinNotice(res.message || 'Verification code sent to registered email.');
      } else {
        setPinError(res.message || 'Unable to send reset code.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Failed to request reset code.');
    } finally {
      setPinLoading(false);
    }
  };

  const handleResetPinWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinNotice(null);
    if (!forgotOtp.trim()) {
      setPinError('Please enter the 6-digit verification code.');
      return;
    }
    if (!/^\d{4}$/.test(forgotNewPin.trim())) {
      setPinError('New PIN must be exactly 4 digits.');
      return;
    }
    if (forgotNewPin.trim() !== forgotConfirmPin.trim()) {
      setPinError('PINs do not match.');
      return;
    }
    setPinLoading(true);
    try {
      const res = await api.post<any>('/admins/pin/reset', {
        otp: forgotOtp.trim(),
        newPin: forgotNewPin.trim(),
        confirmPin: forgotConfirmPin.trim(),
      });
      if (res.success) {
        setHasConfiguredPin(true);
        setIsPinVerifiedInSession(true);
        setPinStep('enter');
        setForgotOtp('');
        setForgotNewPin('');
        setForgotConfirmPin('');
      } else {
        setPinError(res.message || 'Failed to reset PIN.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Failed to reset PIN.');
    } finally {
      setPinLoading(false);
    }
  };

  // Events Modal / Management State
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [selectedEventForInsights, setSelectedEventForInsights] = useState<IEvent | null>(null);
  const [editingEventProposal, setEditingEventProposal] = useState<IEvent | null>(null);
  const [isEditingProposalOpen, setIsEditingProposalOpen] = useState(false);
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<IEvent | null>(null);
  const [selectedEventForCertificates, setSelectedEventForCertificates] = useState<IEvent | null>(null);
  const [selectedEventForRegistrations, setSelectedEventForRegistrations] = useState<IEvent | null>(null);
  const [selectedEventForShare, setSelectedEventForShare] = useState<IEvent | null>(null);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const targetId = studentId || 'me';
      const isOwnerView = !studentId || (user && (user._id === studentId || studentProfile?._id === studentId));

      const fetchTasks: Promise<any>[] = [
        api.get<any>(`/students/${targetId}`),
        api.get<any>(isOwnerView ? '/certificates/my-certificates' : `/certificates/student/${targetId}`),
      ];

      if (isOwnerView) {
        fetchTasks.push(api.get<any>('/registrations/student'));
        fetchTasks.push(api.get<any>('/student/my-events'));
      } else {
        fetchTasks.push(Promise.resolve({ success: true, registrations: [] }));
        fetchTasks.push(api.get<any>('/events', { limit: 50 }));
      }

      const [profRes, certRes, regRes, orgRes] = await Promise.all(fetchTasks);

      if (profRes.success && (profRes.student || profRes.profile)) {
        const p = profRes.student || profRes.profile;
        setProfile(p);
        setIsFollowingTarget(!!p.isFollowing);
        if (!studentId && updateStudentProfileLocal) {
          updateStudentProfileLocal(p);
        }
        if (!isOwnerView) {
          // For another student, only show their published organized events
          const userEvents = (orgRes.events || []).filter(
            (e: any) => (e.creatorUserId === p.userId || e.createdBy === p.userId) && e.status === 'Published'
          );
          setOrganizedEvents(userEvents);
          setRegistrations([]);
          setEventSectionTab('organized');
        } else {
          setOrganizedEvents(orgRes.events || []);
          setRegistrations(regRes.registrations || []);
        }
      }

      if (certRes.success) setCertificates(certRes.certificates || []);
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

  const handleDeleteResume = async () => {
    try {
      setDeletingResume(true);
      const res = await api.delete<any>('/students/resume');
      if (res.success) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                resumeFileUrl: undefined,
                resumeFileType: undefined,
                resumeOriginalName: undefined,
                resumeUploadedAt: undefined,
                resumeUrl: undefined,
                resumeCoverUrl: undefined,
              }
            : prev
        );
        if (updateStudentProfileLocal) {
          updateStudentProfileLocal({
            resumeFileUrl: undefined,
            resumeFileType: undefined,
            resumeOriginalName: undefined,
            resumeUploadedAt: undefined,
            resumeUrl: undefined,
            resumeCoverUrl: undefined,
          });
        }
        setShowDeleteResumeConfirm(false);
        setShowResumeModal(false);
      } else {
        alert(res.message || 'Failed to delete resume');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting resume');
    } finally {
      setDeletingResume(false);
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
  const totalEventsCount = isOwnProfile ? (profile?.eventsCount ?? (registrations.length + organizedEvents.length)) : organizedEvents.length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* SECTION 1: Digital Student ID Banner Card */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-xs">
        {/* Cover Photo */}
        <div className="h-44 sm:h-56 md:h-64 w-full bg-slate-900 relative overflow-hidden">
          <img
            src={profile?.coverPhoto || DEFAULT_STUDENT_COVER}
            alt="Profile Cover"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as any).src = DEFAULT_STUDENT_COVER;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
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
        <div className="px-4 sm:px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 -mt-12 sm:-mt-16 md:-mt-20 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <img
                  src={profile?.profilePhoto || DEFAULT_STUDENT_AVATAR}
                  alt={profile?.fullName || 'Student'}
                  className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-[var(--surface)] bg-[var(--surface)] shadow-lg shrink-0"
                  onError={(e) => {
                    (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                  }}
                />
              </div>
              <div className="pt-1 sm:pt-0 sm:mb-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
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
                <p className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5 mt-1">
                  <Building2 className="w-3.5 h-3.5 text-[var(--primary-color)] shrink-0" />
                  <span className="truncate">{profile?.collegeName || 'Apex Institute of Technology'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap pt-1 sm:pt-0">
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
                <>
                  {/* Admin Access Button (Requirement 2 & 5) */}
                  <button
                    type="button"
                    onClick={handleOpenAdminAccessModal}
                    className="px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                    title="View authorized college administrator workspaces"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--primary-color)]" /> Admin Access
                  </button>

                  <button
                    onClick={() => {
                      setEditingCert(null);
                      setShowAddCertModal(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add Certificate
                  </button>
                </>
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
              <span className="font-bold text-emerald-600">{isOwnProfile ? attendedEvents.length : (profile?.attendedEventsCount ?? 0)} Events</span>
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

          {/* SECTION: COMPACT RESUME (Requirements 9, 10, 11, 12, 13) */}
          <div className="pt-3 mt-1 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1.5 shrink-0">
                  <FileText className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                  Resume
                </span>
                {profile?.resumeFileUrl && (
                  <span
                    className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[150px] sm:max-w-xs"
                    title={profile.resumeOriginalName || 'Resume Document'}
                  >
                    {profile.resumeOriginalName || 'Resume Document'}
                  </span>
                )}
                {profile?.resumeFileUrl && (
                  <span className="px-1.5 py-0.5 rounded-md bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-bold text-[10px] uppercase shrink-0">
                    {profile.resumeFileType || 'PDF'}
                  </span>
                )}
              </div>

              {profile?.resumeFileUrl ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowResumeModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Resume</span>
                  </button>

                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteResumeConfirm(true)}
                      className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                      title="Delete Resume"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Resume</span>
                    </button>
                  )}
                </div>
              ) : isOwnProfile ? (
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-dashed border-[var(--primary-color)]/50 hover:border-[var(--primary-color)] text-[var(--primary-color)] hover:bg-[var(--primary-color)]/5 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Resume</span>
                </button>
              ) : (
                <span className="text-xs text-[var(--text-muted)] italic">No resume uploaded</span>
              )}
            </div>
          </div>
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
                  className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all shadow-xs space-y-3 flex flex-col justify-between group"
                >
                  <div
                    onClick={() => setSelectedCert(cert)}
                    className="cursor-pointer space-y-3"
                  >
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-[var(--border-color)] relative">
                      <img
                        src={cert.coverUrl || cert.fileUrl}
                        alt={cert.title}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                        onError={(e) => {
                          (e.target as any).src = DEFAULT_CERTIFICATE_TEMPLATE;
                        }}
                      />
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-bold text-amber-400">
                        {cert.achievementType}
                      </span>
                      {cert.revoked ? (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-red-950/80 backdrop-blur-xs text-[10px] font-bold text-red-300 flex items-center gap-1 border border-red-500/30">
                          <ShieldAlert className="w-3 h-3 text-red-400" /> Credential Revoked
                        </span>
                      ) : cert.isCollegeVerified ? (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-emerald-950/80 backdrop-blur-xs text-[10px] font-bold text-emerald-300 flex items-center gap-1 border border-emerald-500/30">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> College Issued / Verified
                        </span>
                      ) : (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-indigo-950/80 backdrop-blur-xs text-[10px] font-bold text-indigo-300 flex items-center gap-1 border border-indigo-500/30">
                          <Upload className="w-3 h-3 text-indigo-400" /> Self Uploaded
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mb-1">
                        {cert.collegeLogo ? (
                          <img src={cert.collegeLogo} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                        )}
                        <span className="font-semibold text-[var(--text-primary)] truncate">
                          {cert.issuingOrganization}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                        {cert.title}
                      </h3>
                      <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                        ID: {cert.certificateId} · {cert.issueDate}
                      </p>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedCert(cert)}
                      className="flex-1 py-1.5 px-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[11px] font-semibold text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-blue-500" /> View
                    </button>

                    <button
                      type="button"
                      onClick={() => setCertIdToVerify(cert.certificateId)}
                      className="py-1.5 px-2 rounded-lg border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      title="Verify authenticity on registry"
                    >
                      <ShieldCheck className="w-3 h-3" /> Verify
                    </button>

                    {isOwnProfile && (
                      <button
                        type="button"
                        onClick={() => setCertToReshare(cert)}
                        className="py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        title="Reshare as Verified Credential Post"
                      >
                        <Share2 className="w-3 h-3" /> Reshare
                      </button>
                    )}

                    {/* Self-uploaded certificate edit and delete buttons (Requirement 13 & 15) */}
                    {isOwnProfile && !cert.isCollegeVerified && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCert(cert);
                            setShowAddCertModal(true);
                          }}
                          className="py-1.5 px-2 rounded-lg border border-[var(--border-color)] text-amber-600 hover:bg-amber-500/10 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title="Edit self-uploaded certificate"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCertificate(cert._id)}
                          className="py-1.5 px-2 rounded-lg border border-[var(--border-color)] text-red-600 hover:bg-red-500/10 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title="Delete self-uploaded certificate"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
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
            {isOwnProfile ? (
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
            ) : (
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[var(--primary-color)]" />
                Organized Collegiate Events ({organizedEvents.length})
              </h3>
            )}
          </div>

          {/* Sub-tab 1: Participated - Owner Only (Requirement 11) */}
          {isOwnProfile && eventSectionTab === 'participated' && (
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
                            {isOwnProfile ? reg.registrationId : 'Verified Participant'}
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

                      {isOwnProfile && (
                        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
                          <button
                            type="button"
                            onClick={() => setSelectedReg(reg)}
                            className="grow px-3 py-1.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs active:scale-95"
                          >
                            <Ticket className="w-3.5 h-3.5" /> View Ticket
                          </button>
                        </div>
                      )}
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
                      onEditEvent={isOwnProfile ? (event) => {
                        setEditingEventProposal(event);
                        setIsEditingProposalOpen(true);
                      } : undefined}
                      onDeleteEvent={isOwnProfile ? handleDeleteOrganizedEvent : undefined}
                      onViewInsights={isOwnProfile ? (event) => setSelectedEventForInsights(event) : undefined}
                      onShareEvent={(event) => setSelectedEventForShare(event)}
                      onOpenCheckInDesk={isOwnProfile ? (event) => setSelectedEventForAttendance(event) : undefined}
                      onViewRegistrations={isOwnProfile ? (event) => setSelectedEventForRegistrations(event) : undefined}
                      onManageAttendance={isOwnProfile ? (event) => setSelectedEventForAttendance(event) : undefined}
                      onManageCertificates={isOwnProfile ? (event) => setSelectedEventForCertificates(event) : undefined}
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
                        src={col.logo || DEFAULT_COLLEGE_LOGO}
                        alt={col.name}
                        className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                        onError={(e) => {
                          (e.target as any).src = DEFAULT_COLLEGE_LOGO;
                        }}
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
                        src={stud.profilePhoto || DEFAULT_STUDENT_AVATAR}
                        alt={stud.fullName}
                        className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                        onError={(e) => {
                          (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                        }}
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
                        src={stud.profilePhoto || DEFAULT_STUDENT_AVATAR}
                        alt={stud.fullName}
                        className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                        onError={(e) => {
                          (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                        }}
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
          isOwner={Boolean(isOwnProfile)}
          canDownload={Boolean(isOwnProfile || user?.role === 'College Super Admin' || user?.role === 'College Admin')}
          onDelete={isOwnProfile && !selectedCert.isCollegeVerified ? handleDeleteCertificate : undefined}
          onEdit={isOwnProfile && !selectedCert.isCollegeVerified ? (cert) => {
            setSelectedCert(null);
            setEditingCert(cert);
            setShowAddCertModal(true);
          } : undefined}
          onRevoked={() => {
            fetchProfileData();
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

      {/* MODAL 10: Attendance & Check-in Desk */}
      {selectedEventForAttendance && (
        <AttendanceModal
          isOpen={!!selectedEventForAttendance}
          onClose={() => setSelectedEventForAttendance(null)}
          event={selectedEventForAttendance}
        />
      )}

      {/* MODAL 11: DOCX Participation Certificates */}
      {selectedEventForCertificates && (
        <DocxCertificateManagerModal
          isOpen={!!selectedEventForCertificates}
          onClose={() => setSelectedEventForCertificates(null)}
          event={selectedEventForCertificates}
          onUpdated={() => fetchProfileData()}
        />
      )}

      {/* MODAL 12: Event Registrations List */}
      {selectedEventForRegistrations && (
        <EventRegistrationsModal
          isOpen={!!selectedEventForRegistrations}
          onClose={() => setSelectedEventForRegistrations(null)}
          event={selectedEventForRegistrations}
        />
      )}

      {/* MODAL 13: Share Event to Chat */}
      {selectedEventForShare && (
        <ShareToChatModal
          isOpen={!!selectedEventForShare}
          onClose={() => setSelectedEventForShare(null)}
          event={selectedEventForShare}
          onShareSuccess={(convId) => {
            setSelectedEventForShare(null);
            if (onNavigateToMessages) onNavigateToMessages(convId);
          }}
        />
      )}

      {/* MODAL 14: Reshare Verified Credential Post */}
      {certToReshare && (
        <ReshareCertificateModal
          isOpen={!!certToReshare}
          onClose={() => setCertToReshare(null)}
          certificate={certToReshare}
          onSuccess={() => fetchProfileData()}
        />
      )}

      {/* MODAL 15: Public Certificate Verification Modal */}
      {certIdToVerify && (
        <PublicVerificationModal
          isOpen={!!certIdToVerify}
          onClose={() => setCertIdToVerify(null)}
          certificateId={certIdToVerify}
        />
      )}
      {/* MODAL 10: Student Admin Access List Modal (Requirements 2 & 5) */}
      {showAdminAccessModal && (
        <Modal
          isOpen={showAdminAccessModal}
          onClose={() => setShowAdminAccessModal(false)}
          title="Admin Access"
          subtitle="Authorized collegiate administration"
          maxWidth="md"
        >
          <div className="py-2">
            {loadingAdminRoles ? (
              <div className="py-12 flex flex-col justify-center items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
                <span>Checking college admin authorizations...</span>
              </div>
            ) : adminRoles.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-color)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Admin Access</h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                  No active College Admin access.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminAccessModal(false)}
                    className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : !isPinVerifiedInSession ? (
              /* PIN-Gated Security Challenge (Requirements 2, 3, 4, 5) */
              <div className="p-4 sm:p-6 space-y-4">
                <div className="text-center space-y-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] text-[var(--primary-color)] flex items-center justify-center mx-auto shadow-xs">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black text-[var(--text-primary)]">
                    {pinStep === 'setup'
                      ? 'Create 4-Digit Admin Access PIN'
                      : pinStep === 'forgot'
                      ? 'Reset Admin Access PIN'
                      : 'Enter 4-Digit Admin Access PIN'}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                    {pinStep === 'setup'
                      ? 'Set up a secure 4-digit numeric PIN to protect your authorized collegiate workspaces.'
                      : pinStep === 'forgot'
                      ? 'Enter the 6-digit email verification code and choose a new 4-digit PIN.'
                      : 'Authorized institutional workspaces are protected. Enter your 4-digit PIN to proceed.'}
                  </p>
                </div>

                {pinNotice && (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{pinNotice}</span>
                  </div>
                )}

                {pinError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pinError}</span>
                  </div>
                )}

                {/* FORM A: ENTER PIN */}
                {pinStep === 'enter' && (
                  <form onSubmit={handleVerifyPin} className="space-y-4 max-w-xs mx-auto">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 text-center">
                        4-Digit PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        pattern="\d{4}"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        autoFocus
                        className="w-full text-center tracking-[0.5em] text-lg font-mono font-bold py-2.5 px-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:bg-[var(--surface)] focus:border-[var(--primary-color)] text-[var(--text-primary)] focus:outline-hidden transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={pinLoading || pinInput.length !== 4}
                      className="w-full py-2.5 px-4 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      <span>Unlock Admin Access</span>
                    </button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={handleRequestForgotOtp}
                        disabled={pinLoading}
                        className="text-xs text-[var(--primary-color)] hover:underline font-semibold cursor-pointer"
                      >
                        Forgot PIN? Reset via Email OTP
                      </button>
                    </div>
                  </form>
                )}

                {/* FORM B: SETUP INITIAL PIN */}
                {pinStep === 'setup' && (
                  <form onSubmit={handleSetupPin} className="space-y-3.5 max-w-xs mx-auto">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        Choose 4-Digit PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        pattern="\d{4}"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full text-center tracking-[0.4em] text-base font-mono font-bold py-2 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:bg-[var(--surface)] focus:border-[var(--primary-color)] text-[var(--text-primary)] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        Confirm 4-Digit PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        pattern="\d{4}"
                        value={confirmPinInput}
                        onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full text-center tracking-[0.4em] text-base font-mono font-bold py-2 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:bg-[var(--surface)] focus:border-[var(--primary-color)] text-[var(--text-primary)] focus:outline-hidden"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={pinLoading || pinInput.length !== 4 || confirmPinInput.length !== 4}
                      className="w-full py-2.5 px-4 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Set PIN & View Workspaces</span>
                    </button>
                  </form>
                )}

                {/* FORM C: FORGOT PIN OTP RESET */}
                {pinStep === 'forgot' && (
                  <form onSubmit={handleResetPinWithOtp} className="space-y-3.5 max-w-xs mx-auto">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        6-Digit Email Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full text-center tracking-widest text-base font-mono font-bold py-2 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:bg-[var(--surface)] focus:border-[var(--primary-color)] text-[var(--text-primary)] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        New 4-Digit PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={forgotNewPin}
                        onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full text-center tracking-[0.4em] text-base font-mono font-bold py-2 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:bg-[var(--surface)] focus:border-[var(--primary-color)] text-[var(--text-primary)] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        Confirm New PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={forgotConfirmPin}
                        onChange={(e) => setForgotConfirmPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full text-center tracking-[0.4em] text-base font-mono font-bold py-2 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:bg-[var(--surface)] focus:border-[var(--primary-color)] text-[var(--text-primary)] focus:outline-hidden"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={pinLoading || forgotOtp.length !== 6 || forgotNewPin.length !== 4 || forgotConfirmPin.length !== 4}
                      className="w-full py-2.5 px-4 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>Reset PIN & Unlock</span>
                    </button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setPinStep('enter');
                          setPinError(null);
                        }}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] font-semibold cursor-pointer"
                      >
                        Cancel, Back to PIN Entry
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-[var(--text-muted)]">
                  You are an authorized administrator for the following colleges. Select an institution to enter its workspace:
                </p>

                <div className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--surface)] shadow-xs">
                  {adminRoles.map((role) => (
                    <div
                      key={role.membershipId || role.collegeId}
                      onClick={() => {
                        if (role.status === 'Active') {
                          setShowAdminAccessModal(false);
                          localStorage.setItem('eventhub_active_college', role.collegeId);
                          if (onOpenAdminAccess) {
                            onOpenAdminAccess(role.collegeId);
                          } else if (onSelectCollege) {
                            onSelectCollege(role.collegeId);
                          }
                        }
                      }}
                      className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                        role.status === 'Active'
                          ? 'hover:bg-[var(--surface-hover)] cursor-pointer group'
                          : 'bg-[var(--surface-subtle)] opacity-70 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={role.college?.logo || DEFAULT_COLLEGE_LOGO}
                          alt={role.college?.name}
                          className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                          onError={(e) => {
                            (e.target as any).src = DEFAULT_COLLEGE_LOGO;
                          }}
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-color)] transition-colors truncate">
                            {role.college?.name || 'Institution'}
                          </h4>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            Role: <span className="font-semibold text-[var(--text-secondary)]">{role.role || 'College Admin'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            role.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                          }`}
                        >
                          Status: {role.status}
                        </span>
                        {role.status === 'Active' && (
                          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--primary-color)] transition-colors" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Resume View Modal (Requirements 9, 10, 11) */}
      {showResumeModal && profile?.resumeFileUrl && (
        <ResumeModal
          isOpen={showResumeModal}
          onClose={() => setShowResumeModal(false)}
          resume={{
            fileUrl: profile.resumeFileUrl,
            fileType: profile.resumeFileType,
            originalName: profile.resumeOriginalName,
            uploadedAt: profile.resumeUploadedAt,
            coverUrl: profile.resumeCoverUrl,
          }}
          studentName={profile.fullName || 'Student'}
          isOwner={isOwnProfile}
          onDeleteResume={() => setShowDeleteResumeConfirm(true)}
        />
      )}

      {/* Delete Resume Confirmation Modal (Requirement 12) */}
      {showDeleteResumeConfirm && (
        <Modal
          isOpen={showDeleteResumeConfirm}
          onClose={() => setShowDeleteResumeConfirm(false)}
          title="Delete Resume"
          maxWidth="sm"
        >
          <div className="space-y-4 py-1">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to delete your uploaded resume? This document will be permanently removed from your profile.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setShowDeleteResumeConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingResume}
                onClick={handleDeleteResume}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {deletingResume && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Resume</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

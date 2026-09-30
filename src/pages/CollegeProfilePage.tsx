import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ICollege, IEvent, IPlacementPost, IInfrastructurePost } from '../types';
import { EditCollegeProfileModal } from '../components/profile/EditCollegeProfileModal';
import { AddPlacementPostModal } from '../components/profile/AddPlacementPostModal';
import { AddInfrastructureModal } from '../components/profile/AddInfrastructureModal';
import { AddAdminModal } from '../components/admin/AddAdminModal';
import { ManageAdminsModal } from '../components/admin/ManageAdminsModal';
import { EventCard } from '../components/event/EventCard';
import { ShareToChatModal } from '../components/common/ShareToChatModal';
import { DEFAULT_COLLEGE_LOGO, DEFAULT_COLLEGE_COVER } from '../services/imageDefaults';
import {
  Building2,
  ShieldCheck,
  MapPin,
  Globe,
  Users,
  Calendar,
  Briefcase,
  Layers,
  UserCheck,
  Edit,
  Plus,
  Trash2,
  UserPlus,
  Check,
  ExternalLink,
  Loader2,
  Map,
  MessageSquare,
  Share2,
  ArrowLeft,
} from 'lucide-react';

interface CollegeProfilePageProps {
  collegeId?: string;
  onViewEvent: (event: IEvent) => void;
  onRegisterEvent: (event: IEvent) => void;
  onNavigateToMessages?: (conversationId?: string) => void;
  onBack?: () => void;
}

export const CollegeProfilePage: React.FC<CollegeProfilePageProps> = ({
  collegeId,
  onViewEvent,
  onRegisterEvent,
  onNavigateToMessages,
  onBack,
}) => {
  const { user, college: authCollege, studentProfile } = useAuth();

  const isCollegeAccount = user?.role === 'College Super Admin' || user?.role === 'College Admin';
  const targetCollegeId =
    collegeId ||
    authCollege?._id ||
    studentProfile?.targetCollegeId ||
    'col_apex_tech_01';

  const isSelf = Boolean(
    isCollegeAccount &&
    authCollege?._id &&
    targetCollegeId &&
    authCollege._id === targetCollegeId
  );

  const [college, setCollege] = useState<ICollege | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'placements' | 'infra' | 'admins'>('events');

  // If not college owner/admin, prevent admins tab from remaining active
  useEffect(() => {
    if (!isSelf && activeTab === 'admins') {
      setActiveTab('events');
    }
  }, [isSelf, activeTab]);

  // Tab Data
  const [events, setEvents] = useState<IEvent[]>([]);
  const [placements, setPlacements] = useState<IPlacementPost[]>([]);
  const [infrastructures, setInfrastructures] = useState<IInfrastructurePost[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Modals
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAddPlacementModal, setShowAddPlacementModal] = useState(false);
  const [showAddInfraModal, setShowAddInfraModal] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showManageAdminsModal, setShowManageAdminsModal] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<any | null>(null);

  const fetchCollegeData = async () => {
    try {
      setLoading(true);
      let resolvedId = targetCollegeId;

      if (!resolvedId) {
        const listRes = await api.get<any>('/colleges', { limit: 1 }).catch(() => null);
        if (listRes?.success && listRes.colleges?.length > 0) {
          resolvedId = listRes.colleges[0]._id;
        }
      }

      if (!resolvedId) {
        setLoading(false);
        return;
      }

      // Fetch primary college details
      const colRes = await api.get<any>(`/colleges/${resolvedId}`).catch((err) => {
        console.warn('Notice: Primary college fetch error:', err?.message || err);
        return null;
      });

      if (colRes?.success && colRes.college) {
        setCollege(colRes.college);
      }

      // Concurrently fetch secondary tabs with individual catch so failures don't block profile
      const [evRes, plRes, inRes] = await Promise.all([
        api.get<any>('/events', { collegeId: resolvedId }).catch(() => ({ success: false, events: [] })),
        api.get<any>('/placements', { collegeId: resolvedId }).catch(() => ({ success: false, posts: [] })),
        api.get<any>('/infrastructure', { collegeId: resolvedId }).catch(() => ({ success: false, posts: [] })),
      ]);

      if (evRes?.success) setEvents(evRes.events || []);
      if (plRes?.success) setPlacements(plRes.posts || []);
      if (inRes?.success) setInfrastructures(inRes.posts || []);

      // Check real connection status safely for students
      if (user?._id && resolvedId && user.role === 'Student') {
        try {
          const connRes = await api.get<any>(`/social/college/${resolvedId}/connection`);
          if (connRes?.success) {
            setIsFollowing(!!connRes.connected);
          }
        } catch {
          // Connection status is optional
        }
      }

      // Load admins only if user is authorized college admin
      if (isSelf) {
        try {
          const admRes = await api.get<any>('/admins', { collegeId: resolvedId });
          if (admRes?.success) setAdmins(admRes.admins || []);
        } catch (admErr) {
          console.warn('Could not load college admin list:', admErr);
        }
      }
    } catch (err: any) {
      console.warn('College profile data notice:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollegeData();
  }, [targetCollegeId]);

  const handleToggleFollow = async () => {
    if (!targetCollegeId) return;
    try {
      const res = await api.post<any>('/social/college/connection', { collegeId: targetCollegeId });
      if (res.success) {
        setIsFollowing(res.connected);
        if (college) {
          setCollege({
            ...college,
            connectionsCount: typeof res.connectionsCount === 'number'
              ? res.connectionsCount
              : (res.connected
                ? (college.connectionsCount || 0) + 1
                : Math.max(0, (college.connectionsCount || 0) - 1)),
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartMessage = async () => {
    if (!targetCollegeId) return;
    try {
      setMessagingLoading(true);
      const res = await api.post<any>('/messages/conversations', {
        targetCollegeId,
      });
      if (res.success && res.conversation) {
        if (onNavigateToMessages) {
          onNavigateToMessages(res.conversation._id);
        }
      } else {
        alert(res.message || 'Cannot message this college due to institutional messaging privacy settings.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to start message conversation');
    } finally {
      setMessagingLoading(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!confirm('Are you sure you want to revoke this admin access?')) return;
    try {
      const res = await api.delete<any>(`/admins/${adminId}`);
      if (res.success) {
        setAdmins((prev) => prev.filter((a) => a._id !== adminId && a.userId !== adminId));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove admin');
    }
  };

  if (loading && !college) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-color)]" />
      </div>
    );
  }

  if (!college) {
    return (
      <div className="p-8 text-center text-xs text-[var(--text-muted)]">
        Institution profile not found.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Institution Banner Card */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-xs">
        {/* Cover Photo */}
        <div className="h-44 sm:h-64 w-full bg-slate-900 relative">
          <img
            src={college.coverPhoto || DEFAULT_COLLEGE_COVER}
            alt="Campus Cover"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as any).src = DEFAULT_COLLEGE_COVER;
            }}
          />
          {onBack && (
            <button
              onClick={onBack}
              className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
          {isSelf && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {user?.role === 'College Super Admin' && (
                <button
                  type="button"
                  onClick={() => setShowManageAdminsModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white backdrop-blur-xs text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Manage Admins
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowEditProfileModal(true)}
                className="px-3 py-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Institution Info */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
            <div className="flex items-end gap-4">
              <img
                src={college.logo || DEFAULT_COLLEGE_LOGO}
                alt={college.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-[var(--surface)] bg-[var(--surface)] shadow-lg"
                onError={(e) => {
                  (e.target as any).src = DEFAULT_COLLEGE_LOGO;
                }}
              />
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
                    {college.name}
                  </h1>
                  {college.verificationStatus === 'Verified' && (
                    <span title="Accredited University"><ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" /></span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {college.location || 'University Campus'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {college.connectionsCount || 0} Connections
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {college.website && (
                <a
                  href={college.website}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Globe className="w-4 h-4" /> Website
                </a>
              )}

              {!isSelf && (
                <>
                  <button
                    onClick={handleStartMessage}
                    disabled={messagingLoading}
                    className="px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    {messagingLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5 text-[var(--primary-color)]" /> Message
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleToggleFollow}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                      isFollowing
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                        : 'bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] shadow-xs'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <Check className="w-4 h-4" /> Connected
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" /> Connect College
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Share College Profile */}
              <button
                onClick={() => setShowShareModal(true)}
                className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Share College Profile"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </div>

          {college.bio && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] pt-2 leading-relaxed max-w-4xl">
              {college.bio}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'events'
                ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Campus Events ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('placements')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'placements'
                ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" /> Placements ({placements.length})
          </button>
          <button
            onClick={() => setActiveTab('infra')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'infra'
                ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Campus Facilities ({infrastructures.length})
          </button>
          {isSelf && (
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'admins'
                  ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" /> Staff Admins ({admins.length}/10)
            </button>
          )}
        </div>

        {/* Tab Actions */}
        <div>
          {isSelf && activeTab === 'placements' && (
            <button
              onClick={() => setShowAddPlacementModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Placement
            </button>
          )}
          {isSelf && activeTab === 'infra' && (
            <button
              onClick={() => setShowAddInfraModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Facility
            </button>
          )}
          {isSelf && activeTab === 'admins' && (
            <button
              onClick={() => setShowAddAdminModal(true)}
              disabled={admins.length >= 10}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add Admin ({admins.length}/10)
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: EVENTS */}
      {activeTab === 'events' && (
        <div>
          {events.length === 0 ? (
            <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] text-xs text-[var(--text-muted)]">
              No live events published by {college.name} yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((ev) => (
                <EventCard
                  key={ev._id}
                  event={ev}
                  onViewEvent={onViewEvent}
                  onRegister={onRegisterEvent}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PLACEMENTS */}
      {activeTab === 'placements' && (
        <div>
          {placements.length === 0 ? (
            <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
              <Briefcase className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">No placement records posted</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Recruitment updates, offer announcements, and annual reports will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {placements.map((post) => (
                <div
                  key={post._id}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-xs space-y-3"
                >
                  {post.mediaUrl && (
                    <div className="h-44 w-full bg-slate-900">
                      <img src={post.mediaUrl} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[var(--primary-color)]">
                        {post.company}
                      </span>
                      {post.packageLPA && (
                        <span className="text-xs font-bold text-emerald-600 font-mono">
                          {post.packageLPA}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">{post.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                      {post.message}
                    </p>
                    {post.placementStatistics && (
                      <p className="text-[11px] text-[var(--text-muted)] font-semibold pt-1 border-t border-[var(--border-color)]">
                        Stats: {post.placementStatistics}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INFRASTRUCTURE */}
      {activeTab === 'infra' && (
        <div>
          {infrastructures.length === 0 ? (
            <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
              <Layers className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">No campus facilities listed</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Research laboratories, libraries, and hostels will be showcased here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {infrastructures.map((inf) => (
                <div
                  key={inf._id}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-xs space-y-3"
                >
                  {inf.mediaUrl && (
                    <div className="aspect-video w-full bg-slate-900">
                      <img src={inf.mediaUrl} alt={inf.facilityTitle} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                      {inf.facilityType}
                    </span>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{inf.facilityTitle}</h3>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-3">{inf.description}</p>
                    {inf.googleMapsLink && (
                      <a
                        href={inf.googleMapsLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary-color)] hover:underline pt-1"
                      >
                        <Map className="w-3.5 h-3.5" /> View on Google Maps
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ADMINS (SELF ONLY) */}
      {isSelf && activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-[var(--text-primary)]">College Administrator Delegation</p>
              <p className="text-[var(--text-secondary)]">
                You have delegated {admins.length} of 10 maximum staff coordinator slots.
              </p>
            </div>
            <button
              onClick={() => setShowAddAdminModal(true)}
              disabled={admins.length >= 10}
              className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              Add Staff Admin
            </button>
          </div>

          <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden divide-y divide-[var(--border-color)]">
            {admins.map((adm) => (
              <div key={adm._id} className="p-4 bg-[var(--surface)] flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">{adm.name}</h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]">
                      {adm.email}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600">
                      {adm.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Permissions: <span className="font-medium text-[var(--text-secondary)]">{adm.permissions?.join(', ') || 'All Features'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminToEdit(adm);
                      setShowAddAdminModal(true);
                    }}
                    className="p-2 text-[var(--primary-color)] hover:bg-[var(--primary-light)] rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveAdmin(adm._id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showEditProfileModal && (
        <EditCollegeProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          college={college}
          onSuccess={(updated) => setCollege(updated)}
        />
      )}

      {showAddPlacementModal && (
        <AddPlacementPostModal
          isOpen={showAddPlacementModal}
          onClose={() => setShowAddPlacementModal(false)}
          onSuccess={(post) => setPlacements([post, ...placements])}
        />
      )}

      {showAddInfraModal && (
        <AddInfrastructureModal
          isOpen={showAddInfraModal}
          onClose={() => setShowAddInfraModal(false)}
          onSuccess={(post) => setInfrastructures([post, ...infrastructures])}
        />
      )}

      {showManageAdminsModal && college && (
        <ManageAdminsModal
          isOpen={showManageAdminsModal}
          onClose={() => setShowManageAdminsModal(false)}
          collegeId={college._id}
          onOpenAddAdmin={() => setShowAddAdminModal(true)}
        />
      )}

      {showAddAdminModal && (
        <AddAdminModal
          isOpen={showAddAdminModal}
          onClose={() => {
            setShowAddAdminModal(false);
            setAdminToEdit(null);
          }}
          onSuccess={(savedAdmin) => {
            fetchCollegeData();
            setShowAddAdminModal(false);
          }}
          currentAdminCount={admins.length}
        />
      )}

      {/* Share Modal */}
      {showShareModal && college && (
        <ShareToChatModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          college={college}
          onShareSuccess={(convId) => {
            setShowShareModal(false);
            if (onNavigateToMessages) onNavigateToMessages(convId);
          }}
        />
      )}
    </div>
  );
};

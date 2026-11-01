import React, { useState, useEffect, useRef } from 'react';
import { ICollege } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Building2,
  ShieldCheck,
  MapPin,
  Globe,
  Users,
  Search,
  Check,
  UserPlus,
  Loader2,
  ExternalLink,
  X,
  Sparkles,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { DEFAULT_COLLEGE_LOGO, DEFAULT_COLLEGE_COVER, DEFAULT_STUDENT_AVATAR } from '../services/imageDefaults';
import {
  getSearchHistory,
  saveSearchTerm,
  removeSearchTerm,
  clearSearchHistory,
} from '../services/searchHistory';
import { SearchHistoryDropdown } from '../components/common/SearchHistoryDropdown';

export interface IOrganizerListing {
  _id: string;
  userId: string;
  organizationName: string;
  organizationType?: string;
  officialEmail?: string;
  location?: string;
  bio?: string;
  logo?: string;
  coverPhoto?: string;
  verified?: boolean;
  eventsOrganizedCount?: number;
  followersCount?: number;
  isFollowing?: boolean;
}

interface CollegesListPageProps {
  onSelectCollege: (collegeId: string) => void;
  onSelectOrganizer?: (organizerId: string) => void;
}

export const CollegesListPage: React.FC<CollegesListPageProps> = ({
  onSelectCollege,
  onSelectOrganizer,
}) => {
  const { user, isCollege, isStudent, studentProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'colleges' | 'organizers'>('colleges');

  const [colleges, setColleges] = useState<ICollege[]>([]);
  const [organizers, setOrganizers] = useState<IOrganizerListing[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [followingCollegeMap, setFollowingCollegeMap] = useState<Record<string, boolean>>({});
  const [followingOrgMap, setFollowingOrgMap] = useState<Record<string, boolean>>({});
  const [followingOrgLoading, setFollowingOrgLoading] = useState<Record<string, boolean>>({});

  // Search History State
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(getSearchHistory('colleges'));
  }, []);

  // Close history dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'colleges') {
        const res = await api.get<any>('/colleges', { search });
        if (res.success) {
          setColleges(res.colleges || []);

          if (user && user.role === 'Student' && studentProfile?._id) {
            try {
              const connRes = await api.get<any>(`/social/student/${studentProfile._id}/connected-colleges`);
              if (connRes?.success && Array.isArray(connRes.colleges)) {
                const map: Record<string, boolean> = {};
                for (const col of connRes.colleges) {
                  map[col._id] = true;
                }
                setFollowingCollegeMap(map);
              }
            } catch {
              // Ignore
            }
          }
        }
      } else {
        const res = await api.get<any>('/organizers', { search });
        if (res.success) {
          const orgList: IOrganizerListing[] = res.organizers || [];
          setOrganizers(orgList);

          const orgMap: Record<string, boolean> = {};
          orgList.forEach((o) => {
            if (o.isFollowing) orgMap[o._id] = true;
          });
          setFollowingOrgMap(orgMap);
        }
      }
    } catch (err) {
      console.error('Failed to fetch institutions or organizers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, activeTab]);

  const handleSelectHistoryTerm = (term: string) => {
    setSearch(term);
    setShowHistory(false);
    const updated = saveSearchTerm('colleges', term);
    setHistory(updated);
  };

  const handleRemoveHistoryTerm = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeSearchTerm('colleges', term);
    setHistory(updated);
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearSearchHistory('colleges');
    setHistory([]);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      const updated = saveSearchTerm('colleges', search.trim());
      setHistory(updated);
      setShowHistory(false);
    }
  };

  const handleToggleCollegeConnection = async (collegeId: string) => {
    try {
      const res = await api.post<any>('/social/college/connection', { collegeId });
      if (res.success) {
        setFollowingCollegeMap((prev) => ({
          ...prev,
          [collegeId]: res.connected,
        }));
        if (typeof res.connectionsCount === 'number') {
          setColleges((prev) =>
            prev.map((c) =>
              c._id === collegeId ? { ...c, connectionsCount: res.connectionsCount } : c
            )
          );
        }
      }
    } catch (err) {
      console.error('Failed to toggle college connection', err);
    }
  };

  const handleToggleOrganizerFollow = async (orgId: string) => {
    try {
      setFollowingOrgLoading((prev) => ({ ...prev, [orgId]: true }));
      const res = await api.post<any>('/social/organizer/follow', { targetOrganizerId: orgId });
      if (res.success) {
        setFollowingOrgMap((prev) => ({
          ...prev,
          [orgId]: res.following,
        }));
        setOrganizers((prev) =>
          prev.map((o) => {
            if (o._id !== orgId) return o;
            const updatedCount = typeof res.followersCount === 'number'
              ? res.followersCount
              : (res.following ? (o.followersCount || 0) + 1 : Math.max(0, (o.followersCount || 0) - 1));
            return {
              ...o,
              isFollowing: res.following,
              followersCount: updatedCount,
            };
          })
        );
      }
    } catch (err) {
      console.error('Failed to toggle organizer follow', err);
    } finally {
      setFollowingOrgLoading((prev) => ({ ...prev, [orgId]: false }));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header & Tab Toggle & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Explore Institutions & Organizers
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Discover accredited partner colleges, browse campus infrastructure, and follow event organizers
          </p>
        </div>

        {/* Search Bar with History */}
        <div className="relative w-full sm:w-80" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                value={search}
                onFocus={() => {
                  if (!search.trim()) setShowHistory(true);
                }}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value.trim().length === 0) {
                    setShowHistory(true);
                  } else {
                    setShowHistory(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim()) {
                    const updated = saveSearchTerm('colleges', search.trim());
                    setHistory(updated);
                    setShowHistory(false);
                  }
                }}
                placeholder={
                  activeTab === 'colleges'
                    ? 'Search colleges, cities, domains...'
                    : 'Search organizers by name, type, city...'
                }
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary-color)] transition-all shadow-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Search History Dropdown */}
          {showHistory && !search.trim() && history.length > 0 && (
            <SearchHistoryDropdown
              context="colleges"
              history={history}
              onSelectTerm={handleSelectHistoryTerm}
              onRemoveTerm={handleRemoveHistoryTerm}
              onClearAll={handleClearHistory}
            />
          )}
        </div>
      </div>

      {/* Segmented Filter: Colleges vs Organizers */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('colleges');
            setSearch('');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'colleges'
              ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
              : 'border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Partner Colleges & Universities ({colleges.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('organizers');
            setSearch('');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'organizers'
              ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
              : 'border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Event Organizers ({organizers.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-color)]" />
        </div>
      ) : activeTab === 'colleges' ? (
        colleges.length === 0 ? (
          <div className="p-16 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-3">
            <Building2 className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {search ? `No colleges found matching "${search}"` : 'No institutions found'}
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {search
                ? 'Try searching by a different university name, city, or public identifier.'
                : 'Partner institutions will appear here.'}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="px-4 py-2 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] border border-[var(--border-color)] cursor-pointer"
              >
                Clear Search Query
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {colleges.map((col) => {
              const isFollowing = !!followingCollegeMap[col._id];
              const isSelf = user?.collegeId === col._id;

              return (
                <div
                  key={col._id}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Cover banner */}
                    <div className="h-28 w-full bg-slate-800 relative">
                      <img
                        src={col.coverPhoto || DEFAULT_COLLEGE_COVER}
                        alt={col.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).src = DEFAULT_COLLEGE_COVER;
                        }}
                      />
                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-slate-900 border border-slate-200 shadow-sm flex items-center gap-1">
                          <Users className="w-3 h-3 text-indigo-600" />
                          <span>{col.connectionsCount || 0} Followers</span>
                        </span>
                      </div>
                    </div>

                    {/* Logo & Info */}
                    <div className="p-4 pt-0 relative">
                      <div className="-mt-8 mb-3 flex items-end justify-between">
                        <img
                          src={col.logo || DEFAULT_COLLEGE_LOGO}
                          alt={col.name}
                          className="w-16 h-16 rounded-2xl object-cover border-4 border-[var(--surface)] shadow-md bg-white shrink-0"
                          onError={(e) => {
                            (e.target as any).src = DEFAULT_COLLEGE_LOGO;
                          }}
                        />
                        {col.verificationStatus === 'Verified' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Accredited</span>
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => onSelectCollege(col._id)}
                        className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--primary-color)] transition-colors cursor-pointer line-clamp-1"
                      >
                        {col.name}
                      </h3>

                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{col.location || 'Campus Location'}</span>
                      </p>

                      {col.bio && (
                        <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                          {col.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 pt-0 border-t border-[var(--border-color)] mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectCollege(col._id)}
                      className="flex-1 py-2 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] border border-[var(--border-color)] transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>View Campus</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>

                    {!isSelf && isStudent && (
                      <button
                        type="button"
                        onClick={() => handleToggleCollegeConnection(col._id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isFollowing
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-500'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ORGANIZERS VIEW */
        organizers.length === 0 ? (
          <div className="p-16 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-3">
            <Sparkles className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-50" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {search ? `No event organizers found matching "${search}"` : 'No registered organizers found'}
            </h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {search
                ? 'Try searching by organization name, category, or city.'
                : 'Registered event organizers and student chapters will appear here.'}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="px-4 py-2 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] border border-[var(--border-color)] cursor-pointer"
              >
                Clear Search Query
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {organizers.map((org) => {
              const isFollowing = !!followingOrgMap[org._id];
              const isSelf = user?._id === org.userId;
              const isToggling = !!followingOrgLoading[org._id];

              return (
                <div
                  key={org._id}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Cover banner */}
                    <div className="h-28 w-full bg-slate-800 relative">
                      <img
                        src={org.coverPhoto || DEFAULT_COLLEGE_COVER}
                        alt={org.organizationName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).src = DEFAULT_COLLEGE_COVER;
                        }}
                      />
                      <div className="absolute top-2.5 right-2.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-slate-900 border border-slate-200 shadow-sm flex items-center gap-1">
                          <Users className="w-3 h-3 text-indigo-600" />
                          <span>{org.followersCount || 0} Followers</span>
                        </span>
                      </div>
                    </div>

                    {/* Logo & Info */}
                    <div className="p-4 pt-0 relative">
                      <div className="-mt-8 mb-3 flex items-end justify-between">
                        <img
                          src={org.logo || DEFAULT_STUDENT_AVATAR}
                          alt={org.organizationName}
                          className="w-16 h-16 rounded-2xl object-cover border-4 border-[var(--surface)] shadow-md bg-white shrink-0"
                          onError={(e) => {
                            (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                          }}
                        />
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>{org.organizationType || 'Event Organizer'}</span>
                        </span>
                      </div>

                      <h3
                        onClick={() => onSelectOrganizer && onSelectOrganizer(org._id)}
                        className="text-sm font-bold text-[var(--text-primary)] hover:text-indigo-600 transition-colors cursor-pointer line-clamp-1"
                      >
                        {org.organizationName}
                      </h3>

                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{org.location || 'India'}</span>
                      </p>

                      {org.bio && (
                        <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                          {org.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 pt-0 border-t border-[var(--border-color)] mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectOrganizer && onSelectOrganizer(org._id)}
                      className="flex-1 py-2 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] border border-[var(--border-color)] transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>View Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleToggleOrganizerFollow(org._id)}
                        disabled={isToggling}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isFollowing
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-500'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isFollowing ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

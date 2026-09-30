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
} from 'lucide-react';
import { DEFAULT_COLLEGE_LOGO, DEFAULT_COLLEGE_COVER } from '../services/imageDefaults';
import {
  getSearchHistory,
  saveSearchTerm,
  removeSearchTerm,
  clearSearchHistory,
} from '../services/searchHistory';
import { SearchHistoryDropdown } from '../components/common/SearchHistoryDropdown';

interface CollegesListPageProps {
  onSelectCollege: (collegeId: string) => void;
}

export const CollegesListPage: React.FC<CollegesListPageProps> = ({
  onSelectCollege,
}) => {
  const { user, isCollege, isStudent, studentProfile } = useAuth();
  const [colleges, setColleges] = useState<ICollege[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  // Search History State (Requirement 7)
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

  const fetchColleges = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/colleges', { search });
      if (res.success) {
        setColleges(res.colleges || []);
        
        // Fetch accurate connected colleges for student
        if (user && user.role === 'Student' && studentProfile?._id) {
          try {
            const connRes = await api.get<any>(`/social/student/${studentProfile._id}/connected-colleges`);
            if (connRes?.success && Array.isArray(connRes.colleges)) {
              const map: Record<string, boolean> = {};
              for (const col of connRes.colleges) {
                map[col._id] = true;
              }
              setFollowingMap(map);
            }
          } catch {
            // Optional
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch colleges', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, [search]);

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

  const handleToggleFollow = async (collegeId: string) => {
    try {
      const res = await api.post<any>('/social/college/connection', { collegeId });
      if (res.success) {
        setFollowingMap((prev) => ({
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
      console.error('Failed to toggle follow', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header & Search Bar (Requirement 4.C & 7) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Partner Colleges & Universities
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Discover accredited institutions, browse campus infrastructure, and follow for symposium updates
          </p>
        </div>

        {/* Colleges Search Bar with Instagram-like History */}
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
                placeholder="Search college name or identifier..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary-color)] transition-all shadow-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Instagram-like Search History Dropdown */}
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

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-color)]" />
        </div>
      ) : colleges.length === 0 ? (
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
        <div className="space-y-4">
          {search.trim().length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Showing {colleges.length} matching institution{colleges.length === 1 ? '' : 's'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {colleges.map((col) => {
              const isFollowing = !!followingMap[col._id];
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
                      <div className="absolute -bottom-6 left-4">
                        <img
                          src={col.logo || DEFAULT_COLLEGE_LOGO}
                          alt={col.name}
                          className="w-14 h-14 rounded-xl object-cover border-2 border-[var(--surface)] bg-[var(--surface)] shadow-md"
                          onError={(e) => {
                            (e.target as any).src = DEFAULT_COLLEGE_LOGO;
                          }}
                        />
                      </div>
                    </div>

                    {/* Info body */}
                    <div className="pt-8 px-4 pb-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3
                              onClick={() => onSelectCollege(col._id)}
                              className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--primary-color)] transition-colors cursor-pointer line-clamp-1"
                            >
                              {col.name}
                            </h3>
                            {col.verificationStatus === 'Verified' && (
                              <span title="Accredited Partner"><ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" /></span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[var(--text-muted)]" />
                            {col.location || 'Campus'}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {col.bio || 'Affiliated higher education institution active on EVENTHUB.'}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] pt-1 border-t border-[var(--border-color)]">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                          {col.connectionsCount || 0} connections
                        </span>
                        {col.website && (
                          <a
                            href={col.website}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 hover:text-[var(--primary-color)] transition-colors truncate max-w-36"
                          >
                            <Globe className="w-3 h-3" />
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        saveSearchTerm('colleges', col.name);
                        setHistory(getSearchHistory('colleges'));
                        onSelectCollege(col._id);
                      }}
                      className="px-3.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      View College ID
                    </button>

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleToggleFollow(col._id)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                          isFollowing
                            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                            : 'bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] shadow-xs'
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Connected
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" /> Connect
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

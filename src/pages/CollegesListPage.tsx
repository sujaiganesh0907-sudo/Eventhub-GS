import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface CollegesListPageProps {
  onSelectCollege: (collegeId: string) => void;
}

export const CollegesListPage: React.FC<CollegesListPageProps> = ({
  onSelectCollege,
}) => {
  const { user, isCollege, isStudent } = useAuth();
  const [colleges, setColleges] = useState<ICollege[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  const fetchColleges = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/colleges', { search });
      if (res.success) {
        setColleges(res.colleges || []);
        // Check following states
        const map: Record<string, boolean> = {};
        for (const col of res.colleges || []) {
          if (col.followers && user?._id && col.followers.includes(user._id)) {
            map[col._id] = true;
          }
        }
        setFollowingMap(map);
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

  const handleToggleFollow = async (collegeId: string) => {
    try {
      const res = await api.post<any>(`/colleges/${collegeId}/follow`, {});
      if (res.success) {
        setFollowingMap((prev) => ({
          ...prev,
          [collegeId]: res.following,
        }));
      }
    } catch (err) {
      console.error('Failed to toggle follow', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Partner Colleges & Universities
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Discover accredited institutions, browse campus infrastructure, and follow for symposium updates
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search universities, cities..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-color)]" />
        </div>
      ) : colleges.length === 0 ? (
        <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
          <Building2 className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">No institutions found</h3>
          <p className="text-xs text-[var(--text-muted)]">Try adjusting your search criteria.</p>
        </div>
      ) : (
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
                      src={
                        col.coverPhoto ||
                        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80'
                      }
                      alt={col.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute -bottom-6 left-4">
                      <img
                        src={
                          col.logo ||
                          'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&auto=format&fit=crop&q=80'
                        }
                        alt={col.name}
                        className="w-14 h-14 rounded-xl object-cover border-2 border-[var(--surface)] bg-[var(--surface)] shadow-md"
                      />
                    </div>
                  </div>

                  {/* Info body */}
                  <div className="pt-8 p-4 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <h3
                        onClick={() => onSelectCollege(col._id)}
                        className="text-base font-bold text-[var(--text-primary)] hover:text-[var(--primary-color)] transition-colors cursor-pointer line-clamp-1"
                      >
                        {col.name}
                      </h3>
                      {col.verificationStatus === 'Verified' && (
                        <span title="Verified Institution"><ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" /></span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {col.location || 'Campus'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {col.connectionsCount || 0} Connections
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1">
                      {col.bio || 'Accredited university participating in inter-college symposiums, hackathons, and research summits.'}
                    </p>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 pt-0 flex items-center justify-between gap-2 border-t border-[var(--border-color)]/60 mt-2">
                  <button
                    onClick={() => onSelectCollege(col._id)}
                    className="grow py-2 px-3 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-primary)] text-center transition-colors cursor-pointer"
                  >
                    View Campus
                  </button>

                  {!isSelf && (
                    <button
                      onClick={() => handleToggleFollow(col._id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
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
      )}
    </div>
  );
};

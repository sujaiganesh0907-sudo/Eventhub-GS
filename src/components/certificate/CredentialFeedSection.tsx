import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PublicVerificationModal } from './PublicVerificationModal';
import {
  Award,
  ShieldCheck,
  Building2,
  Heart,
  Calendar,
  ExternalLink,
  MessageSquare,
  Share2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { DEFAULT_STUDENT_AVATAR, DEFAULT_COLLEGE_LOGO } from '../../services/imageDefaults';

export const CredentialFeedSection: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerifyId, setSelectedVerifyId] = useState<string | null>(null);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/certificates/feed');
      if (res.success && res.posts) {
        setPosts(res.posts);
      }
    } catch (err) {
      console.error('Failed to load credential feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleToggleLike = async (postId: string) => {
    if (!isAuthenticated) return;
    try {
      const res = await api.post<any>(`/certificates/feed/${postId}/like`);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId
              ? {
                  ...p,
                  likesCount: res.likesCount,
                  likedUserIds: res.liked
                    ? [...(p.likedUserIds || []), user?.id]
                    : (p.likedUserIds || []).filter((id: string) => id !== user?.id),
                }
              : p
          )
        );
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--primary-color)]" />
        <span>Loading verified student credentials...</span>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] space-y-2">
        <Award className="w-8 h-8 mx-auto text-amber-500/60" />
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          No Community Credentials Shared Yet
        </h3>
        <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
          When students attend events and reshare their verified certificates from host colleges, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {posts.map((post) => {
          const isLiked = post.likedUserIds?.includes(user?.id);

          return (
            <div
              key={post._id}
              className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--border-hover)] transition-all shadow-xs space-y-4 flex flex-col justify-between"
            >
              {/* Post Author Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={post.studentAvatar || DEFAULT_STUDENT_AVATAR}
                    alt={post.studentName}
                    className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                    onError={(e) => {
                      (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                    }}
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {post.studentName}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {post.studentCollege || 'Verified Student'}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-[var(--text-muted)] font-medium shrink-0">
                  {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recent'}
                </span>
              </div>

              {/* Student's Custom Caption */}
              {post.comment && (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                  {post.comment}
                </p>
              )}

              {/* Verified Credential Card Embedded */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-slate-900/5 to-transparent dark:from-amber-950/20 dark:via-slate-900/40 dark:to-transparent space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {post.collegeLogo ? (
                      <img
                        src={post.collegeLogo}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover shrink-0"
                        onError={(e) => {
                          (e.target as any).src = DEFAULT_COLLEGE_LOGO;
                        }}
                      />
                    ) : (
                      <Building2 className="w-4 h-4 text-[var(--primary-color)] shrink-0" />
                    )}
                    <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {post.collegeName || 'Host College'}
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black tracking-wide flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3 h-3" /> VERIFIED
                  </span>
                </div>

                <div>
                  <h5 className="text-sm font-black text-[var(--text-primary)] tracking-tight">
                    {post.certificateTitle}
                  </h5>
                  {post.eventTitle && (
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{post.eventTitle}</span>
                    </p>
                  )}
                  <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
                    Credential ID: <span className="font-bold text-[var(--text-primary)]">{post.certificateId}</span>
                  </p>
                </div>

                {/* Verification & Inspection Actions */}
                <div className="pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedVerifyId(post.certificateId)}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verify Authenticity</span>
                  </button>

                  {post.fileUrl && (
                    <a
                      href={post.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
                    >
                      <span>View Credential</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Feed Card Actions */}
              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                <button
                  type="button"
                  onClick={() => handleToggleLike(post._id)}
                  className={`flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
                    isLiked ? 'text-red-500' : 'hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-red-500' : ''}`} />
                  <span>{post.likesCount || 0} Kudos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVerifyId(post.certificateId)}
                  className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedVerifyId && (
        <PublicVerificationModal
          isOpen={!!selectedVerifyId}
          onClose={() => setSelectedVerifyId(null)}
          certificateId={selectedVerifyId}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { IOrganizerPost, IEvent } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Heart,
  MessageSquare,
  Share2,
  Trash2,
  Video,
  Image,
  Send,
  Calendar,
  Sparkles,
  Loader2,
  ExternalLink,
  Tag,
  Plus,
} from 'lucide-react';
import { DEFAULT_STUDENT_AVATAR } from '../../services/imageDefaults';
import { CreateOrganizerPostModal } from './CreateOrganizerPostModal';

interface OrganizerPostsTabProps {
  organizerId: string;
  organizerUserId: string;
  organizerName: string;
  organizerLogo?: string;
  isOwnOrganizer: boolean;
  events?: IEvent[];
  onViewEvent?: (event: IEvent) => void;
}

export const OrganizerPostsTab: React.FC<OrganizerPostsTabProps> = ({
  organizerId,
  organizerUserId,
  organizerName,
  organizerLogo,
  isOwnOrganizer,
  events = [],
  onViewEvent,
}) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<IOrganizerPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New post composer state
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'Event Announcement' | 'Event Video' | 'Update'>('Event Announcement');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/organizer/posts', {
        organizerId: organizerId || undefined,
        organizerUserId: organizerUserId || undefined,
      });
      if (res.success && Array.isArray(res.posts)) {
        setPosts(res.posts);
      }
    } catch (err) {
      console.error('Failed to fetch organizer posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizerId || organizerUserId) {
      fetchPosts();
    }
  }, [organizerId, organizerUserId]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const selectedEvent = events.find((ev) => ev._id === selectedEventId);
      const res = await api.post<any>('/organizer/posts', {
        content: content.trim(),
        postType,
        mediaUrl: mediaUrl.trim() || undefined,
        mediaType: postType === 'Event Video' ? 'video' : 'image',
        eventId: selectedEventId || undefined,
        eventTitle: selectedEvent?.title || undefined,
      });

      if (res.success && res.post) {
        setPosts((prev) => [res.post, ...prev]);
        setContent('');
        setMediaUrl('');
        setSelectedEventId('');
        setComposerOpen(false);
      } else {
        alert(res.message || 'Failed to create post');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      const res = await api.post<any>(`/organizer/posts/${postId}/like`);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) => {
            if (p._id !== postId) return p;
            const currentLiked = user?._id && p.likedBy?.includes(user._id);
            return {
              ...p,
              likesCount: res.likesCount,
              likedBy: res.liked
                ? [...(p.likedBy || []), user?._id || '']
                : (p.likedBy || []).filter((id) => id !== user?._id),
            };
          })
        );
      }
    } catch (err) {
      console.error('Failed to toggle like', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this organizer update?')) return;
    try {
      const res = await api.delete<any>(`/organizer/posts/${postId}`);
      if (res.success) {
        setPosts((prev) => prev.filter((p) => p._id !== postId));
      } else {
        alert(res.message || 'Failed to delete post');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting post');
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header with Title and Create Post Button */}
      <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Organizer Posts & Announcements</h3>
          <p className="text-xs text-[var(--text-muted)]">Official event broadcasts, teasers, and updates</p>
        </div>
        {isOwnOrganizer && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Post</span>
          </button>
        )}
      </div>

      {/* Organizer Post Quick Composer Card */}
      {isOwnOrganizer && (
        <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={organizerLogo || DEFAULT_STUDENT_AVATAR}
              alt={organizerName}
              className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
              onError={(e) => {
                (e.target as any).src = DEFAULT_STUDENT_AVATAR;
              }}
            />
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex-1 text-left px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-indigo-400 transition-colors cursor-pointer flex items-center justify-between"
            >
              <span>Share an announcement, video, or update with your attendees...</span>
              <Plus className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-2" />
            </button>
          </div>

          {composerOpen && (
            <form onSubmit={handleCreatePost} className="pt-2 border-t border-[var(--border-color)] space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Post Content / Announcement <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="e.g. Our next event is live! Join us for the AI & Future Tech Workshop on May 10, 2025. Limited seats available!"
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    Post Type
                  </label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] font-medium text-[var(--text-primary)]"
                  >
                    <option value="Event Announcement">Event Announcement</option>
                    <option value="Event Video">Event Video</option>
                    <option value="Update">Text Update</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-primary)] mb-1">
                    {postType === 'Event Video' ? 'Video URL (MP4 / YouTube)' : 'Media / Image Banner URL'}
                  </label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {events.length > 0 && postType === 'Event Announcement' && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Link to Organized Event (Optional)
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] font-medium text-[var(--text-primary)]"
                  >
                    <option value="">Select an event to highlight in this post</option>
                    {events.map((ev) => (
                      <option key={ev._id} value={ev._id}>
                        {ev.title} ({ev.eventDate})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Post Update</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Organizer Posts List */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-[var(--text-muted)] space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <p className="text-xs">Loading organizer updates...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-10 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-3">
          <Sparkles className="w-8 h-8 mx-auto text-indigo-500" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">No updates published yet</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            {isOwnOrganizer
              ? 'Share announcements, workshop highlights, or teaser videos for your upcoming organized events above.'
              : `${organizerName} hasn't posted any updates yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isLiked = user?._id && post.likedBy?.includes(user._id);
            const isAuthor = user?._id && (post.organizerUserId === user._id || isOwnOrganizer);

            return (
              <div
                key={post._id}
                className="p-4 sm:p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-3 transition-all hover:border-indigo-200 dark:hover:border-indigo-800"
              >
                {/* Post Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.organizerLogo || organizerLogo || DEFAULT_STUDENT_AVATAR}
                      alt={post.organizerName}
                      className="w-10 h-10 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                      onError={(e) => {
                        (e.target as any).src = DEFAULT_STUDENT_AVATAR;
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">
                          {post.organizerName || organizerName}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {post.postType}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {post.createdAt ? new Date(post.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) : 'Recent'}
                      </span>
                    </div>
                  </div>

                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post._id)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      title="Delete Post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Title */}
                {post.title && (
                  <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-tight">
                    {post.title}
                  </h4>
                )}

                {/* Content */}
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                  {post.content}
                </p>

                {/* Media Attachment */}
                {post.mediaUrl && (
                  <div className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-slate-900">
                    {post.postType === 'Event Video' || post.mediaType === 'video' ? (
                      <video
                        src={post.mediaUrl}
                        controls
                        className="w-full max-h-96 object-contain mx-auto"
                      />
                    ) : (
                      <img
                        src={post.mediaUrl}
                        alt="Event update banner"
                        className="w-full max-h-96 object-cover"
                      />
                    )}
                  </div>
                )}

                {/* Linked Event Pill if present */}
                {post.eventTitle && (
                  <div className="p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-semibold text-indigo-950 dark:text-indigo-200 truncate">
                        {post.eventTitle}
                      </span>
                    </div>
                    {post.eventId && onViewEvent && (
                      <button
                        type="button"
                        onClick={() => {
                          const ev = events.find((e) => e._id === post.eventId);
                          if (ev) onViewEvent(ev);
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <span>View Event</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Action Buttons: Like, Comment, Share */}
                <div className="flex items-center gap-4 pt-2 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post._id)}
                    className={`flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
                      isLiked ? 'text-red-500' : 'hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 stroke-red-500' : ''}`} />
                    <span>{post.likesCount || 0}</span>
                  </button>

                  <div className="flex items-center gap-1.5 font-semibold">
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.commentsCount || 0}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `${post.organizerName} on EVENTHUB`,
                          text: post.content,
                          url: window.location.href,
                        }).catch(() => {});
                      } else {
                        navigator.clipboard?.writeText(window.location.href);
                        alert('Link copied to clipboard');
                      }
                    }}
                    className="flex items-center gap-1.5 font-semibold hover:text-indigo-600 transition-colors ml-auto cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating Organizer Posts */}
      {isOwnOrganizer && (
        <CreateOrganizerPostModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onPostCreated={(newPost) => {
            setPosts((prev) => [newPost, ...prev]);
          }}
          organizerEvents={events}
        />
      )}
    </div>
  );
};

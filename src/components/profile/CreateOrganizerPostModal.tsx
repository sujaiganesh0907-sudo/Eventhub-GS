import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { IEvent, IOrganizerPost } from '../../types';
import { api } from '../../services/api';
import {
  Sparkles,
  Calendar,
  Video,
  FileText,
  Image as ImageIcon,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Link2,
} from 'lucide-react';

export type OrganizerPostCategory = 'Photo / Poster Post' | 'Video Post' | 'Text / Announcement Post';

interface CreateOrganizerPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: IOrganizerPost) => void;
  organizerEvents?: IEvent[];
}

export const CreateOrganizerPostModal: React.FC<CreateOrganizerPostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  organizerEvents = [],
}) => {
  const [postType, setPostType] = useState<OrganizerPostCategory>('Photo / Poster Post');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [tagsInput, setTagsInput] = useState('');

  const [eventsList, setEventsList] = useState<IEvent[]>(organizerEvents);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync or fetch organizer's own events for the optional event selector
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSuccess(null);

    if (organizerEvents.length > 0) {
      setEventsList(organizerEvents);
      return;
    }

    const fetchMyEvents = async () => {
      try {
        setLoadingEvents(true);
        const res = await api.get<any>('/organizer/events');
        if (res.success && Array.isArray(res.events)) {
          setEventsList(res.events);
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchMyEvents();
  }, [isOpen, organizerEvents]);

  // When post type changes, adjust media type default
  useEffect(() => {
    if (postType === 'Video Post') {
      setMediaType('video');
    } else {
      setMediaType('image');
    }
  }, [postType]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('File size must be under 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
        if (file.type.startsWith('video/')) {
          setMediaType('video');
          setPostType('Video Post');
        } else {
          setMediaType('image');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // Prevent duplicate submissions

    setError(null);
    setSuccess(null);

    // Validation per post type
    if (postType === 'Text / Announcement Post') {
      if (!description.trim()) {
        setError('Announcement text content is required.');
        return;
      }
    } else {
      if (!title.trim()) {
        setError('Post Title is required.');
        return;
      }
      if (!description.trim()) {
        setError('Description is required.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const selectedEvent = eventsList.find((ev) => ev._id === selectedEventId);
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const isVideoPost = postType === 'Video Post' || mediaType === 'video';
      const isTextOnly = postType === 'Text / Announcement Post';

      const res = await api.post<any>('/organizer/posts', {
        title: title.trim() || undefined,
        description: description.trim(),
        content: description.trim(),
        postType,
        eventId: selectedEventId || undefined,
        eventTitle: selectedEvent?.title || undefined,
        mediaUrl: isTextOnly ? undefined : (mediaUrl.trim() || undefined),
        mediaType: isVideoPost ? 'video' : 'image',
        tags: parsedTags,
      });

      if (res.success && res.post) {
        setSuccess('Organizer post published successfully.');
        onPostCreated(res.post);

        // Reset form & close
        setTimeout(() => {
          setTitle('');
          setDescription('');
          setTagsInput('');
          setMediaUrl('');
          setSelectedEventId('');
          setPostType('Photo / Poster Post');
          setSuccess(null);
          onClose();
        }, 500);
      } else {
        setError(res.message || 'Failed to publish post. Please verify your fields.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while publishing post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Organizer Post"
      subtitle="Publish posters, teaser videos, or text announcements for your attendees and followers"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* 1. Post Type Selector (3 Distinct Options) */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
            Post Format <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setPostType('Photo / Poster Post');
                setMediaType('image');
              }}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                postType === 'Photo / Poster Post'
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <span>1. Photo / Poster</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPostType('Video Post');
                setMediaType('video');
              }}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                postType === 'Video Post'
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <Video className="w-4 h-4 text-purple-600" />
              <span>2. Video Post</span>
            </button>

            <button
              type="button"
              onClick={() => setPostType('Text / Announcement Post')}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                postType === 'Text / Announcement Post'
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>3. Text Announcement</span>
            </button>
          </div>
        </div>

        {/* 2. Post Title */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Post Title{' '}
            {postType === 'Text / Announcement Post' ? (
              <span className="text-[10px] font-normal text-[var(--text-muted)]">(Optional)</span>
            ) : (
              <span className="text-red-500">*</span>
            )}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              postType === 'Photo / Poster Post'
                ? 'e.g. Official Poster: Annual National Hackathon 2026'
                : postType === 'Video Post'
                ? 'e.g. Workshop Teaser & Sneak Peek: Robotics Arena'
                : 'e.g. Important Guidelines for Symposium Participants'
            }
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
            required={postType !== 'Text / Announcement Post'}
            maxLength={120}
          />
        </div>

        {/* 3. Description (Required) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-[var(--text-primary)]">
              {postType === 'Text / Announcement Post' ? 'Announcement Content' : 'Description'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-[var(--text-muted)]">
              {description.length} characters
            </span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              postType === 'Text / Announcement Post'
                ? 'Write your announcement, schedule change, instructions, or broadcast message here...'
                : 'Describe the poster or video, explain the schedule, eligibility, perks, and how to register...'
            }
            rows={4}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            required
          />
        </div>

        {/* 4. Topic Tags / Hashtags */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Hashtags <span className="text-[10px] font-normal text-[var(--text-muted)]">(Optional, comma separated)</span>
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. TechFest2026, AIWorkshop, Hackathon, Coding"
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        {/* 5. Media Upload & Preview (for Photo and Video posts) */}
        {postType !== 'Text / Announcement Post' && (
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              {postType === 'Video Post' ? 'Upload Video or Enter Video URL' : 'Upload Poster / Image or Enter Image URL'}{' '}
              <span className="text-[10px] font-normal text-[var(--text-muted)]">(Recommended)</span>
            </label>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative grow">
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder={
                      postType === 'Video Post'
                        ? 'https://... direct video URL (MP4, WebM)'
                        : 'https://images.unsplash.com/... or image link'
                    }
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <Link2 className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3" />
                </div>

                <label className="px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] cursor-pointer shrink-0 flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept={postType === 'Video Post' ? 'video/*' : 'image/*'}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {mediaUrl && (
                  <button
                    type="button"
                    onClick={() => setMediaUrl('')}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs cursor-pointer"
                    title="Remove media"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Media Preview */}
              {mediaUrl && (
                <div className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-slate-900 max-h-56 flex items-center justify-center relative p-1">
                  {postType === 'Video Post' || mediaType === 'video' ? (
                    <video
                      src={mediaUrl}
                      controls
                      className="max-h-52 w-full object-contain rounded-lg"
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt="Post preview"
                      className="max-h-52 w-full object-contain rounded-lg"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. Optional Event Selector */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Linked Event <span className="text-[10px] font-normal text-[var(--text-muted)]">(Optional)</span>
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            disabled={loadingEvents}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="">None — General Organization Post</option>
            {eventsList.map((ev) => (
              <option key={ev._id} value={ev._id}>
                {ev.title} ({ev.eventDate || 'Upcoming'})
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons: Publish Post & Cancel */}
        <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Publish Post</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

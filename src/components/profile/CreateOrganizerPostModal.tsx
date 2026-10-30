import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { IEvent, IOrganizerPost } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  Calendar,
  Video,
  FileText,
  Image,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Link2,
} from 'lucide-react';

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
  const { user } = useAuth();

  const [postType, setPostType] = useState<'Event Announcement' | 'Event Video' | 'General Update'>('Event Announcement');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

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
    if (postType === 'Event Video') {
      setMediaType('video');
    } else {
      setMediaType('image');
    }
  }, [postType]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('File size must be under 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
        if (file.type.startsWith('video/')) {
          setMediaType('video');
          setPostType('Event Video');
        } else {
          setMediaType('image');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!title.trim()) {
      setError('Post Title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    setSubmitting(true);

    try {
      const selectedEvent = eventsList.find((ev) => ev._id === selectedEventId);
      const res = await api.post<any>('/organizer/posts', {
        title: title.trim(),
        description: description.trim(),
        content: description.trim(),
        postType,
        eventId: selectedEventId || undefined,
        eventTitle: selectedEvent?.title || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
        mediaType: postType === 'Event Video' ? 'video' : mediaType,
      });

      if (res.success && res.post) {
        setSuccess('Post published successfully!');
        onPostCreated(res.post);

        // Reset form & close
        setTimeout(() => {
          setTitle('');
          setDescription('');
          setMediaUrl('');
          setSelectedEventId('');
          setPostType('Event Announcement');
          setSuccess(null);
          onClose();
        }, 600);
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
      subtitle="Publish official announcements, videos, or updates for attendees and followers"
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

        {/* 1. Post Type Selector */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
            Post Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPostType('Event Announcement')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                postType === 'Event Announcement'
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Event Announcement</span>
            </button>

            <button
              type="button"
              onClick={() => setPostType('Event Video')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                postType === 'Event Video'
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <Video className="w-4 h-4 text-purple-600" />
              <span>Event Video</span>
            </button>

            <button
              type="button"
              onClick={() => setPostType('General Update')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                postType === 'General Update'
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>General Update</span>
            </button>
          </div>
        </div>

        {/* 2. Post Title */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Post Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              postType === 'Event Announcement'
                ? 'e.g. Registrations Live for Annual Hackathon 2026'
                : postType === 'Event Video'
                ? 'e.g. Highlights & Teaser: Robotics Arena 2026'
                : 'e.g. Important Schedule Update for Participants'
            }
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
            required
            maxLength={120}
          />
        </div>

        {/* 3. Description (Required Textarea) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-[var(--text-primary)]">
              Description <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-[var(--text-muted)]">
              {description.length} characters
            </span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Share full details, schedules, requirements, or instructions with your community..."
            rows={4}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            required
          />
        </div>

        {/* 4. Optional Event Selector */}
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
          {eventsList.length === 0 && !loadingEvents && (
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              You haven't published any events yet. Posts can still be created as general updates.
            </p>
          )}
        </div>

        {/* 5. Media (Image/Video Upload or URL Link) */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            {postType === 'Event Video' ? 'Video Media / Link' : 'Media Image or Poster'}{' '}
            <span className="text-[10px] font-normal text-[var(--text-muted)]">(Optional)</span>
          </label>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative grow">
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder={
                    postType === 'Event Video'
                      ? 'https://... video URL (MP4, YouTube, or direct stream)'
                      : 'https://images.unsplash.com/... or image link'
                  }
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <Link2 className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-3" />
              </div>

              <label className="px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] cursor-pointer shrink-0 flex items-center gap-1.5 transition-colors">
                <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Upload</span>
                <input
                  type="file"
                  accept={postType === 'Event Video' ? 'video/*,image/*' : 'image/*'}
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
              <div className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-slate-900 max-h-44 flex items-center justify-center relative">
                {postType === 'Event Video' || mediaType === 'video' ? (
                  <video src={mediaUrl} controls className="max-h-44 w-auto object-contain" />
                ) : (
                  <img src={mediaUrl} alt="Preview" className="max-h-44 w-full object-cover" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons: Publish Post & Cancel */}
        <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-all cursor-pointer"
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

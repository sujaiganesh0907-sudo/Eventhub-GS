import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import { AlertCircle, Check, Briefcase } from 'lucide-react';

interface AddPlacementPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (post: any) => void;
}

export const AddPlacementPostModal: React.FC<AddPlacementPostModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [packageLPA, setPackageLPA] = useState('');
  const [placementStatistics, setPlacementStatistics] = useState('');
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&auto=format&fit=crop&q=80');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !message.trim()) {
      setError('Title, company name, and announcement message are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post<any>('/placements', {
        title,
        company,
        packageLPA,
        placementStatistics,
        message,
        mediaUrl,
      });

      if (res.success && res.post) {
        onSuccess(res.post);
        onClose();
      } else {
        setError(res.message || 'Failed to publish placement update');
      }
    } catch (err: any) {
      setError(err.message || 'Error publishing placement announcement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Publish Placement Announcement"
      subtitle="Share campus recruitments, offers, and recruitment statistics"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Announcement Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 18 Students Selected at Microsoft R&D"
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Recruiting Company *
            </label>
            <input
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Google, Microsoft, Amazon"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Package / Compensation (LPA / Annual)
            </label>
            <input
              type="text"
              value={packageLPA}
              onChange={(e) => setPackageLPA(e.target.value)}
              placeholder="e.g. $145,000 / 34 LPA"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Placement Statistics (Optional)
          </label>
          <input
            type="text"
            value={placementStatistics}
            onChange={(e) => setPlacementStatistics(e.target.value)}
            placeholder="e.g. 100% placement rate for 2026 CS Batch"
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Announcement Message & Description *
          </label>
          <textarea
            rows={4}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Congratulate students, outline hiring roles, and share recruitment drive highlights..."
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>

        <FileUpload
          label="Placement Photo / Banner"
          helperText="Upload recruitment drive photo or congratulatory banner"
          value={mediaUrl}
          onChange={(url) => setMediaUrl(url)}
        />

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> {submitting ? 'Publishing...' : 'Publish Update'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import { IPlacementPost } from '../../types';
import { AlertCircle, Check, Briefcase, X } from 'lucide-react';

interface AddPlacementPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (post: any) => void;
  placementToEdit?: IPlacementPost | null;
}

export const AddPlacementPostModal: React.FC<AddPlacementPostModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  placementToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [packageLPA, setPackageLPA] = useState('');
  const [placementStatistics, setPlacementStatistics] = useState('');
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (placementToEdit) {
      setTitle(placementToEdit.title || '');
      setCompany(placementToEdit.company || '');
      setPackageLPA(placementToEdit.packageLPA || '');
      setPlacementStatistics(placementToEdit.placementStatistics || '');
      setMessage(placementToEdit.message || '');
      setMediaUrl(placementToEdit.mediaUrl || '');
    } else {
      setTitle('');
      setCompany('');
      setPackageLPA('');
      setPlacementStatistics('');
      setMessage('');
      setMediaUrl('');
    }
    setError(null);
  }, [placementToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !message.trim()) {
      setError('Title, company name, and announcement message are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        company: company.trim(),
        packageLPA: packageLPA.trim(),
        placementStatistics: placementStatistics.trim(),
        message: message.trim(),
        mediaUrl: mediaUrl.trim(),
      };

      const res = placementToEdit
        ? await api.put<any>(`/placements/${placementToEdit._id}`, payload)
        : await api.post<any>('/placements', payload);

      if (res.success && res.post) {
        onSuccess(res.post);
        onClose();
      } else {
        setError(res.message || 'Failed to save placement update');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving placement announcement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={placementToEdit ? 'Edit Placement Announcement' : 'Publish Placement Announcement'}
      subtitle={
        placementToEdit
          ? 'Update hiring drive details, package, or media'
          : 'Share campus recruitments, offers, and recruitment statistics'
      }
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
            placeholder="Enter placement title"
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
              placeholder="Enter recruiting company"
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
              placeholder="Enter package compensation (e.g. 18 LPA)"
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
            placeholder="Enter placement statistics"
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
            placeholder="Enter announcement description and details..."
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>

        <div className="space-y-1.5">
          <FileUpload
            label="Placement Photo / Banner Media"
            helperText="Upload recruitment drive photo or banner (JPG, PNG, WEBP)"
            value={mediaUrl}
            onChange={(url) => setMediaUrl(url)}
            accept="image/jpeg,image/png,image/webp"
          />
          {mediaUrl && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setMediaUrl('')}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Remove Image
              </button>
            </div>
          )}
        </div>

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
            <Check className="w-4 h-4" />{' '}
            {submitting ? 'Saving...' : placementToEdit ? 'Save Changes' : 'Publish Announcement'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

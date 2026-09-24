import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import { AlertCircle, Check, Building } from 'lucide-react';

interface AddInfrastructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (post: any) => void;
}

export const AddInfrastructureModal: React.FC<AddInfrastructureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [facilityTitle, setFacilityTitle] = useState('');
  const [facilityType, setFacilityType] = useState('Laboratory');
  const [description, setDescription] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [mediaUrl, setMediaUrl] = useState('https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=80');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityTitle.trim() || !description.trim()) {
      setError('Facility title and description are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post<any>('/infrastructure', {
        facilityTitle,
        facilityType,
        description,
        googleMapsLink,
        mediaUrl,
      });

      if (res.success && res.post) {
        onSuccess(res.post);
        onClose();
      } else {
        setError(res.message || 'Failed to add facility');
      }
    } catch (err: any) {
      setError(err.message || 'Error adding infrastructure facility');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Campus Facility / Infrastructure"
      subtitle="Showcase labs, research facilities, sports arenas, and amenities"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Facility Title *
            </label>
            <input
              type="text"
              required
              value={facilityTitle}
              onChange={(e) => setFacilityTitle(e.target.value)}
              placeholder="e.g. AI & Robotics Research Lab"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Facility Type *
            </label>
            <select
              value={facilityType}
              onChange={(e) => setFacilityType(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            >
              <option value="Library">Library</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Hostel">Hostel</option>
              <option value="Sports">Sports</option>
              <option value="Campus">Campus</option>
              <option value="Classroom">Classroom</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Google Maps Link (Optional)
          </label>
          <input
            type="url"
            value={googleMapsLink}
            onChange={(e) => setGoogleMapsLink(e.target.value)}
            placeholder="https://maps.google.com/..."
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Description & Highlights *
          </label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Equipment, workstation capacity, hours of operation, and special features..."
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>

        <FileUpload
          label="Facility Photo / Media"
          helperText="Upload image of the campus facility"
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
            <Check className="w-4 h-4" /> {submitting ? 'Adding...' : 'Add Facility'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import { IInfrastructurePost } from '../../types';
import { AlertCircle, Check, Building, X } from 'lucide-react';

interface AddInfrastructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (post: any) => void;
  infraToEdit?: IInfrastructurePost | null;
}

export const AddInfrastructureModal: React.FC<AddInfrastructureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  infraToEdit,
}) => {
  const [facilityTitle, setFacilityTitle] = useState('');
  const [facilityType, setFacilityType] = useState('Laboratory');
  const [description, setDescription] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (infraToEdit) {
      setFacilityTitle(infraToEdit.facilityTitle || '');
      setFacilityType(infraToEdit.facilityType || 'Laboratory');
      setDescription(infraToEdit.description || '');
      setGoogleMapsLink(infraToEdit.googleMapsLink || '');
      setMediaUrl(infraToEdit.mediaUrl || '');
    } else {
      setFacilityTitle('');
      setFacilityType('Laboratory');
      setDescription('');
      setGoogleMapsLink('');
      setMediaUrl('');
    }
    setError(null);
  }, [infraToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityTitle.trim() || !description.trim()) {
      setError('Facility title and description are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        facilityTitle: facilityTitle.trim(),
        facilityType,
        description: description.trim(),
        googleMapsLink: googleMapsLink.trim(),
        mediaUrl: mediaUrl.trim(),
      };

      const res = infraToEdit
        ? await api.put<any>(`/infrastructure/${infraToEdit._id}`, payload)
        : await api.post<any>('/infrastructure', payload);

      if (res.success && res.post) {
        onSuccess(res.post);
        onClose();
      } else {
        setError(res.message || 'Failed to save facility');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving infrastructure facility');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={infraToEdit ? 'Edit Campus Facility' : 'Add Campus Facility / Infrastructure'}
      subtitle={
        infraToEdit
          ? 'Update facility information, description, or media'
          : 'Showcase labs, research facilities, sports arenas, and amenities'
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
              placeholder="Enter facility name"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Facility Type *
            </label>
            <select
              value={facilityType}
              onChange={(e) => setFacilityType(e.target.value as any)}
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
            placeholder="Enter Google Maps link"
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
            placeholder="Enter description and facility highlights..."
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>

        <div className="space-y-1.5">
          <FileUpload
            label="Facility Photo / Media"
            helperText="Upload image of the campus facility (JPG, PNG, WEBP)"
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
            {submitting ? 'Saving...' : infraToEdit ? 'Save Changes' : 'Add Facility'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

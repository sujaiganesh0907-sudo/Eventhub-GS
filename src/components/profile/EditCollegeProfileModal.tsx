import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ICollege } from '../../types';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import { AlertCircle, Check } from 'lucide-react';

interface EditCollegeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  college: ICollege;
  onSuccess: (updated: ICollege) => void;
}

export const EditCollegeProfileModal: React.FC<EditCollegeProfileModalProps> = ({
  isOpen,
  onClose,
  college,
  onSuccess,
}) => {
  const [name, setName] = useState(college.name || '');
  const [contactNumber, setContactNumber] = useState(college.contactNumber || '');
  const [location, setLocation] = useState(college.location || '');
  const [bio, setBio] = useState(college.bio || '');
  const [website, setWebsite] = useState(college.website || '');
  const [logo, setLogo] = useState(college.logo || '');
  const [coverPhoto, setCoverPhoto] = useState(college.coverPhoto || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await api.put<any>('/colleges/profile', {
        name,
        contactNumber,
        location,
        bio,
        website,
        logo,
        coverPhoto,
      });

      if (res.success && res.college) {
        onSuccess(res.college);
        onClose();
      } else {
        setError(res.message || 'Failed to update college profile');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating college profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Institution Profile"
      subtitle="Update university information, identity branding, and contacts"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <FileUpload
          label="Campus Cover / Banner Photo"
          helperText="Upload campus panorama / banner"
          value={coverPhoto}
          onChange={(url) => setCoverPhoto(url)}
        />

        <FileUpload
          label="Official College Logo"
          helperText="Upload square university emblem / logo"
          value={logo}
          onChange={(url) => setLogo(url)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Institution Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Contact Phone
            </label>
            <input
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Campus Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Official Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            About Institution
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
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
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

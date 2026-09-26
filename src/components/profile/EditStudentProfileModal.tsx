import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { IStudentProfile } from '../../types';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import { AlertCircle, Check, X } from 'lucide-react';

interface EditStudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: IStudentProfile;
  onSuccess: (updated: IStudentProfile) => void;
}

export const EditStudentProfileModal: React.FC<EditStudentProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState(profile.fullName || '');
  const [username, setUsername] = useState(profile.username ? profile.username.replace(/^@/, '') : '');
  const [collegeName, setCollegeName] = useState(profile.collegeName || '');
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || '');
  const [department, setDepartment] = useState(profile.department || '');
  const [yearOfStudy, setYearOfStudy] = useState(profile.yearOfStudy || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location || '');
  const [profileVisibility, setProfileVisibility] = useState<'Public' | 'Private'>(profile.profileVisibility || 'Public');
  const [messagePrivacy, setMessagePrivacy] = useState<'Everyone' | 'Following' | 'Connections' | 'Nobody'>(
    profile.messagePrivacy || 'Everyone'
  );
  const [profilePhoto, setProfilePhoto] = useState(profile.profilePhoto || '');
  const [coverPhoto, setCoverPhoto] = useState(profile.coverPhoto || '');
  const [skills, setSkills] = useState<string[]>(profile.skills || []);
  const [newSkill, setNewSkill] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (s: string) => {
    setSkills(skills.filter((item) => item !== s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const cleanUser = username.trim().toLowerCase().replace(/^@/, '');
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(cleanUser)) {
      setError('Username must be 3-30 characters long (letters, numbers, underscore, period).');
      setSaving(false);
      return;
    }

    try {
      const res = await api.put<any>('/students/profile', {
        fullName,
        username: cleanUser,
        collegeName,
        phoneNumber,
        department,
        yearOfStudy,
        bio,
        location,
        profileVisibility,
        messagePrivacy,
        profilePhoto,
        coverPhoto,
        skills,
      });

      if (res.success && (res.student || res.profile)) {
        onSuccess(res.student || res.profile);
        onClose();
      } else {
        setError(res.message || 'Failed to update profile');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating student profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Student Profile"
      subtitle="Update your personal details, unique @username, and privacy"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Cover Photo Upload & Reset to Default */}
        <div className="space-y-1.5">
          <FileUpload
            label="Profile Banner / Cover Photo"
            helperText="Upload landscape banner for your profile card"
            value={coverPhoto}
            onChange={(url) => setCoverPhoto(url)}
          />
          {coverPhoto ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCoverPhoto('')}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Remove Custom Cover (Return to Default)
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)] italic text-right">
              Default neutral banner is active
            </p>
          )}
        </div>

        {/* Avatar Upload & Reset to Default */}
        <div className="space-y-1.5">
          <FileUpload
            label="Profile Avatar Photo"
            helperText="Upload headshot / photo"
            value={profilePhoto}
            onChange={(url) => setProfilePhoto(url)}
          />
          {profilePhoto ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setProfilePhoto('')}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Remove Custom Photo (Return to Default)
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)] italic text-right">
              Default neutral silhouette avatar is active
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Unique Username *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--primary-color)]">
                @
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                placeholder="sureshm2006"
                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Unique student tag for search, profile URL, and mentions.
            </p>
          </div>
        </div>

        {/* Privacy & Messaging Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/60">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Profile Visibility
            </label>
            <select
              value={profileVisibility}
              onChange={(e) => setProfileVisibility(e.target.value as any)}
              className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            >
              <option value="Public">Public (Anyone can view profile)</option>
              <option value="Private">Private (Followers only)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Who Can Message Me
            </label>
            <select
              value={messagePrivacy}
              onChange={(e) => setMessagePrivacy(e.target.value as any)}
              className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            >
              <option value="Everyone">Everyone</option>
              <option value="Following">People I Follow</option>
              <option value="Connections">Mutual Connections</option>
              <option value="Nobody">Nobody</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            College / Institution *
          </label>
          <input
            type="text"
            required
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
            placeholder="e.g. Apex Institute of Technology"
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Year of Study
            </label>
            <select
              value={yearOfStudy}
              onChange={(e) => setYearOfStudy(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            >
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
              <option value="Postgraduate">Postgraduate</option>
              <option value="Alumni">Alumni</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Bio & Headline
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell fellow students and organizers about your passion, projects, and goals..."
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>

        {/* Skills Tag Management */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Skills & Competencies
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              placeholder="Add skill (e.g. Python, UI Design, Robotics) & press Enter"
              className="grow p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleAddSkill}
              className="px-3.5 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--primary-light)] text-[var(--primary-color)]"
              >
                {s}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(s)}
                  className="hover:text-red-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
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
            <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

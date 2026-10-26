import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { IStudentProfile } from '../../types';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import {
  AlertCircle,
  Check,
  X,
  FileText,
  Upload,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

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
  const [username, setUsername] = useState(
    profile.username ? profile.username.replace(/^@/, '') : ''
  );
  const [collegeName, setCollegeName] = useState(profile.collegeName || '');
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || '');
  const [department, setDepartment] = useState(profile.department || '');
  const [yearOfStudy, setYearOfStudy] = useState(profile.yearOfStudy || '3rd Year');
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location || '');
  const [profileVisibility, setProfileVisibility] = useState<string>(
    profile.profileVisibility || 'Public'
  );
  const [messagePrivacy, setMessagePrivacy] = useState<string>(
    profile.messagePrivacy || 'Everyone'
  );
  const [profilePhoto, setProfilePhoto] = useState(profile.profilePhoto || '');
  const [coverPhoto, setCoverPhoto] = useState(profile.coverPhoto || '');
  const [skills, setSkills] = useState<string[]>(profile.skills || []);
  const [newSkill, setNewSkill] = useState('');

  // Resume state
  const [resumeFileUrl, setResumeFileUrl] = useState(profile.resumeFileUrl || '');
  const [resumeFileType, setResumeFileType] = useState(profile.resumeFileType || '');
  const [resumeOriginalName, setResumeOriginalName] = useState(profile.resumeOriginalName || '');
  const [resumeUploadedAt, setResumeUploadedAt] = useState(profile.resumeUploadedAt || '');
  const [resumeCoverUrl, setResumeCoverUrl] = useState(profile.resumeCoverUrl || '');

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false, available: true });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced username availability checking
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
      setUsernameStatus({ checking: false, available: false, message: 'Username cannot be empty.' });
      return;
    }
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(clean)) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: 'Must be 3-30 letters, numbers, _, or .',
      });
      return;
    }

    setUsernameStatus({ checking: true });
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<any>('/students/username/check', { username: clean });
        if (res.success) {
          setUsernameStatus({
            checking: false,
            available: res.available,
            message: res.message,
          });
        } else {
          setUsernameStatus({
            checking: false,
            available: false,
            message: res.message || 'Unable to verify username.',
          });
        }
      } catch (err: any) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: err.message || 'Error checking username availability.',
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (s: string) => {
    setSkills(skills.filter((item) => item !== s));
  };

  const handleResumeFileSelect = (info: {
    fileUrl: string;
    fileType: string;
    originalName: string;
    size: number;
  }) => {
    if (info.fileUrl) {
      setResumeFileUrl(info.fileUrl);
      setResumeFileType(info.fileType);
      setResumeOriginalName(info.originalName);
      setResumeUploadedAt(new Date().toISOString());
    } else {
      setResumeFileUrl('');
      setResumeFileType('');
      setResumeOriginalName('');
      setResumeUploadedAt('');
      setResumeCoverUrl('');
    }
  };

  const handleRemoveResume = () => {
    setResumeFileUrl('');
    setResumeFileType('');
    setResumeOriginalName('');
    setResumeUploadedAt('');
    setResumeCoverUrl('');
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

    if (usernameStatus.available === false && !usernameStatus.checking) {
      setError(usernameStatus.message || 'The specified username is not available.');
      setSaving(false);
      return;
    }

    try {
      const res = await api.put<any>('/students/profile', {
        fullName: fullName.trim(),
        username: cleanUser,
        collegeName: collegeName.trim(),
        phoneNumber: phoneNumber.trim(),
        department: department.trim(),
        yearOfStudy,
        bio: bio.trim(),
        location: location.trim(),
        profileVisibility,
        messagePrivacy,
        profilePhoto,
        coverPhoto,
        skills,
        resumeFileUrl,
        resumeFileType,
        resumeOriginalName,
        resumeUploadedAt: resumeFileUrl ? (resumeUploadedAt || new Date().toISOString()) : undefined,
        resumeCoverUrl,
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

  const isDocType =
    resumeFileType === 'pdf' ||
    resumeFileType === 'doc' ||
    resumeFileType === 'docx' ||
    resumeFileUrl.toLowerCase().endsWith('.pdf') ||
    resumeFileUrl.toLowerCase().endsWith('.docx') ||
    resumeFileUrl.toLowerCase().endsWith('.doc');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Student Profile"
      subtitle="Update your personal details, unique @username, media, and resume"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. COVER PHOTO */}
        <div className="space-y-1.5 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/50">
          <FileUpload
            label="Cover Photo"
            helperText="Upload landscape banner for your profile card (JPG, PNG, WEBP)"
            value={coverPhoto}
            onChange={(url) => setCoverPhoto(url)}
          />
          {coverPhoto ? (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setCoverPhoto('')}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Remove Custom Cover
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)] italic text-right">
              Neutral collegiate cover is currently active
            </p>
          )}
        </div>

        {/* 2. PROFILE PHOTO */}
        <div className="space-y-1.5 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/50">
          <FileUpload
            label="Profile Photo (Avatar)"
            helperText="Upload your headshot or portrait photo (JPG, PNG, WEBP)"
            value={profilePhoto}
            onChange={(url) => setProfilePhoto(url)}
          />
          {profilePhoto ? (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setProfilePhoto('')}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Remove Custom Photo
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)] italic text-right">
              Neutral avatar initials placeholder is currently active
            </p>
          )}
        </div>

        {/* 3. BASIC IDENTITY: Full Name & Username */}
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
              placeholder="Enter your full name"
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
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))
                }
                placeholder="Enter username"
                className="w-full pl-7 pr-8 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-hidden"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus.checking ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-color)]" />
                ) : usernameStatus.available ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </span>
            </div>
            {usernameStatus.message && (
              <p
                className={`text-[11px] mt-1 font-medium ${
                  usernameStatus.checking
                    ? 'text-[var(--text-muted)]'
                    : usernameStatus.available
                    ? 'text-emerald-600'
                    : 'text-red-500'
                }`}
              >
                {usernameStatus.checking ? 'Checking availability...' : usernameStatus.message}
              </p>
            )}
          </div>
        </div>

        {/* 4. RESUME SECTION */}
        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/40 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[var(--primary-color)]" />
                Student Resume
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Upload your latest resume document (PDF, DOC, DOCX, Image)
              </p>
            </div>
            {resumeFileUrl && (
              <button
                type="button"
                onClick={handleRemoveResume}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Resume
              </button>
            )}
          </div>

          <FileUpload
            label="Resume Document File"
            helperText="Supports PDF, DOC, DOCX, JPG, PNG (max 15MB)"
            value={resumeFileUrl}
            onChange={(url) => setResumeFileUrl(url)}
            onFileInfoChange={handleResumeFileSelect}
            accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,image/jpeg,image/png,image/webp,.doc,.docx"
          />

          {resumeFileUrl && (
            <div className="pt-2 border-t border-[var(--border-color)]/70 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)] truncate max-w-xs">
                  {resumeOriginalName || 'Resume Document'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[var(--primary-light)] text-[var(--primary-color)] font-bold text-[10px] uppercase">
                  {resumeFileType || 'PDF'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 5. ACADEMIC DETAILS: College, Dept, Year, Phone, Location */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            College / Institution *
          </label>
          <input
            type="text"
            required
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
            placeholder="Enter college or university name"
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
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
              placeholder="Enter department"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter phone number"
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
              placeholder="Enter location"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>
        </div>

        {/* 6. BIO */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Bio
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Enter your bio"
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>

        {/* 7. SKILLS */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Skills
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
              placeholder="Enter a skill and press Enter"
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

        {/* 8. PRIVACY CONTROLS */}
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
              <option value="Everyone">Everyone</option>
              <option value="EVENTHUB users">EVENTHUB users only</option>
              <option value="Connections only">Connections only</option>
              <option value="Private">Private</option>
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

        {/* MODAL FOOTER */}
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
            disabled={saving || (usernameStatus.available === false && !usernameStatus.checking)}
            className="px-6 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

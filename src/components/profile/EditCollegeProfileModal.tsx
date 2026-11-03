import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ICollege } from '../../types';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import { AlertCircle, Check, Building2, MapPin, Mail, Phone, Globe, GraduationCap, Award, Share2 } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'academics' | 'media'>('general');

  // General & Identity
  const [name, setName] = useState(college.name || '');
  const [institutionType, setInstitutionType] = useState(college.institutionType || 'Autonomous Engineering College');
  const [establishedYear, setEstablishedYear] = useState<string | number>(college.establishedYear || '');
  const [bio, setBio] = useState(college.bio || '');

  // Contact & Location
  const [contactNumber, setContactNumber] = useState(college.contactNumber || '');
  const [officialEmail, setOfficialEmail] = useState(college.officialEmail || '');
  const [website, setWebsite] = useState(college.website || '');
  const [location, setLocation] = useState(college.location || '');
  const [address, setAddress] = useState(college.address || '');
  const [city, setCity] = useState(college.city || '');
  const [state, setState] = useState(college.state || '');

  // Academics & Facilities
  const [departments, setDepartments] = useState(
    Array.isArray(college.departments) ? college.departments.join(', ') : ''
  );
  const [facilities, setFacilities] = useState(
    Array.isArray(college.facilities) ? college.facilities.join(', ') : ''
  );
  const [placementHighlights, setPlacementHighlights] = useState(college.placementHighlights || '');

  // Media & Social
  const [logo, setLogo] = useState(college.logo || '');
  const [coverPhoto, setCoverPhoto] = useState(college.coverPhoto || '');
  const [linkedin, setLinkedin] = useState(college.socialLinks?.linkedin || '');
  const [twitter, setTwitter] = useState(college.socialLinks?.twitter || '');
  const [instagram, setInstagram] = useState(college.socialLinks?.instagram || '');
  const [youtube, setYoutube] = useState(college.socialLinks?.youtube || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await api.put<any>('/colleges/profile', {
        name,
        institutionType,
        establishedYear: establishedYear ? Number(establishedYear) || establishedYear : undefined,
        bio,
        contactNumber,
        officialEmail,
        website,
        location,
        address,
        city,
        state,
        departments: departments.split(',').map((s) => s.trim()).filter(Boolean),
        facilities: facilities.split(',').map((s) => s.trim()).filter(Boolean),
        placementHighlights,
        logo,
        coverPhoto,
        socialLinks: {
          website,
          linkedin,
          twitter,
          instagram,
          youtube,
        },
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
      subtitle="Update official collegiate information, academic specs, and campus branding"
      maxWidth="xl"
    >
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border-color)] pb-2 mb-4 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'general'
              ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" /> Identity & About
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'contact'
              ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" /> Contact & Location
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('academics')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'academics'
              ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" /> Academics & Facilities
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'media'
              ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" /> Branding & Social
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: GENERAL & IDENTITY */}
        {activeTab === 'general' && (
          <div className="space-y-3.5 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Institution Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Institute of Technology"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Institution Type
                </label>
                <input
                  type="text"
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value)}
                  placeholder="e.g. Autonomous University, Engineering College"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Established Year
                </label>
                <input
                  type="number"
                  value={establishedYear}
                  onChange={(e) => setEstablishedYear(e.target.value)}
                  placeholder="e.g. 1998"
                  min="1800"
                  max="2099"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Campus Location Tag
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bangalore, Karnataka"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                About Institution & Overview (Bio)
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Comprehensive description of accreditation, campus culture, vision, and student accomplishments..."
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {/* TAB 2: CONTACT & LOCATION */}
        {activeTab === 'contact' && (
          <div className="space-y-3.5 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Official Contact Phone
                </label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  placeholder="events@college.edu.in"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Official Website URL
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.college.edu.in"
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Campus Street Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Tech Corridor Road, Knowledge City"
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bangalore"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  State / Province
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACADEMICS & FACILITIES */}
        {activeTab === 'academics' && (
          <div className="space-y-3.5 animate-in fade-in">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Departments & Courses Offered (comma-separated)
              </label>
              <input
                type="text"
                value={departments}
                onChange={(e) => setDepartments(e.target.value)}
                placeholder="Computer Science, AI & ML, Electronics, Mechanical, Civil, Management"
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Separate academic branches with commas.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Campus Facilities & Amenities (comma-separated)
              </label>
              <input
                type="text"
                value={facilities}
                onChange={(e) => setFacilities(e.target.value)}
                placeholder="Innovation Labs, 2000-seat Auditorium, High-Performance Compute Cluster, Sports Complex, Robotics Arena"
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">List key event venues, labs, and amenities.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Placement & Career Highlights
              </label>
              <textarea
                rows={3}
                value={placementHighlights}
                onChange={(e) => setPlacementHighlights(e.target.value)}
                placeholder="e.g. 96% placement record in 2025. Highest package: 44 LPA. 120+ top-tier recruiters including Google, Microsoft, and Amazon."
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {/* TAB 4: BRANDING & MEDIA */}
        {activeTab === 'media' && (
          <div className="space-y-3.5 animate-in fade-in">
            <div className="space-y-1.5">
              <FileUpload
                label="Campus Cover / Banner Photo"
                helperText="Upload wide panoramic campus banner"
                value={coverPhoto}
                onChange={(url) => setCoverPhoto(url)}
              />
              {coverPhoto && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCoverPhoto('')}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Remove Custom Cover
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <FileUpload
                label="Official Institution Emblem / Logo"
                helperText="Upload square university crest / logo"
                value={logo}
                onChange={(url) => setLogo(url)}
              />
              {logo && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setLogo('')}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Remove Custom Logo
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[var(--border-color)] space-y-2">
              <p className="text-xs font-bold text-[var(--text-primary)]">Social Profiles</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="LinkedIn URL"
                  className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
                />
                <input
                  type="url"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="X / Twitter URL"
                  className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
                />
                <input
                  type="url"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="Instagram URL"
                  className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
                />
                <input
                  type="url"
                  value={youtube}
                  onChange={(e) => setYoutube(e.target.value)}
                  placeholder="YouTube Channel URL"
                  className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-[var(--border-color)]">
          <span className="text-[11px] text-[var(--text-muted)]">
            Changes persist to live institution profile.
          </span>
          <div className="flex items-center gap-2">
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
        </div>
      </form>
    </Modal>
  );
};

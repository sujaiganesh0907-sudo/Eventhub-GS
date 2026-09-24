import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IStudentProfile, ICertificate, IEventRegistration } from '../types';
import { EditStudentProfileModal } from '../components/profile/EditStudentProfileModal';
import { AddCertificateModal } from '../components/certificate/AddCertificateModal';
import { CertificateModal } from '../components/certificate/CertificateModal';
import { TicketModal } from '../components/registration/TicketModal';
import {
  GraduationCap,
  Building2,
  MapPin,
  Calendar,
  Award,
  Edit,
  Plus,
  Ticket,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { user, studentProfile } = useAuth();

  const [profile, setProfile] = useState<IStudentProfile | null>(studentProfile || null);
  const [certificates, setCertificates] = useState<ICertificate[]>([]);
  const [registrations, setRegistrations] = useState<IEventRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddCertModal, setShowAddCertModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<ICertificate | null>(null);
  const [selectedReg, setSelectedReg] = useState<IEventRegistration | null>(null);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [profRes, certRes, regRes] = await Promise.all([
        api.get<any>('/students/me'),
        api.get<any>('/certificates/my-certificates'),
        api.get<any>('/registrations/student'),
      ]);

      if (profRes.success && profRes.student) setProfile(profRes.student);
      if (certRes.success) setCertificates(certRes.certificates || []);
      if (regRes.success) setRegistrations(regRes.registrations || []);
    } catch (err) {
      console.error('Failed to load student profile data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleDeleteCertificate = async (id: string) => {
    if (!confirm('Are you sure you want to remove this certificate?')) return;
    try {
      const res = await api.delete<any>(`/certificates/student/${id}`);
      if (res.success) {
        setCertificates((prev) => prev.filter((c) => c._id !== id));
        setSelectedCert(null);
      }
    } catch (err) {
      alert('Failed to delete certificate');
    }
  };

  if (loading && !profile) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-color)]" />
      </div>
    );
  }

  const attendedEvents = registrations.filter((r) => r.attended);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* SECTION 32: Digital Student ID Banner Card */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden shadow-xs">
        {/* Cover Photo */}
        <div className="h-44 sm:h-56 w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 relative">
          {profile?.coverPhoto && (
            <img
              src={profile.coverPhoto}
              alt="Profile Cover"
              className="w-full h-full object-cover"
            />
          )}
          <button
            onClick={() => setShowEditModal(true)}
            className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" /> Edit Profile
          </button>
        </div>

        {/* Profile Card Info */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
            <div className="flex items-end gap-4">
              <img
                src={
                  profile?.profilePhoto ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
                }
                alt={profile?.fullName || 'Student'}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-[var(--surface)] bg-[var(--surface)] shadow-lg"
              />
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
                    {profile?.fullName || user?.fullName}
                  </h1>
                  <span title="Verified Collegiate ID"><ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" /></span>
                </div>
                <p className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                  {profile?.collegeName || 'Apex Institute of Technology'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Student portfolio link copied to clipboard!');
                }}
                className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button
                onClick={() => setShowAddCertModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add Certificate
              </button>
            </div>
          </div>

          {/* Academic Metadata row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-[var(--border-color)] text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Department</span>
              <span className="font-bold text-[var(--text-primary)]">{profile?.department || 'Computer Science'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Year of Study</span>
              <span className="font-bold text-[var(--text-primary)]">{profile?.yearOfStudy || '3rd Year'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Verified Awards</span>
              <span className="font-bold text-amber-600">{certificates.length} Credentials</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Attended Events</span>
              <span className="font-bold text-emerald-600">{attendedEvents.length} Events</span>
            </div>
          </div>

          {/* Bio */}
          {profile?.bio && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] pt-4 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Skills tags */}
          {profile?.skills && profile.skills.length > 0 && (
            <div className="pt-4">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1.5">
                Technical Competencies & Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--surface-subtle)] border border-[var(--border-color)] text-[var(--text-primary)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 33: Verified Credentials & Awards Portfolio */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
              Verified Collegiate Awards & Credentials ({certificates.length})
            </h2>
          </div>

          <button
            onClick={() => setShowAddCertModal(true)}
            className="text-xs font-bold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Credential
          </button>
        </div>

        {certificates.length === 0 ? (
          <div className="p-12 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-3">
            <Award className="w-10 h-10 mx-auto text-[var(--text-muted)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">No verified certificates yet</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Certificates issued by host colleges upon event attendance and awards will automatically appear here.
            </p>
            <button
              onClick={() => setShowAddCertModal(true)}
              className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold cursor-pointer"
            >
              Upload Certificate
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map((cert) => (
              <div
                key={cert._id}
                onClick={() => setSelectedCert(cert)}
                className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary-color)] transition-all cursor-pointer shadow-xs space-y-3 group"
              >
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-[var(--border-color)] relative">
                  <img
                    src={cert.fileUrl}
                    alt={cert.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                    onError={(e) => {
                      (e.target as any).src =
                        'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80';
                    }}
                  />
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-bold text-amber-400">
                    {cert.achievementType}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                    {cert.title}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {cert.issuingOrganization} · {cert.issueDate}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && profile && (
        <EditStudentProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          profile={profile}
          onSuccess={(updated) => setProfile(updated)}
        />
      )}

      {/* Add Certificate Modal */}
      {showAddCertModal && (
        <AddCertificateModal
          isOpen={showAddCertModal}
          onClose={() => setShowAddCertModal(false)}
          onSuccess={(newCert) => setCertificates([newCert, ...certificates])}
        />
      )}

      {/* View Certificate Pass Modal */}
      {selectedCert && (
        <CertificateModal
          isOpen={!!selectedCert}
          onClose={() => setSelectedCert(null)}
          certificate={selectedCert}
          onDelete={handleDeleteCertificate}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import { IEvent, IEventRegistration } from '../../types';
import { AlertCircle, Award, CheckCircle2, Loader2, Send } from 'lucide-react';
import confetti from 'canvas-confetti';

interface IssueCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: IEvent;
  onCertificateIssued?: () => void;
}

export const IssueCertificateModal: React.FC<IssueCertificateModalProps> = ({
  isOpen,
  onClose,
  event,
  onCertificateIssued,
}) => {
  const [registrations, setRegistrations] = useState<IEventRegistration[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('');
  const [title, setTitle] = useState(`Certificate of Excellence: ${event.title}`);
  const [achievementType, setAchievementType] = useState('Participation');
  const [fileUrl, setFileUrl] = useState('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingList(true);
      api.get<any>(`/attendance/event/${event._id}`)
        .then((res) => {
          if (res.success) {
            setRegistrations(res.registrations || []);
            if (res.registrations && res.registrations.length > 0) {
              setSelectedStudentId(res.registrations[0].studentId);
              setSelectedRegistrationId(res.registrations[0]._id);
            }
          }
        })
        .catch(console.error)
        .finally(() => setLoadingList(false));
    }
  }, [isOpen, event._id]);

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const regId = e.target.value;
    setSelectedRegistrationId(regId);
    const found = registrations.find((r) => r._id === regId || r.registrationId === regId);
    if (found) {
      setSelectedStudentId(found.studentId);
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !title.trim() || !fileUrl) {
      setError('Please select a student and provide a certificate file.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.post<any>('/certificates/issue', {
        eventId: event._id,
        registrationId: selectedRegistrationId,
        studentId: selectedStudentId,
        title,
        achievementType,
        fileUrl,
      });

      if (res.success) {
        confetti({ particleCount: 60, spread: 60 });
        setSuccess('Official certificate issued successfully and delivered to student profile.');
        onCertificateIssued?.();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(res.message || 'Failed to issue certificate');
      }
    } catch (err: any) {
      setError(err.message || 'Error issuing certificate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Issue Official Verified Certificate"
      subtitle={`${event.title} · Attended Participants`}
      maxWidth="lg"
    >
      <form onSubmit={handleIssue} className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Select Participant *
          </label>
          {loadingList ? (
            <div className="p-2 text-xs text-[var(--text-muted)]">Loading participants...</div>
          ) : registrations.length === 0 ? (
            <div className="p-3 rounded-xl bg-[var(--surface-subtle)] text-xs text-[var(--text-secondary)]">
              No registered participants found for this event yet.
            </div>
          ) : (
            <select
              value={selectedRegistrationId}
              onChange={handleStudentSelect}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] font-medium"
            >
              {registrations.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.studentName} ({r.studentCollege}) — {r.attended ? 'Attended' : 'Registered'}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Certificate Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Achievement Type *
          </label>
          <select
            value={achievementType}
            onChange={(e) => setAchievementType(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
          >
            <option value="Winner">Winner (1st Place)</option>
            <option value="Runner-up">Runner-up (2nd / 3rd Place)</option>
            <option value="Participation">Certificate of Participation</option>
            <option value="Excellence">Merit & Excellence Award</option>
            <option value="Appreciation">Appreciation</option>
            <option value="Completion">Course / Workshop Completion</option>
          </select>
        </div>

        <FileUpload
          label="Certificate File / Template *"
          helperText="Upload image or PDF of the issued certificate"
          value={fileUrl}
          onChange={(url) => setFileUrl(url)}
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
            disabled={submitting || registrations.length === 0}
            className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Issuing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Issue & Deliver to Student
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

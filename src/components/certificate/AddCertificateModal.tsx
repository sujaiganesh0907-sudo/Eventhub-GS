import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import { AlertCircle, Award, Check } from 'lucide-react';

interface AddCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cert: any) => void;
  certificateToEdit?: any | null;
}

export const AddCertificateModal: React.FC<AddCertificateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  certificateToEdit,
}) => {
  const [title, setTitle] = useState('');
  const [issuingOrganization, setIssuingOrganization] = useState('');
  const [achievementType, setAchievementType] = useState('Winner');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventName, setEventName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [credentialUrl, setCredentialUrl] = useState('');
  const [fileUrl, setFileUrl] = useState(
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80'
  );
  const [visibility, setVisibility] = useState<'Public' | 'Connections Only' | 'Private'>('Public');
  const [isDraft, setIsDraft] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (certificateToEdit) {
      setTitle(certificateToEdit.title || '');
      setIssuingOrganization(certificateToEdit.issuingOrganization || '');
      setAchievementType(certificateToEdit.achievementType || 'Winner');
      setIssueDate(certificateToEdit.issueDate || new Date().toISOString().split('T')[0]);
      setEventName(certificateToEdit.eventName || '');
      setLocation(certificateToEdit.location || '');
      setDescription(certificateToEdit.description || '');
      setCredentialUrl(certificateToEdit.credentialUrl || '');
      setFileUrl(certificateToEdit.fileUrl || '');
      setVisibility(certificateToEdit.visibility || 'Public');
      setIsDraft(Boolean(certificateToEdit.isDraft));
    } else {
      setTitle('');
      setIssuingOrganization('');
      setAchievementType('Winner');
      setIssueDate(new Date().toISOString().split('T')[0]);
      setEventName('');
      setLocation('');
      setDescription('');
      setCredentialUrl('');
      setFileUrl(
        'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80'
      );
      setVisibility('Public');
      setIsDraft(false);
    }
  }, [certificateToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !issuingOrganization.trim() || !fileUrl) {
      setError('Title, Issuing Organization, and Certificate File are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        title,
        issuingOrganization,
        achievementType,
        issueDate,
        eventName,
        location,
        description,
        credentialUrl,
        fileUrl,
        visibility,
        isDraft,
      };

      const res = certificateToEdit
        ? await api.patch<any>(`/certificates/${certificateToEdit._id}`, payload)
        : await api.post<any>('/certificates/student', payload);

      if (res.success && res.certificate) {
        onSuccess(res.certificate);
        onClose();
      } else {
        setError(res.message || 'Failed to save certificate');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving certificate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={certificateToEdit ? 'Edit Award & Certificate' : 'Add Award & Certificate'}
      subtitle={certificateToEdit ? 'Update details of your existing credential' : 'Showcase verifiable collegiate achievements on your Student ID'}
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
            Certificate Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 1st Place - Autonomous Robotics Sprint"
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Issuing Organization / College *
            </label>
            <input
              type="text"
              required
              value={issuingOrganization}
              onChange={(e) => setIssuingOrganization(e.target.value)}
              placeholder="e.g. Apex Institute of Technology"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Achievement Type *
            </label>
            <select
              value={achievementType}
              onChange={(e) => setAchievementType(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            >
              <option value="Winner">Winner (1st Place)</option>
              <option value="Runner-up">Runner-up (2nd/3rd)</option>
              <option value="Participation">Participation</option>
              <option value="Excellence">Excellence Award</option>
              <option value="Appreciation">Appreciation</option>
              <option value="Completion">Course / Workshop Completion</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Issue Date
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Associated Event Name
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. Apex Hack 2026"
              className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
            />
          </div>
        </div>

        {/* Real File Upload component */}
        <FileUpload
          label="Certificate File / Document *"
          helperText="Upload image or PDF of your certificate"
          value={fileUrl}
          onChange={(url) => setFileUrl(url)}
        />

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Visibility on Profile
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Public', 'Connections Only', 'Private'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all cursor-pointer ${
                  visibility === v
                    ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-[var(--primary-text)]'
                    : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={isDraft}
              onChange={(e) => setIsDraft(e.target.checked)}
              className="w-4 h-4 rounded-sm accent-[var(--primary-color)]"
            />
            <span>Save as private draft</span>
          </label>

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
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {loading ? 'Saving...' : 'Add Certificate'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

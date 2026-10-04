import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import { AlertCircle, Award, Check, X, FileText, Image as ImageIcon } from 'lucide-react';

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
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState('image');
  const [originalFileName, setOriginalFileName] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [visibility, setVisibility] = useState<'Public' | 'Connections Only' | 'Private'>('Public');
  const [isDraft, setIsDraft] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      setFileType(certificateToEdit.fileType || 'image');
      setOriginalFileName(certificateToEdit.originalFileName || '');
      setCoverUrl(certificateToEdit.coverUrl || '');
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
      setFileUrl('');
      setFileType('image');
      setOriginalFileName('');
      setCoverUrl('');
      setVisibility('Public');
      setIsDraft(false);
    }
    setError(null);
  }, [certificateToEdit, isOpen]);

  const handleCertificateUpload = (info: {
    fileUrl: string;
    fileType: string;
    originalName: string;
    size: number;
  }) => {
    if (info.fileUrl) {
      setFileUrl(info.fileUrl);
      setFileType(info.fileType);
      setOriginalFileName(info.originalName);
    } else {
      setFileUrl('');
      setFileType('image');
      setOriginalFileName('');
      setCoverUrl('');
    }
  };

  const isDocType =
    fileType === 'pdf' ||
    fileType === 'doc' ||
    fileType === 'docx' ||
    fileUrl.toLowerCase().endsWith('.pdf') ||
    fileUrl.toLowerCase().endsWith('.doc') ||
    fileUrl.toLowerCase().endsWith('.docx');

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
        title: title.trim(),
        issuingOrganization: issuingOrganization.trim(),
        achievementType,
        issueDate,
        eventName: eventName.trim(),
        location: location.trim(),
        description: description.trim(),
        credentialUrl: credentialUrl.trim(),
        fileUrl,
        fileType,
        originalFileName,
        coverUrl: coverUrl || undefined,
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
      subtitle={
        certificateToEdit
          ? 'Update details of your self-uploaded credential'
          : 'Showcase verifiable collegiate achievements on your Student ID'
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
            Certificate Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter certificate title"
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
              placeholder="Enter issuing organization or college"
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
              <option value="Runner-up">Runner-up (2nd / 3rd Place)</option>
              <option value="Participation">Participation</option>
              <option value="Excellence">Excellence</option>
              <option value="Appreciation">Appreciation</option>
              <option value="Completion">Course / Workshop Completion</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Collegiate Event Name
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Enter collegiate event name"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Issue Date *
            </label>
            <input
              type="date"
              required
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Campus / Venue Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter campus location or venue"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              External Credential URL (Optional)
            </label>
            <input
              type="url"
              value={credentialUrl}
              onChange={(e) => setCredentialUrl(e.target.value)}
              placeholder="Enter external credential URL or registry link"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Description & Highlights
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter certificate description or citation details..."
            className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
          />
        </div>

        {/* Certificate File Upload */}
        <div className="space-y-1.5 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/50">
          <FileUpload
            label="Certificate Document File (Image, PDF, DOC, DOCX) *"
            helperText="Upload official diploma, award letter, or digital credential (max 15MB)"
            value={fileUrl}
            onChange={(url) => setFileUrl(url)}
            onFileInfoChange={handleCertificateUpload}
            accept="image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,.doc,.docx"
          />

          {fileUrl && (
            <div className="pt-2 border-t border-[var(--border-color)]/70 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)] truncate max-w-xs">
                  {originalFileName || 'Certificate Document'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 font-bold text-[10px] uppercase">
                  {fileType}
                </span>
              </div>

              {/* Cover Image for PDF / DOC / DOCX certificates */}
              {isDocType && (
                <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]/50">
                  <FileUpload
                    label="Certificate Cover Image (Optional)"
                    helperText="Upload custom card preview image for PDF/DOC/DOCX certificates"
                    value={coverUrl}
                    onChange={(url) => setCoverUrl(url)}
                    accept="image/jpeg,image/png,image/webp"
                  />
                  {coverUrl && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setCoverUrl('')}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Remove Cover Image
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Visibility */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Credential Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
            >
              <option value="Public">Public (Visible to everyone)</option>
              <option value="Connections Only">Connections Only</option>
              <option value="Private">Private (Only me)</option>
            </select>
          </div>

          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={isDraft}
                onChange={(e) => setIsDraft(e.target.checked)}
                className="w-4 h-4 rounded-sm text-[var(--primary-color)] focus:ring-0 cursor-pointer"
              />
              Save as Draft (Don't publish yet)
            </label>
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
            disabled={loading}
            className="px-6 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />{' '}
            {loading ? 'Saving...' : certificateToEdit ? 'Save Changes' : 'Publish Credential'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

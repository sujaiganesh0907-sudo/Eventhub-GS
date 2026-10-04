import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import {
  FileText,
  Download,
  ExternalLink,
  Shield,
  Clock,
  Edit,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resume: {
    fileUrl: string;
    fileType?: string;
    originalName?: string;
    uploadedAt?: string;
    coverUrl?: string;
  };
  studentName: string;
  isOwner?: boolean;
  privacySetting?: string;
  onCoverUpdated?: (newCoverUrl: string) => void;
  onOpenEditModal?: () => void;
}

export const ResumeModal: React.FC<ResumeModalProps> = ({
  isOpen,
  onClose,
  resume,
  studentName,
  isOwner = false,
  privacySetting = 'Colleges only',
  onCoverUpdated,
  onOpenEditModal,
}) => {
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [coverUrl, setCoverUrl] = useState(resume.coverUrl || '');
  const [savingCover, setSavingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  if (!resume || !resume.fileUrl) return null;

  const fileUrl = resume.fileUrl;
  const lowerUrl = fileUrl.toLowerCase();
  const fileType =
    (resume.fileType || '').toLowerCase() ||
    (lowerUrl.endsWith('.pdf')
      ? 'pdf'
      : lowerUrl.endsWith('.docx')
      ? 'docx'
      : lowerUrl.endsWith('.doc')
      ? 'doc'
      : 'image');

  const isImage =
    fileType === 'image' ||
    lowerUrl.endsWith('.png') ||
    lowerUrl.endsWith('.jpg') ||
    lowerUrl.endsWith('.jpeg') ||
    lowerUrl.endsWith('.webp');
  const isPdf = fileType === 'pdf' || lowerUrl.endsWith('.pdf');
  const isDoc = fileType === 'doc' || fileType === 'docx' || lowerUrl.endsWith('.doc') || lowerUrl.endsWith('.docx');

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = fileUrl;
    const ext = isPdf ? '.pdf' : isDoc ? (fileType === 'doc' ? '.doc' : '.docx') : '';
    a.download = resume.originalName || `${studentName.replace(/\s+/g, '_')}_Resume${ext}`;
    a.target = '_blank';
    a.click();
  };

  const handleSaveCover = async () => {
    try {
      setSavingCover(true);
      setCoverError(null);
      const res = await api.put<any>('/students/profile', {
        resumeCoverUrl: coverUrl,
      });
      if (res.success) {
        if (onCoverUpdated) onCoverUpdated(coverUrl);
        setShowCoverEditor(false);
      } else {
        setCoverError(res.message || 'Failed to update cover');
      }
    } catch (err: any) {
      setCoverError(err.message || 'Failed to update resume cover');
    } finally {
      setSavingCover(false);
    }
  };

  const handleRemoveCover = async () => {
    try {
      setSavingCover(true);
      setCoverError(null);
      const res = await api.put<any>('/students/profile', {
        resumeCoverUrl: '',
      });
      if (res.success) {
        setCoverUrl('');
        if (onCoverUpdated) onCoverUpdated('');
        setShowCoverEditor(false);
      } else {
        setCoverError(res.message || 'Failed to remove cover');
      }
    } catch (err: any) {
      setCoverError(err.message || 'Failed to remove resume cover');
    } finally {
      setSavingCover(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${studentName}'s Resume`}
      subtitle={`Verified Student Resume · Visibility: ${privacySetting}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 py-2">
        {/* Cover Image Editor Sub-Panel (Owner only) */}
        {isOwner && showCoverEditor && (
          <div className="p-4 rounded-xl border border-[var(--primary-color)]/30 bg-[var(--primary-light)]/40 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">
                Resume Cover Image
              </h4>
              <button
                type="button"
                onClick={() => setShowCoverEditor(false)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {coverError && (
              <p className="text-xs text-red-600 font-medium">{coverError}</p>
            )}

            <FileUpload
              label="Select Cover Image"
              helperText="Upload custom thumbnail image for your resume card (JPG, PNG, WEBP)"
              value={coverUrl}
              onChange={(url) => setCoverUrl(url)}
              accept="image/jpeg,image/png,image/webp"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              {resume.coverUrl && (
                <button
                  type="button"
                  disabled={savingCover}
                  onClick={handleRemoveCover}
                  className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-600 text-xs font-semibold hover:bg-red-500/10 cursor-pointer"
                >
                  Remove Cover
                </button>
              )}
              <button
                type="button"
                disabled={savingCover}
                onClick={handleSaveCover}
                className="px-4 py-1.5 rounded-lg bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold hover:bg-[var(--primary-hover)] cursor-pointer"
              >
                {savingCover ? 'Saving...' : 'Save Cover Image'}
              </button>
            </div>
          </div>
        )}

        {/* Resume Preview Body */}
        {isImage ? (
          <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden bg-slate-900 flex items-center justify-center max-h-[70vh]">
            <img
              src={fileUrl}
              alt="Resume Preview"
              className="max-h-[70vh] w-auto object-contain"
            />
          </div>
        ) : isPdf ? (
          <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden bg-[var(--surface-subtle)]">
            {/* Embedded PDF iframe preview where browser supports */}
            <div className="w-full h-96 sm:h-[500px] bg-slate-900 relative">
              <iframe
                src={`${fileUrl}#toolbar=0`}
                title="Resume PDF Viewer"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        ) : (
          /* DOC / DOCX non-fake information preview */
          <div className="p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 border border-blue-500/20 mx-auto flex items-center justify-center">
              <FileText className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {resume.originalName || `${studentName}'s Resume`}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Word Document ({fileType.toUpperCase()})
              </p>
            </div>

            {resume.coverUrl && (
              <div className="max-w-xs mx-auto aspect-video rounded-xl overflow-hidden border border-[var(--border-color)] shadow-sm">
                <img
                  src={resume.coverUrl}
                  alt="Resume Cover Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
              This document is stored in its original collegiate format. Click below to download or view it with your preferred document reader.
            </p>
          </div>
        )}

        {/* Metadata Details Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Format</span>
            <span className="font-bold text-[var(--text-primary)] uppercase">{fileType}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Privacy</span>
            <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
              <Shield className="w-3 h-3 text-blue-500" />
              {privacySetting}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Updated</span>
            <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[var(--text-muted)]" />
              {resume.uploadedAt
                ? new Date(resume.uploadedAt).toLocaleDateString()
                : 'Recently'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Cover Image</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {resume.coverUrl ? 'Custom' : 'Standard'}
            </span>
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            {isOwner && !showCoverEditor && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCoverEditor(true)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                  {resume.coverUrl ? 'Replace Cover' : 'Upload Cover'}
                </button>

                {onOpenEditModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEditModal();
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Replace Resume
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
            >
              Close
            </button>

            {isPdf && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5 cursor-pointer"
              >
                Open Full Tab <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Download Document
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

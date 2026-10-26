import React from 'react';
import { Modal } from '../common/Modal';
import {
  FileText,
  Download,
  ExternalLink,
  Clock,
  Trash2,
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
  onDeleteResume?: () => void;
}

export const ResumeModal: React.FC<ResumeModalProps> = ({
  isOpen,
  onClose,
  resume,
  studentName,
  isOwner = false,
  onDeleteResume,
}) => {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${studentName}'s Resume`}
      subtitle={resume.originalName || 'Professional Document'}
      maxWidth="3xl"
    >
      <div className="space-y-4 py-2">
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
            <div className="w-full h-96 sm:h-[550px] bg-slate-900 relative">
              <iframe
                src={`${fileUrl}#toolbar=0`}
                title="Resume PDF Viewer"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        ) : (
          /* DOC / DOCX download card */
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

            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
              This document is stored in its original collegiate format. Click below to download or view it.
            </p>
          </div>
        )}

        {/* Metadata Details Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Format</span>
            <span className="font-bold text-[var(--text-primary)] uppercase">{fileType}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Document Name</span>
            <span className="font-semibold text-[var(--text-primary)] truncate block" title={resume.originalName || 'Resume'}>
              {resume.originalName || 'Resume Document'}
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
        </div>

        {/* Action Controls Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            {isOwner && onDeleteResume && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeleteResume();
                }}
                className="px-3.5 py-2 rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Resume</span>
              </button>
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

            {(isPdf || isImage) && (
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

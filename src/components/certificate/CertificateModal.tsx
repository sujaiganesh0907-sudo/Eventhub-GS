import React from 'react';
import { Modal } from '../common/Modal';
import { ICertificate } from '../../types';
import { Download, Award, Calendar, Building2, MapPin, ExternalLink, ShieldCheck, Trash2 } from 'lucide-react';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: ICertificate | null;
  onDelete?: (id: string) => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  certificate,
  onDelete,
}) => {
  if (!certificate) return null;

  const handleDownload = () => {
    if (certificate.fileUrl) {
      const a = document.createElement('a');
      a.href = certificate.fileUrl;
      a.download = `${certificate.title}.png`;
      a.target = '_blank';
      a.click();
    }
  };

  const isPdf = certificate.fileUrl.toLowerCase().endsWith('.pdf');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={certificate.title}
      subtitle={`${certificate.issuingOrganization} · ${certificate.achievementType}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 py-2">
        {/* Certificate Display Canvas */}
        <div className="rounded-2xl border-2 border-[var(--border-color)] overflow-hidden bg-slate-900 flex items-center justify-center min-h-64 shadow-xs">
          {isPdf ? (
            <div className="p-8 text-center text-white space-y-3">
              <Award className="w-16 h-16 mx-auto text-amber-400" />
              <p className="text-sm font-bold">PDF Certificate Document</p>
              <a
                href={certificate.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold"
              >
                Open Document <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <img
              src={certificate.fileUrl}
              alt={certificate.title}
              className="w-full max-h-96 object-contain"
              onError={(e) => {
                (e.target as any).src =
                  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80';
              }}
            />
          )}
        </div>

        {/* Certificate Information */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs">
          <div>
            <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Organization</span>
            <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[var(--primary-color)]" />
              {certificate.issuingOrganization}
            </span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Issue Date</span>
            <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              {certificate.issueDate}
            </span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Achievement</span>
            <span className="font-bold text-amber-600 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              {certificate.achievementType}
            </span>
          </div>
          {certificate.eventName && (
            <div className="col-span-2">
              <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Event</span>
              <span className="font-semibold text-[var(--text-primary)]">{certificate.eventName}</span>
            </div>
          )}
          {certificate.certificateId && (
            <div>
              <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Credential ID</span>
              <span className="font-mono text-[var(--text-primary)]">{certificate.certificateId}</span>
            </div>
          )}
        </div>

        {certificate.description && (
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {certificate.description}
          </p>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
          <div>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(certificate._id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-500/10 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Award
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
            <button
              type="button"
              onClick={handleDownload}
              className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Download Certificate
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

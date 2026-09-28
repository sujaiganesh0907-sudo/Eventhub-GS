import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ICertificate } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  Download,
  Award,
  Calendar,
  Building2,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Edit3,
  Share2,
  ShieldAlert,
  Ban,
  Loader2,
} from 'lucide-react';
import { ReshareCertificateModal } from './ReshareCertificateModal';
import { PublicVerificationModal } from './PublicVerificationModal';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: ICertificate | null;
  onDelete?: (id: string) => void;
  onEdit?: (cert: ICertificate) => void;
  onRevoked?: (certificateId: string) => void;
  canDownload?: boolean;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  certificate: initialCert,
  onDelete,
  onEdit,
  onRevoked,
  canDownload = true,
}) => {
  const { user, isCollege } = useAuth();
  const [certificate, setCertificate] = useState<ICertificate | null>(initialCert);
  const [showReshareModal, setShowReshareModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  React.useEffect(() => {
    setCertificate(initialCert);
  }, [initialCert]);

  if (!certificate) return null;

  const handleRevoke = async () => {
    const reason = window.prompt('Please enter the reason for revoking this credential:');
    if (!reason || !reason.trim()) return;

    try {
      setIsRevoking(true);
      setRevokeError(null);
      const res = await api.post<any>(`/certificates/${certificate.certificateId}/revoke`, {
        reason: reason.trim(),
      });
      if (res.success) {
        setCertificate({
          ...certificate,
          revoked: true,
          revokedReason: reason.trim(),
          revokedAt: new Date().toISOString(),
        });
        if (onRevoked) onRevoked(certificate.certificateId);
      } else {
        setRevokeError(res.message || 'Failed to revoke certificate');
      }
    } catch (err: any) {
      setRevokeError(err.message || 'Error revoking certificate');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleDownload = () => {
    if (certificate.fileUrl) {
      const a = document.createElement('a');
      a.href = certificate.fileUrl;
      a.download = `${certificate.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      a.target = '_blank';
      a.click();
    }
  };

  const isPdf = certificate.fileUrl?.toLowerCase().endsWith('.pdf') || certificate.fileUrl?.includes('.pdf');

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={certificate.title}
        subtitle={`${certificate.issuingOrganization} · ${certificate.achievementType}`}
        maxWidth="2xl"
      >
        <div className="space-y-4 py-2">
          {/* Revocation Warning */}
          {certificate.revoked && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 flex items-center gap-2 text-xs font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>
                This credential was revoked by {certificate.issuingOrganization}. Reason:{' '}
                {certificate.revokedReason || 'Administrative update.'}
              </span>
            </div>
          )}

          {/* Certificate Display Canvas */}
          <div className="rounded-2xl border-2 border-[var(--border-color)] overflow-hidden bg-slate-900 flex items-center justify-center min-h-64 shadow-xs relative">
            {isPdf ? (
              <div className="p-8 text-center text-white space-y-3">
                <Award className="w-16 h-16 mx-auto text-amber-400" />
                <p className="text-sm font-bold">EVENTHUB Verified Digital Credential</p>
                <p className="text-xs text-slate-300">
                  Document generated and authenticated via EVENTHUB Registry
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <a
                    href={certificate.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                  >
                    View Official Document <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {certificate.docxFileUrl && (
                    <a
                      href={certificate.docxFileUrl}
                      download
                      className="inline-flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold hover:bg-slate-700 transition-colors"
                    >
                      Download .docx <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
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

            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-xs text-[11px] font-bold text-emerald-400 flex items-center gap-1 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Credential
              </span>
            </div>
          </div>

          {/* Certificate Information Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs">
            <div>
              <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">
                Issuing Organization
              </span>
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mt-0.5">
                {certificate.collegeLogo ? (
                  <img src={certificate.collegeLogo} alt="" className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                )}
                {certificate.issuingOrganization}
              </span>
            </div>

            <div>
              <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">
                Issue Date
              </span>
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                {certificate.issueDate}
              </span>
            </div>

            <div>
              <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">
                Achievement
              </span>
              <span className="font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                <Award className="w-3.5 h-3.5" />
                {certificate.achievementType}
              </span>
            </div>

            {certificate.eventName && (
              <div className="col-span-2">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">
                  Collegiate Event
                </span>
                <span className="font-semibold text-[var(--text-primary)] block mt-0.5">
                  {certificate.eventName}
                </span>
              </div>
            )}

            {certificate.certificateId && (
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">
                  Credential ID
                </span>
                <span className="font-mono text-[var(--text-primary)] font-bold block mt-0.5">
                  {certificate.certificateId}
                </span>
              </div>
            )}
          </div>

          {certificate.description && (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed px-1">
              {certificate.description}
            </p>
          )}

          {revokeError && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold">
              {revokeError}
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              {/* Online Verification Link button */}
              <button
                type="button"
                onClick={() => setShowVerifyModal(true)}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Verify Authenticity
              </button>

              {/* Reshare as Verified Credential Post (Requirement 1.4) */}
              <button
                type="button"
                onClick={() => setShowReshareModal(true)}
                className="px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-600" /> Reshare Credential
              </button>

              {/* Authorized College Admin Revoke */}
              {isCollege && !certificate.revoked && (
                <button
                  type="button"
                  disabled={isRevoking}
                  onClick={handleRevoke}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 border border-red-500/20 hover:bg-red-500/10 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {isRevoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  Revoke
                </button>
              )}

              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(certificate);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-600 hover:bg-amber-500/10 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(certificate._id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-500/10 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
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

              {canDownload && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Reshare Modal */}
      {showReshareModal && (
        <ReshareCertificateModal
          isOpen={showReshareModal}
          onClose={() => setShowReshareModal(false)}
          certificate={certificate}
        />
      )}

      {/* Public Online Verification Modal */}
      {showVerifyModal && certificate.certificateId && (
        <PublicVerificationModal
          isOpen={showVerifyModal}
          onClose={() => setShowVerifyModal(false)}
          certificateId={certificate.certificateId}
        />
      )}
    </>
  );
};

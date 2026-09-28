import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  Calendar,
  Award,
  ExternalLink,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
} from 'lucide-react';

interface PublicVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificateId: string;
}

export const PublicVerificationModal: React.FC<PublicVerificationModalProps> = ({
  isOpen,
  onClose,
  certificateId,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && certificateId) {
      setLoading(true);
      setError(null);
      api.get<any>(`/certificates/verify/${certificateId}`)
        .then((res) => {
          if (res.isValid) {
            setData(res);
          } else if (res.isRevoked) {
            setData(res);
          } else {
            setError(res.message || 'Credential not found in EVENTHUB registry.');
          }
        })
        .catch((err) => {
          setError(err.message || 'Verification check failed.');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, certificateId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Credential Authenticity Verification"
      subtitle="EVENTHUB Inter-Collegiate Academic Registry"
      maxWidth="lg"
    >
      <div className="py-2 space-y-4">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-color)]" />
            <p className="text-xs text-[var(--text-muted)] font-semibold">
              Querying cryptographic registry for credential {certificateId}...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center border border-red-500/20 bg-red-500/5 rounded-2xl space-y-3">
            <ShieldAlert className="w-12 h-12 mx-auto text-red-500" />
            <h4 className="text-sm font-bold text-red-600">Verification Failed</h4>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              {error}
            </p>
          </div>
        ) : data?.isRevoked ? (
          <div className="p-6 text-center border border-red-500/30 bg-red-500/10 rounded-2xl space-y-3">
            <ShieldAlert className="w-12 h-12 mx-auto text-red-600" />
            <span className="px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-wider">
              REVOKED CREDENTIAL
            </span>
            <h4 className="text-base font-bold text-[var(--text-primary)]">
              {data.certificate?.title}
            </h4>
            <p className="text-xs text-red-700">
              This credential was revoked by {data.certificate?.issuingOrganization} on{' '}
              {data.revokedAt ? new Date(data.revokedAt).toLocaleDateString() : 'earlier date'}.
            </p>
            {data.revokedReason && (
              <p className="text-xs italic text-[var(--text-muted)]">
                Reason: "{data.revokedReason}"
              </p>
            )}
          </div>
        ) : data?.isValid && data.certificate ? (
          <div className="space-y-4">
            {/* Top Verification Trust Badge */}
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-black uppercase tracking-wide block text-emerald-700">
                  Officially Verified Credential
                </span>
                <span className="text-xs text-emerald-800 font-medium">
                  Authenticated directly from {data.certificate.issuingOrganization} records.
                </span>
              </div>
            </div>

            {/* Recipient & Event Details */}
            <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                    Awarded To
                  </span>
                  <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 mt-0.5">
                    <User className="w-4 h-4 text-[var(--primary-color)]" />
                    {data.certificate.recipientName}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                    {data.certificate.recipientCollege} {data.certificate.department ? `· ${data.certificate.department}` : ''}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                    Issuing Institution
                  </span>
                  <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    {data.certificate.issuingOrganization}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                    Event Date: {data.certificate.eventDate}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                  Event Title & Credential
                </span>
                <span className="font-bold text-[var(--text-primary)] text-sm block mt-0.5">
                  {data.certificate.title}
                </span>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Achievement: <span className="font-semibold text-amber-600">{data.certificate.achievementType}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between font-mono text-[11px]">
                <span className="text-[var(--text-muted)]">Credential ID:</span>
                <span className="font-bold text-[var(--text-primary)]">{data.certificate.certificateId}</span>
              </div>
            </div>

            {/* Document Links */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              {data.certificate.fileUrl && (
                <a
                  href={data.certificate.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Certificate Document
                </a>
              )}
              {data.certificate.docxFileUrl && (
                <a
                  href={data.certificate.docxFileUrl}
                  download
                  className="px-3.5 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download .docx
                </a>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};

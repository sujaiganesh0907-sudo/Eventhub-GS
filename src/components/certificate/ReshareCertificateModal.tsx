import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ICertificate } from '../../types';
import { api } from '../../services/api';
import { Award, Share2, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReshareCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: ICertificate | null;
  onSuccess?: () => void;
}

export const ReshareCertificateModal: React.FC<ReshareCertificateModalProps> = ({
  isOpen,
  onClose,
  certificate,
  onSuccess,
}) => {
  if (!certificate) return null;

  const [caption, setCaption] = useState(
    `Proud to have participated in "${certificate.eventName || certificate.title}" and earned my official verified certificate from ${certificate.issuingOrganization}! 🎓✨`
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleReshare = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.post<any>(`/certificates/${certificate._id || certificate.certificateId}/reshare`, {
        caption,
      });

      if (res.success) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        setSuccess('Verified Credential successfully shared to your EVENTHUB portfolio!');
        onSuccess?.();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(res.message || 'Failed to reshare certificate.');
      }
    } catch (err: any) {
      setError(err.message || 'Error resharing certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reshare Verified Credential"
      subtitle="Publish verified achievement to EVENTHUB community"
      maxWidth="lg"
    >
      <form onSubmit={handleReshare} className="space-y-4 py-2">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Credential Preview Card */}
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-bold text-[var(--text-primary)]">
                EVENTHUB Verified Credential
              </span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" /> Authenticated
            </span>
          </div>

          <div className="text-xs space-y-1">
            <h4 className="font-bold text-[var(--text-primary)] text-sm">
              {certificate.title}
            </h4>
            <p className="text-[var(--text-secondary)]">
              Issued by <span className="font-semibold text-[var(--text-primary)]">{certificate.issuingOrganization}</span>
            </p>
            <p className="text-[11px] font-mono text-[var(--text-muted)]">
              Credential ID: {certificate.certificateId} · {certificate.issueDate}
            </p>
          </div>
        </div>

        {/* Caption Input */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
            Post Caption / Thoughts
          </label>
          <textarea
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary-color)]"
            placeholder="Write something about your participation or achievement..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            Reshare Credential
          </button>
        </div>
      </form>
    </Modal>
  );
};

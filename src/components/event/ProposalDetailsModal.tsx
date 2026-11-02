import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { IEvent } from '../../types';
import { DEFAULT_EVENT_POSTER, DEFAULT_COLLEGE_LOGO } from '../../services/imageDefaults';
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  Mail,
  Phone,
  AlertCircle,
  FileText,
  Sparkles,
  HelpCircle,
  Layers,
  Info,
} from 'lucide-react';

interface ProposalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: IEvent | null;
  onApprove: (proposalId: string) => Promise<void> | void;
  onReject: (proposalId: string, reason: string) => Promise<void> | void;
  isProcessing?: boolean;
}

export const ProposalDetailsModal: React.FC<ProposalDetailsModalProps> = ({
  isOpen,
  onClose,
  proposal,
  onApprove,
  onReject,
  isProcessing = false,
}) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  if (!proposal) return null;

  const posterSrc = proposal.poster || proposal.hostCollegeLogo || DEFAULT_EVENT_POSTER;
  const isPending = proposal.status === 'Pending Approval';
  const isApproved = proposal.status === 'Approved' || proposal.status === 'Published';
  const isRejected = proposal.status === 'Rejected';

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      setRejectError('A clear rejection or feedback reason is required to notify the proposer.');
      return;
    }
    setRejectError(null);
    await onReject(proposal._id, rejectionReason.trim());
    setShowRejectForm(false);
    setRejectionReason('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Proposal Details & Review"
      subtitle={`Submitted for ${proposal.hostCollegeName || 'Institution Review'}`}
      maxWidth="3xl"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Poster & Header Info */}
        <div className="relative rounded-2xl overflow-hidden border border-[var(--border-color)] bg-slate-950 aspect-21/9 max-h-56 w-full">
          <img
            src={posterSrc}
            alt={proposal.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as any).src = DEFAULT_EVENT_POSTER;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-md">
                {proposal.category}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md ${
                  isApproved
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : isRejected
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {proposal.status}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 backdrop-blur-md">
                {proposal.isFree ? 'Free Admission' : `Fee: ₹${proposal.registrationFee}`}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight line-clamp-2">
              {proposal.title}
            </h2>
            {proposal.tagline && (
              <p className="text-xs text-white/80 line-clamp-1 mt-0.5 font-medium">
                {proposal.tagline}
              </p>
            )}
          </div>
        </div>

        {/* Rejection / Note Banner if present */}
        {proposal.rejectionReason && (
          <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-600 dark:text-red-400 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" /> Previous Review Feedback:
            </div>
            <p className="pl-5.5 leading-relaxed">{proposal.rejectionReason}</p>
          </div>
        )}

        {/* Proposer / Submitter Information Card */}
        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--primary-color)]" />
              Proposer & Organization
            </h4>
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
              Role: <strong className="text-[var(--text-primary)]">{proposal.creatorRole || 'Student'}</strong>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">Host / Target Institution</span>
              <span className="font-bold text-[var(--text-primary)]">
                {proposal.hostCollegeName || 'University Department'}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[11px]">Primary Coordinator</span>
              <span className="font-bold text-[var(--text-primary)]">
                {proposal.primaryCoordinator?.name || 'Authorized Submitter'}
              </span>
            </div>
            {proposal.primaryCoordinator?.email && (
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="truncate">{proposal.primaryCoordinator.email}</span>
              </div>
            )}
            {proposal.primaryCoordinator?.phone && (
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>{proposal.primaryCoordinator.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Key Event Specifications Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] space-y-1">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-[var(--primary-color)]" />
              <span>Event Date</span>
            </div>
            <p className="text-xs font-bold text-[var(--text-primary)] truncate">
              {proposal.eventDate || 'TBD'}
            </p>
          </div>

          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] space-y-1">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px]">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Timing</span>
            </div>
            <p className="text-xs font-bold text-[var(--text-primary)] truncate">
              {proposal.startTime && proposal.endTime
                ? `${proposal.startTime} - ${proposal.endTime}`
                : proposal.startTime || 'Scheduled Time'}
            </p>
          </div>

          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] space-y-1">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>Mode / Venue</span>
            </div>
            <p className="text-xs font-bold text-[var(--text-primary)] truncate" title={proposal.venue || proposal.eventMode}>
              {proposal.eventMode} · {proposal.venue || 'Campus'}
            </p>
          </div>

          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] space-y-1">
            <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[11px]">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Capacity</span>
            </div>
            <p className="text-xs font-bold text-[var(--text-primary)] truncate">
              {proposal.capacity || 500} Attendees
            </p>
          </div>
        </div>

        {/* Event Description */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[var(--primary-color)]" />
            Description & Purpose
          </h4>
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
            {proposal.description || 'No detailed description provided by the submitter.'}
          </div>
        </div>

        {/* Group / Team Registration Details */}
        {(proposal.hasGroup || proposal.registrationType === 'Team' || proposal.groupDetails) && (
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-500" />
              Team & Group Collaboration
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[var(--text-muted)] text-[11px] block">Registration Model</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {proposal.registrationType || 'Team'}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] text-[11px] block">Team Size</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {proposal.minTeamSize || 1} to {proposal.maxTeamSize || 4} Members
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] text-[11px] block">Official Group</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {proposal.groupDetails?.groupName || 'Auto-created upon approval'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Custom Registration Questions */}
        {proposal.registrationQuestions && proposal.registrationQuestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              Custom Registration Questions ({proposal.registrationQuestions.length})
            </h4>
            <div className="divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)] bg-[var(--surface)] overflow-hidden">
              {proposal.registrationQuestions.map((q: any, idx: number) => (
                <div key={q.id || idx} className="p-3 text-xs flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text-primary)]">{idx + 1}. {q.label}</span>
                      {q.required && (
                        <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.2 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    {q.options && q.options.length > 0 && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Options: {q.options.join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] shrink-0">
                    {q.questionType || 'text'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rules & Guidelines */}
        {(proposal.importantNotes || proposal.reportingInstructions || proposal.idRequirement) && (
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] space-y-2 text-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-500" />
              Event Guidelines & Entry Requirements
            </h4>
            {proposal.reportingInstructions && (
              <p className="text-[var(--text-secondary)]">
                <strong>Reporting:</strong> {proposal.reportingInstructions}
              </p>
            )}
            {proposal.idRequirement && (
              <p className="text-[var(--text-secondary)]">
                <strong>ID Verification:</strong> {proposal.idRequirement}
              </p>
            )}
            {proposal.importantNotes && (
              <p className="text-[var(--text-secondary)]">
                <strong>Notes:</strong> {proposal.importantNotes}
              </p>
            )}
          </div>
        )}

        {/* Rejection Feedback Form Sub-Modal */}
        {showRejectForm && (
          <div className="p-4 rounded-2xl border-2 border-red-500/30 bg-red-500/5 space-y-3 animate-in fade-in-50">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Specify Rejection / Revision Reason *
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectError(null);
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (rejectError) setRejectError(null);
              }}
              placeholder="State the reasons (e.g., date conflict, venue unavailability, missing security checklist, fee policy)..."
              className="w-full p-2.5 rounded-xl border border-red-500/30 bg-[var(--surface)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-red-500"
            />
            {rejectError && (
              <p className="text-[11px] text-red-500 font-semibold">{rejectError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isProcessing || !rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 transition-all shadow-xs"
              >
                {isProcessing ? 'Submitting...' : 'Confirm Decline & Notify Proposer'}
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
          >
            Close
          </button>

          {isPending && !showRejectForm && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowRejectForm(true)}
                className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject Proposal
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => onApprove(proposal._id)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Publish Live
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

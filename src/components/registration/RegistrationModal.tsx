import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { IEvent, IEventRegistration } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { PaymentModal } from './PaymentModal';
import { TicketModal } from './TicketModal';
import {
  User,
  Mail,
  Building2,
  Phone,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: IEvent;
  onRegistrationSuccess?: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  event,
  onRegistrationSuccess,
}) => {
  const { user, studentProfile } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>(['']);
  const [customResponses, setCustomResponses] = useState<Record<string, any>>({});

  // Payment & Ticket Modals State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdRegistration, setCreatedRegistration] = useState<IEventRegistration | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Profile data prefill
  const studentName = studentProfile?.fullName || user?.fullName || '';
  const studentEmail = user?.email || '';
  const studentPhone = studentProfile?.phoneNumber || '+1 (555) 019-2834';
  const studentCollege = studentProfile?.collegeName || 'Apex Institute of Technology';
  const studentDepartment = studentProfile?.department || 'Computer Science';
  const studentYear = studentProfile?.yearOfStudy || '3rd Year';

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (event.registrationType === 'Team' && !teamName.trim()) {
        setError('Team Name is required for team registration.');
        return;
      }
      setStep(event.registrationQuestions && event.registrationQuestions.length > 0 ? 2 : 3);
    } else if (step === 2) {
      // Validate required questions
      for (const q of event.registrationQuestions || []) {
        if (q.required && !customResponses[q.id]) {
          setError(`Please answer the required question: "${q.label}"`);
          return;
        }
      }
      setStep(3);
    }
  };

  const handleRegister = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        eventId: event._id,
        registrationType: event.registrationType,
        teamName: event.registrationType === 'Team' ? teamName : undefined,
        teamMembers: event.registrationType === 'Team' ? teamMembers.filter(Boolean) : undefined,
        customResponses,
      };

      const res = await api.post<any>('/registrations', payload);
      if (res.success && res.registration) {
        setCreatedRegistration(res.registration);

        if (event.isFree) {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          setShowTicketModal(true);
          onRegistrationSuccess?.();
        } else {
          // Open payment gateway modal
          setShowPaymentModal(true);
        }
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Could not complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = (paymentRes: any) => {
    setShowPaymentModal(false);
    if (paymentRes.registration) {
      setCreatedRegistration(paymentRes.registration);
    }
    setShowTicketModal(true);
    onRegistrationSuccess?.();
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !showTicketModal}
        onClose={onClose}
        title={`Register: ${event.title}`}
        subtitle={`Step ${step} of ${event.registrationQuestions?.length ? 3 : 2}: ${
          step === 1 ? 'Participant Details' : step === 2 ? 'Organizer Questions' : 'Review & Confirm'
        }`}
        maxWidth="lg"
      >
        <div className="space-y-4 py-2">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Participant Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-[var(--text-secondary)] tracking-wider">
                    Student Information (Prefilled from Profile)
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">Full Name</span>
                    <span className="font-semibold text-[var(--text-primary)]">{studentName}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">Email</span>
                    <span className="font-semibold text-[var(--text-primary)]">{studentEmail}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">College</span>
                    <span className="font-semibold text-[var(--text-primary)]">{studentCollege}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">Department & Year</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {studentDepartment} · {studentYear}
                    </span>
                  </div>
                </div>
              </div>

              {/* Team Registration Extra Fields */}
              {event.registrationType === 'Team' && (
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[var(--primary-color)]" /> Team Details (Min: {event.minTeamSize || 2}, Max: {event.maxTeamSize || 4})
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. CyberVanguard"
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Team Members (Email / Names)
                    </label>
                    {teamMembers.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={m}
                          onChange={(e) => {
                            const updated = [...teamMembers];
                            updated[idx] = e.target.value;
                            setTeamMembers(updated);
                          }}
                          placeholder={`Team Member #${idx + 2} Name or Email`}
                          className="grow p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                        />
                        {teamMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setTeamMembers(teamMembers.filter((_, i) => i !== idx))}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {(teamMembers.length + 1) < (event.maxTeamSize || 4) && (
                      <button
                        type="button"
                        onClick={() => setTeamMembers([...teamMembers, ''])}
                        className="text-xs text-[var(--primary-color)] font-semibold flex items-center gap-1 mt-1 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Another Member
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Dynamic Organizer Questions */}
          {step === 2 && event.registrationQuestions && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase text-[var(--text-secondary)] tracking-wider">
                Event Organizer Specific Questions
              </h4>

              {event.registrationQuestions.map((q) => (
                <div key={q.id} className="space-y-1">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    {q.label} {q.required && <span className="text-red-500">*</span>}
                  </label>
                  {q.helperText && <p className="text-[11px] text-[var(--text-muted)]">{q.helperText}</p>}

                  {q.type === 'Short Answer' && (
                    <input
                      type="text"
                      value={customResponses[q.id] || ''}
                      onChange={(e) => setCustomResponses({ ...customResponses, [q.id]: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
                    />
                  )}

                  {q.type === 'Long Answer' && (
                    <textarea
                      rows={3}
                      value={customResponses[q.id] || ''}
                      onChange={(e) => setCustomResponses({ ...customResponses, [q.id]: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
                    />
                  )}

                  {q.type === 'Link' && (
                    <input
                      type="url"
                      placeholder="https://..."
                      value={customResponses[q.id] || ''}
                      onChange={(e) => setCustomResponses({ ...customResponses, [q.id]: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
                    />
                  )}

                  {q.type === 'Dropdown' && q.options && (
                    <select
                      value={customResponses[q.id] || ''}
                      onChange={(e) => setCustomResponses({ ...customResponses, [q.id]: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
                    >
                      <option value="">Select option</option>
                      {q.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* STEP 3: Review & Summary */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2">
                <h4 className="text-xs font-bold uppercase text-[var(--text-secondary)] tracking-wider">
                  Registration Summary
                </h4>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Event:</span>
                  <span className="font-bold text-[var(--text-primary)]">{event.title}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Host College:</span>
                  <span className="font-bold text-[var(--text-primary)]">{event.hostCollegeName}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Registration Type:</span>
                  <span className="font-bold text-[var(--text-primary)]">{event.registrationType}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">Event Date:</span>
                  <span className="font-bold text-[var(--text-primary)]">{event.eventDate} ({event.startTime})</span>
                </div>
                <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Registration Fee:</span>
                  <span className="text-base font-extrabold text-[var(--primary-color)]">
                    {event.isFree ? 'FREE' : `$${event.registrationFee}`}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-muted)]">
                {event.isFree
                  ? 'Clicking Confirm Registration will instantly create your verified entry ticket with an encrypted entry QR pass.'
                  : 'Clicking Proceed to Payment will open our checkout gateway to complete your fee payment securely.'}
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t border-[var(--border-color)]">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                Cancel
              </button>
            )}

            {step < 3 && (step === 1 && (event.registrationQuestions?.length || 0) > 0 || step === 2) ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleRegister}
                className="px-6 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
              >
                {submitting ? (
                  'Processing...'
                ) : event.isFree ? (
                  'Confirm Registration'
                ) : (
                  `Proceed to Pay $${event.registrationFee}`
                )}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Payment Gateway Modal */}
      {showPaymentModal && createdRegistration && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          registrationId={createdRegistration.registrationId}
          amount={event.registrationFee}
          eventTitle={event.title}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Verified Ticket Pass Modal */}
      {showTicketModal && createdRegistration && (
        <TicketModal
          isOpen={showTicketModal}
          onClose={() => {
            setShowTicketModal(false);
            onClose();
          }}
          registration={createdRegistration}
          event={event}
        />
      )}
    </>
  );
};

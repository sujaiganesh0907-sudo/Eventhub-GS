import React, { useState, useEffect, useRef } from 'react';
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, ShieldAlert, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { maskEmailAddress } from '../../services/verificationStorage';

interface OtpVerificationViewProps {
  email: string;
  purpose: 'STUDENT_REGISTRATION' | 'COLLEGE_REGISTRATION' | 'ORGANIZER_REGISTRATION';
  onVerifiedSuccess: () => void;
  onBackToEdit: () => void;
}

export const OtpVerificationView: React.FC<OtpVerificationViewProps> = ({
  email,
  purpose,
  onVerifiedSuccess,
  onBackToEdit,
}) => {
  const { verifyOtp, resendOtp } = useAuth();

  // 6 separate digits
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // States: Sending, Code Sent, Verifying, Verified, Invalid Code, Expired Code, Resend Successful
  const [status, setStatus] = useState<'idle' | 'verifying' | 'verified' | 'invalid' | 'expired' | 'resending' | 'resend_success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>('Verification code sent to your email.');
  const [cooldown, setCooldown] = useState<number>(60);

  // Cooldown countdown timer (60s)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    setErrorMessage(null);
    if (status === 'invalid' || status === 'expired') {
      setStatus('idle');
    }

    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const char = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Auto-advance to next box
    if (index < 5 && char) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);

    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const fullOtp = digits.join('');

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (fullOtp.length < 6) {
      setStatus('invalid');
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setStatus('verifying');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await verifyOtp(email, fullOtp, purpose);
      if (res.success) {
        setStatus('verified');
        setSuccessMessage(res.message || 'Email verified successfully!');
        setTimeout(() => {
          onVerifiedSuccess();
        }, 1200);
      } else {
        if (res.expired) {
          setStatus('expired');
          setErrorMessage(res.message || 'Verification code has expired. Please request a new code.');
        } else {
          setStatus('invalid');
          setErrorMessage(res.message || 'Invalid verification code. Please try again.');
        }
      }
    } catch (err: any) {
      setStatus('invalid');
      setErrorMessage(err.message || 'Failed to verify verification code.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || status === 'resending') return;
    setStatus('resending');
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await resendOtp(email, purpose);
      if (res.success) {
        setStatus('resend_success');
        setSuccessMessage(res.message || 'A fresh 6-digit verification code has been sent.');
        setCooldown(60);
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setStatus('invalid');
        setErrorMessage(res.message || 'Unable to send verification code. Please try again.');
      }
    } catch (err: any) {
      setStatus('invalid');
      setErrorMessage(err.message || 'Unable to send verification code. Please try again.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] mx-auto flex items-center justify-center">
          <KeyRound className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-black tracking-tight text-[var(--text-primary)]">
          Verify Your Email
        </h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
          We sent a 6-digit verification code to
          <span className="block font-bold text-[var(--text-primary)] mt-1 tracking-wide font-mono text-xs">
            {maskEmailAddress(email)}
          </span>
        </p>
      </div>

      {/* Dynamic Status / Feedback Banners */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2.5">
          {status === 'expired' ? (
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && !errorMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 6 OTP Input Boxes */}
      <form onSubmit={handleVerify} className="space-y-5">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              autoComplete="one-time-code"
              disabled={status === 'verifying' || status === 'verified'}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-black rounded-xl border transition-all focus:outline-hidden ${
                digit
                  ? 'border-[var(--primary-color)] bg-[var(--surface)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--primary-color)]/20'
                  : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-primary)]'
              } ${status === 'invalid' ? 'border-red-500/50' : ''}`}
            />
          ))}
        </div>

        {/* Action Button: Verify OTP */}
        <button
          type="submit"
          disabled={status === 'verifying' || status === 'verified' || fullOtp.length < 6}
          className="w-full py-3 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'verifying' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying OTP...</span>
            </>
          ) : status === 'verified' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified!</span>
            </>
          ) : (
            <span>Verify OTP</span>
          )}
        </button>

        {/* Footer: Resend & Cooldown + Back / Change Email */}
        <div className="flex items-center justify-between text-xs pt-3 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || status === 'resending' || status === 'verifying' || status === 'verified'}
            className={`font-semibold transition-colors flex items-center gap-1.5 ${
              cooldown > 0 || status === 'resending' || status === 'verifying' || status === 'verified'
                ? 'text-[var(--text-muted)] cursor-not-allowed'
                : 'text-[var(--primary-color)] hover:underline cursor-pointer'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status === 'resending' ? 'animate-spin' : ''}`} />
            {status === 'resending'
              ? 'Sending fresh OTP...'
              : cooldown > 0
              ? `Resend OTP in ${cooldown}s`
              : 'Resend OTP'}
          </button>

          <button
            type="button"
            onClick={onBackToEdit}
            disabled={status === 'verifying' || status === 'verified'}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back / Change Email
          </button>
        </div>
      </form>
    </div>
  );
};

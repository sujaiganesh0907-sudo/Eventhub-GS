import React, { useState, useEffect, useRef } from 'react';
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface OtpVerificationViewProps {
  email: string;
  purpose: 'STUDENT_REGISTRATION' | 'COLLEGE_REGISTRATION';
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

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(60);
  const [isExpired, setIsExpired] = useState(false);

  // Mask email for privacy (e.g., al***@domain.com)
  const maskEmail = (raw: string) => {
    if (!raw.includes('@')) return raw;
    const [name, domain] = raw.split('@');
    if (name.length <= 2) return `${name[0]}*@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  };

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    const cleaned = value.replace(/\D/g, '');

    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // Handle single digit
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
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await verifyOtp(email, fullOtp, purpose);
      if (res.success) {
        setSuccessMsg(res.message || 'Email verified successfully!');
        setTimeout(() => {
          onVerifiedSuccess();
        }, 1200);
      } else {
        if (res.expired) setIsExpired(true);
        setError(res.message || 'Invalid verification code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    setSuccessMsg(null);
    setIsExpired(false);

    try {
      const res = await resendOtp(email, purpose);
      if (res.success) {
        setSuccessMsg(res.message || 'A fresh 6-digit code has been sent.');
        setCooldown(60);
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(res.message || 'Unable to send verification code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to send verification code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[var(--primary-color)]/10 text-[var(--primary-color)] mx-auto flex items-center justify-center">
          <Mail className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
          {purpose === 'STUDENT_REGISTRATION'
            ? 'Verify Student Email'
            : 'Verify Institutional Email'}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
          We have dispatched a 6-digit verification code to:
          <span className="block font-bold text-[var(--text-primary)] mt-0.5 tracking-wide">
            {maskEmail(email)}
          </span>
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 6 OTP Input Boxes */}
      <form onSubmit={handleVerify} className="space-y-5">
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-bold rounded-xl border transition-all focus:outline-hidden ${
                digit
                  ? 'border-[var(--primary-color)] bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                  : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-primary)]'
              } focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20`}
            />
          ))}
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading || fullOtp.length < 6}
          className="w-full py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Verifying Code...' : 'Verify Email & Finish Registration'}
        </button>

        {/* Resend & Timer */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className={`font-semibold transition-colors flex items-center gap-1.5 ${
              cooldown > 0 || resending
                ? 'text-[var(--text-muted)] cursor-not-allowed'
                : 'text-[var(--primary-color)] hover:underline cursor-pointer'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            {resending
              ? 'Sending fresh OTP...'
              : cooldown > 0
              ? `Resend OTP in ${cooldown}s`
              : 'Resend Verification Code'}
          </button>

          <button
            type="button"
            onClick={onBackToEdit}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Edit Info
          </button>
        </div>
      </form>
    </div>
  );
};

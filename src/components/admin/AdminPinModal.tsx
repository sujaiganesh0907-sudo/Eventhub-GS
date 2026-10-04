import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  Mail,
} from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  collegeName?: string;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  collegeName = 'Collegiate Institution',
}) => {
  const [pinStep, setPinStep] = useState<'enter' | 'setup' | 'forgot'>('enter');
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotConfirmPin, setForgotConfirmPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinNotice, setPinNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPinError(null);
      setPinNotice(null);
      setPinInput('');
      setConfirmPinInput('');
      setForgotOtp('');
      setForgotNewPin('');
      setForgotConfirmPin('');

      // Check if user already has a PIN configured
      const checkStatus = async () => {
        try {
          const res = await api.get<any>('/admins/pin/status');
          if (res.success) {
            setPinStep(res.hasPin ? 'enter' : 'setup');
          }
        } catch {
          setPinStep('enter');
        }
      };
      checkStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle PIN Setup
  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinInput.trim())) {
      setPinError('PIN must consist of exactly 4 digits.');
      return;
    }
    if (pinInput.trim() !== confirmPinInput.trim()) {
      setPinError('PIN confirmation does not match.');
      return;
    }

    try {
      setPinLoading(true);
      setPinError(null);
      const res = await api.post<any>('/admins/pin/setup', {
        pin: pinInput.trim(),
      });
      if (res.success) {
        onSuccess();
      } else {
        setPinError(res.message || 'Failed to setup PIN.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Error setting up PIN.');
    } finally {
      setPinLoading(false);
    }
  };

  // Handle PIN Verification
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinInput.trim())) {
      setPinError('Please enter your 4-digit PIN.');
      return;
    }

    try {
      setPinLoading(true);
      setPinError(null);
      const res = await api.post<any>('/admins/pin/verify', {
        pin: pinInput.trim(),
      });
      if (res.success) {
        onSuccess();
      } else {
        setPinError(res.message || 'Incorrect PIN entered.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Verification error.');
    } finally {
      setPinLoading(false);
    }
  };

  // Request Forgot PIN OTP
  const handleRequestForgotOtp = async () => {
    try {
      setPinLoading(true);
      setPinError(null);
      const res = await api.post<any>('/admins/pin/forgot', {});
      if (res.success) {
        setPinNotice(res.message || 'A 6-digit OTP code was dispatched to your email.');
        setPinStep('forgot');
      } else {
        setPinError(res.message || 'Failed to request reset OTP.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Error requesting reset code.');
    } finally {
      setPinLoading(false);
    }
  };

  // Handle PIN Reset with OTP
  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotOtp.trim().length !== 6) {
      setPinError('Enter the 6-digit code received in your email.');
      return;
    }
    if (!/^\d{4}$/.test(forgotNewPin.trim())) {
      setPinError('New PIN must be exactly 4 numeric digits.');
      return;
    }
    if (forgotNewPin.trim() !== forgotConfirmPin.trim()) {
      setPinError('New PIN confirmation does not match.');
      return;
    }

    try {
      setPinLoading(true);
      setPinError(null);
      const res = await api.post<any>('/admins/pin/reset', {
        otp: forgotOtp.trim(),
        newPin: forgotNewPin.trim(),
      });
      if (res.success) {
        onSuccess();
      } else {
        setPinError(res.message || 'Failed to reset PIN.');
      }
    } catch (err: any) {
      setPinError(err.message || 'Error resetting PIN.');
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-[var(--primary-color)]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {pinStep === 'setup'
                  ? 'Set 4-Digit Admin Access PIN'
                  : pinStep === 'forgot'
                  ? 'Reset Forgotten Admin PIN'
                  : 'Enter 4-Digit Admin Access PIN'}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {pinStep === 'setup'
                  ? 'Create a secure PIN for delegated college operations'
                  : pinStep === 'forgot'
                  ? 'Verify identity via email OTP code'
                  : `Authenticate access for ${collegeName}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {pinNotice && (
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs font-semibold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{pinNotice}</span>
          </div>
        )}

        {pinError && (
          <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-semibold text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{pinError}</span>
          </div>
        )}

        {/* 1. Enter Mode */}
        {pinStep === 'enter' && (
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                4-Digit Security PIN
              </label>
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full text-center tracking-[0.5em] text-xl font-mono py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleRequestForgotOtp}
                className="text-xs font-bold text-[var(--primary-color)] hover:underline cursor-pointer"
              >
                Forgot PIN?
              </button>

              <button
                type="submit"
                disabled={pinLoading || pinInput.length !== 4}
                className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {pinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                Unlock Workspace
              </button>
            </div>
          </form>
        )}

        {/* 2. Setup Mode */}
        {pinStep === 'setup' && (
          <form onSubmit={handleSetupPin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                New 4-Digit PIN
              </label>
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full text-center tracking-[0.5em] text-xl font-mono py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Confirm 4-Digit PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={confirmPinInput}
                onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full text-center tracking-[0.5em] text-xl font-mono py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
              />
            </div>

            <button
              type="submit"
              disabled={pinLoading || pinInput.length !== 4 || confirmPinInput.length !== 4}
              className="w-full mt-2 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {pinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Save & Activate PIN
            </button>
          </form>
        )}

        {/* 3. Forgot / Reset Mode */}
        {pinStep === 'forgot' && (
          <form onSubmit={handleResetPin} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                6-Digit Email Verification Code (OTP)
              </label>
              <input
                type="text"
                maxLength={6}
                value={forgotOtp}
                onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-[0.4em] text-lg font-mono py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={forgotNewPin}
                  onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center tracking-[0.3em] font-mono py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={forgotConfirmPin}
                  onChange={(e) => setForgotConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center tracking-[0.3em] font-mono py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setPinStep('enter')}
                className="text-xs font-bold text-[var(--text-secondary)] hover:underline cursor-pointer"
              >
                Back to Login
              </button>

              <button
                type="submit"
                disabled={
                  pinLoading ||
                  forgotOtp.length !== 6 ||
                  forgotNewPin.length !== 4 ||
                  forgotConfirmPin.length !== 4
                }
                className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {pinLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Reset & Unlock
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

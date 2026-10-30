import React, { useState } from 'react';
import { useTheme, ThemeMode, THEME_OPTIONS } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Palette,
  Moon,
  Sun,
  Shield,
  User,
  Building2,
  Check,
  RefreshCw,
  LogOut,
  MessageSquare,
  Lock,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Bell,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { AdminPinModal } from '../components/admin/AdminPinModal';

export const SettingsPage: React.FC = () => {
  const { currentTheme, setTheme, isDark, toggleDarkMode } = useTheme();
  const {
    user,
    studentProfile,
    college,
    isCollege,
    isStudent,
    switchAccount,
    logout,
    refreshProfile,
    updateStudentProfileLocal,
    updateCollegeProfileLocal,
  } = useAuth();

  // Consolidated Navigation (Requirement 9 & 10)
  const [activeTab, setActiveTab] = useState<
    'account' | 'privacy' | 'notifications' | 'security' | 'appearance'
  >('account');

  // --- Consolidated Privacy States (Requirement 9) ---
  const [profileVisibility, setProfileVisibility] = useState<
    'Everyone' | 'EVENTHUB users' | 'Connections only' | 'Private'
  >((studentProfile?.profileVisibility as any) || 'Everyone');

  const [messagePrivacy, setMessagePrivacy] = useState<
    'Everyone' | 'Connections only' | 'Same college only' | 'Nobody'
  >((studentProfile?.messagePrivacy as any) || 'Everyone');

  const [groupAddPrivacy, setGroupAddPrivacy] = useState<
    'Everyone' | 'Connections only' | 'Same college only' | 'Nobody / request only'
  >(studentProfile?.groupAddPrivacy || 'Everyone');

  const [collegeMessagePrivacy, setCollegeMessagePrivacy] = useState<'Everyone' | 'Connected' | 'Nobody'>(
    college?.messagePrivacy || 'Everyone'
  );

  // --- Notification Preferences ---
  const [emailAlerts, setEmailAlerts] = useState<boolean>(true);
  const [inAppAlerts, setInAppAlerts] = useState<boolean>(true);
  const [eventReminders, setEventReminders] = useState<boolean>(true);

  // --- Change Password States (Requirement 11) ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // --- Forgot Password / OTP Recovery States (Requirement 12) ---
  const [forgotEmail, setForgotEmail] = useState(user?.email || '');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  // --- Multi-Factor Authentication States (Requirement 13) ---
  const [mfaEnabledState, setMfaEnabledState] = useState<boolean>(Boolean(user?.mfaEnabled));
  const [mfaSetupStep, setMfaSetupStep] = useState<'idle' | 'otp_sent'>('idle');
  const [mfaOtp, setMfaOtp] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Saving state & feedback
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const showSuccessFeedback = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3500);
  };

  // Save student profile privacy updates
  const handleSaveStudentSettings = async (overrides?: any) => {
    try {
      setSaving(true);
      const payload = {
        profileVisibility: overrides?.profileVisibility || profileVisibility,
        messagePrivacy: overrides?.messagePrivacy || messagePrivacy,
        groupAddPrivacy: overrides?.groupAddPrivacy || groupAddPrivacy,
        notificationPreferences: {
          emailNotifications: overrides?.emailAlerts !== undefined ? overrides.emailAlerts : emailAlerts,
          pushNotifications: overrides?.inAppAlerts !== undefined ? overrides.inAppAlerts : inAppAlerts,
          eventReminders: overrides?.eventReminders !== undefined ? overrides.eventReminders : eventReminders,
        },
      };

      const res = await api.put<any>('/students/profile', payload);
      if (res.success && (res.student || res.profile)) {
        const updated = res.student || res.profile;
        if (updateStudentProfileLocal) updateStudentProfileLocal(updated);
        showSuccessFeedback('Privacy preferences saved successfully.');
      }
    } catch (err: any) {
      console.error('Failed to update student settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Save college message privacy updates
  const handleSaveCollegeSettings = async (newPrivacy: 'Everyone' | 'Connected' | 'Nobody') => {
    try {
      setSaving(true);
      const res = await api.put<any>('/colleges/profile', {
        messagePrivacy: newPrivacy,
      });
      if (res.success && res.college) {
        if (updateCollegeProfileLocal) updateCollegeProfileLocal(res.college);
        showSuccessFeedback('Collegiate messaging privacy updated.');
      }
    } catch (err: any) {
      console.error('Failed to update college settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Apply and persist theme
  const handleSelectTheme = async (mode: ThemeMode) => {
    setTheme(mode);
    try {
      if (isStudent) {
        await api.put('/students/profile', { themePreference: mode });
      }
      showSuccessFeedback(
        `Theme updated to ${
          mode === 'neutral-slate'
            ? 'Neutral Slate (Dark)'
            : mode === 'classic-blue'
            ? 'Classic Blue (Light)'
            : 'System Default'
        }.`
      );
    } catch {
      // Local storage persistence already handled by ThemeContext
    }
  };

  // --- Change Password Handler (Requirement 11) ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.post<any>('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        setPasswordSuccess('Password changed successfully! Keep your credentials safe.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.message || 'Failed to update password.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'An error occurred while updating password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // --- Forgot Password: Request OTP (Requirement 12) ---
  const handleRequestForgotOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid registered email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.post<any>('/auth/forgot-password/request-otp', {
        email: forgotEmail.trim(),
      });

      if (res.success) {
        setForgotStep(2);
        setForgotSuccess(res.message || 'Password reset verification code dispatched to your email.');
        setForgotCooldown(60);
        const timer = setInterval(() => {
          setForgotCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setForgotError(res.message || 'Failed to send reset code.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Error requesting reset code.');
    } finally {
      setForgotLoading(false);
    }
  };

  // --- Forgot Password: Reset with OTP (Requirement 12) ---
  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.post<any>('/auth/forgot-password/reset', {
        email: forgotEmail.trim(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword,
        confirmPassword: forgotConfirmPassword,
      });

      if (res.success) {
        setForgotSuccess('Password reset successfully! You can now authenticate with your new password.');
        setForgotStep(1);
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
      } else {
        setForgotError(res.message || 'Failed to reset password. Please check your verification code.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Error resetting password.');
    } finally {
      setForgotLoading(false);
    }
  };

  // --- Multi-Factor Authentication: Request Enable OTP (Requirement 13) ---
  const handleRequestEnableMfa = async () => {
    setMfaError(null);
    setMfaSuccess(null);
    setMfaLoading(true);

    try {
      const res = await api.post<any>('/auth/mfa/enable/request-otp', {});
      if (res.success) {
        setMfaSetupStep('otp_sent');
        setMfaSuccess('A 6-digit confirmation code was dispatched to your email.');
      } else {
        setMfaError(res.message || 'Failed to initiate MFA setup.');
      }
    } catch (err: any) {
      setMfaError(err.message || 'Error initiating MFA setup.');
    } finally {
      setMfaLoading(false);
    }
  };

  // --- Multi-Factor Authentication: Verify and Activate (Requirement 13) ---
  const handleVerifyEnableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);
    setMfaSuccess(null);

    if (!mfaOtp || mfaOtp.trim().length !== 6) {
      setMfaError('Please enter the 6-digit verification code.');
      return;
    }

    setMfaLoading(true);
    try {
      const res = await api.post<any>('/auth/mfa/enable/verify', { otp: mfaOtp.trim() });
      if (res.success) {
        setMfaEnabledState(true);
        setMfaSetupStep('idle');
        setMfaOtp('');
        setMfaSuccess('Multi-Factor Authentication is now enabled for your account!');
        if (refreshProfile) refreshProfile();
      } else {
        setMfaError(res.message || 'Invalid verification code.');
      }
    } catch (err: any) {
      setMfaError(err.message || 'Error confirming MFA code.');
    } finally {
      setMfaLoading(false);
    }
  };

  // --- Multi-Factor Authentication: Disable (Requirement 13) ---
  const handleDisableMfa = async () => {
    setMfaError(null);
    setMfaSuccess(null);
    setMfaLoading(true);

    try {
      const res = await api.post<any>('/auth/mfa/disable', {});
      if (res.success) {
        setMfaEnabledState(false);
        setMfaSetupStep('idle');
        setMfaSuccess('Multi-Factor Authentication has been disabled.');
        if (refreshProfile) refreshProfile();
      } else {
        setMfaError(res.message || 'Failed to disable MFA.');
      }
    } catch (err: any) {
      setMfaError(err.message || 'Error disabling MFA.');
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Settings Top Header */}
      <div className="border-b border-[var(--border-color)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Preferences & Settings
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Configure privacy boundaries, notifications, credentials, and appearance
          </p>
        </div>

        {savedMessage && (
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5 self-start sm:self-auto animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" /> {savedMessage}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar (Consolidated per Requirement 9 & 10) */}
        <div className="md:col-span-1 space-y-1">
          {[
            { id: 'account', label: 'Account', icon: User, desc: 'Identity & Switcher' },
            { id: 'privacy', label: 'Privacy', icon: Globe, desc: 'Profile, Messages & Groups' },
            { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts & Reminders' },
            { id: 'security', label: 'Security & Credentials', icon: Shield, desc: 'Passwords, MFA & PIN' },
            { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Light & Dark Themes' },
          ].map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 cursor-pointer ${
                  isCurrent
                    ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                    : 'bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isCurrent ? 'text-[var(--primary-text)]' : 'text-[var(--primary-color)]'
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate leading-tight">{item.label}</p>
                  <p
                    className={`text-[10px] truncate ${
                      isCurrent ? 'opacity-80' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {item.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Pane */}
        <div className="md:col-span-3 space-y-6">
          {/* 1. ACCOUNT SECTION */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                  <User className="w-5 h-5 text-[var(--primary-color)]" />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">User Identity & Account</h2>
                    <p className="text-xs text-[var(--text-muted)]">Current authenticated profile details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                      Full Name
                    </span>
                    <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{user?.fullName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                      Email Address
                    </span>
                    <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{user?.email}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                      Account Role
                    </span>
                    <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{user?.role}</p>
                  </div>
                  {isStudent && studentProfile?.collegeName && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                        Affiliated College
                      </span>
                      <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                        {studentProfile.collegeName}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Switch Helper */}
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Quick Switch Identity</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Instant seamless role transition between student and collegiate super admin
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => switchAccount('student')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      user?.email === 'sureshmanikkavasagam123@gmail.com'
                        ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20'
                        : 'border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                        <User className="w-4 h-4 text-[var(--primary-color)]" /> Suresh
                      </div>
                      {user?.email === 'sureshmanikkavasagam123@gmail.com' && (
                        <Check className="w-4 h-4 text-[var(--primary-color)]" />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      sureshmanikkavasagam123@gmail.com
                    </p>
                    <span className="text-[10px] font-bold text-[var(--primary-color)] mt-2 inline-block">
                      Verified Student Profile
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => switchAccount('college-super')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      user?.role === 'College Super Admin'
                        ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20'
                        : 'border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                        <Building2 className="w-4 h-4 text-blue-600" /> Apex Tech Admin
                      </div>
                      {user?.role === 'College Super Admin' && (
                        <Check className="w-4 h-4 text-[var(--primary-color)]" />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">admin@apextech.edu</p>
                    <span className="text-[10px] font-bold text-blue-600 mt-2 inline-block">
                      College Super Admin
                    </span>
                  </button>
                </div>
              </div>

              {/* Sign Out */}
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-600">Terminate Current Session</h4>
                  <p className="text-[11px] text-[var(--text-muted)]">Sign out of EVENTHUB on this device.</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          )}

          {/* 2. CONSOLIDATED PRIVACY SECTION (Requirement 9) */}
          {activeTab === 'privacy' && (
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Privacy Preferences</h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      Control visibility of your profile, inbound messages, and group invitations in one unified place
                    </p>
                  </div>
                </div>
                {saving && <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-color)]" />}
              </div>

              {/* A. Profile Privacy */}
              {isStudent && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-500" /> Profile Privacy
                    </label>
                    <p className="text-[11px] text-[var(--text-muted)] mb-2.5">
                      Specify who can discover and view your student profile and accomplishments.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          id: 'Everyone',
                          title: 'Everyone',
                          desc: 'Public visitors and all EVENTHUB members can view your profile.',
                        },
                        {
                          id: 'EVENTHUB users',
                          title: 'EVENTHUB Users',
                          desc: 'Only authenticated, signed-in students and colleges can view.',
                        },
                        {
                          id: 'Connections only',
                          title: 'Connections Only',
                          desc: 'Only mutual student connections can view detailed information.',
                        },
                        {
                          id: 'Private',
                          title: 'Private',
                          desc: 'Hidden profile. Sensitive details and accomplishments remain private.',
                        },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            const val = opt.id as any;
                            setProfileVisibility(val);
                            handleSaveStudentSettings({ profileVisibility: val });
                          }}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            profileVisibility === opt.id
                              ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20'
                              : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-primary)]">{opt.title}</span>
                            {profileVisibility === opt.id && (
                              <Check className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-1">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* B. Message Privacy */}
                  <div className="pt-4 border-t border-[var(--border-color)]">
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-500" /> Message Privacy
                    </label>
                    <p className="text-[11px] text-[var(--text-muted)] mb-2.5">
                      Control who is permitted to initiate direct chat conversations with you.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          id: 'Everyone',
                          title: 'Everyone',
                          desc: 'Any student or collegiate representative can message you.',
                        },
                        {
                          id: 'Connections only',
                          title: 'Connections Only',
                          desc: 'Only mutual student connections can start direct conversations.',
                        },
                        {
                          id: 'Same college only',
                          title: 'Same College Only',
                          desc: 'Restricts direct messaging exclusively to peers and faculty from your institution.',
                        },
                        {
                          id: 'Nobody',
                          title: 'Nobody',
                          desc: 'Blocks all incoming direct messages.',
                        },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            const val = opt.id as any;
                            setMessagePrivacy(val);
                            handleSaveStudentSettings({ messagePrivacy: val });
                          }}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            messagePrivacy === opt.id
                              ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20'
                              : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-primary)]">{opt.title}</span>
                            {messagePrivacy === opt.id && (
                              <Check className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-1">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* C. Group Add Privacy */}
                  <div className="pt-4 border-t border-[var(--border-color)]">
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-500" /> Group Add Privacy
                    </label>
                    <p className="text-[11px] text-[var(--text-muted)] mb-2.5">
                      Specify who can directly add you to squads and group chats without prior invitation approval.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        {
                          id: 'Everyone',
                          title: 'Everyone',
                          desc: 'Any student or event organizer can add you to collaborative groups.',
                        },
                        {
                          id: 'Connections only',
                          title: 'Connections Only',
                          desc: 'Only mutual student connections can add you to groups directly.',
                        },
                        {
                          id: 'Same college only',
                          title: 'Same College Only',
                          desc: 'Only peers and faculty from your institution can add you.',
                        },
                        {
                          id: 'Nobody / request only',
                          title: 'Nobody / Request Only',
                          desc: 'Disables direct adds; requires explicit invitation approval.',
                        },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            const val = opt.id as any;
                            setGroupAddPrivacy(val);
                            handleSaveStudentSettings({ groupAddPrivacy: val });
                          }}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            groupAddPrivacy === opt.id
                              ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20'
                              : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-primary)]">{opt.title}</span>
                            {groupAddPrivacy === opt.id && (
                              <Check className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-1">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* College Message Privacy */}
              {isCollege && (
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-500" /> Collegiate Workspace Inbox Policy
                  </label>
                  <p className="text-[11px] text-[var(--text-muted)] mb-2.5">
                    Control which users can initiate direct correspondence with this official collegiate desk.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: 'Everyone',
                        title: 'Everyone',
                        desc: 'All registered students and partner colleges can initiate inquiries.',
                      },
                      {
                        id: 'Connected',
                        title: 'Connected Only',
                        desc: 'Only students enrolled or connected with your college can message.',
                      },
                      {
                        id: 'Nobody',
                        title: 'Nobody',
                        desc: 'Temporarily disable incoming direct inquiries.',
                      },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          const val = opt.id as any;
                          setCollegeMessagePrivacy(val);
                          handleSaveCollegeSettings(val);
                        }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          collegeMessagePrivacy === opt.id
                            ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20'
                            : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{opt.title}</span>
                          {collegeMessagePrivacy === opt.id && (
                            <Check className="w-4 h-4 text-[var(--primary-color)]" />
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. NOTIFICATIONS SECTION */}
          {activeTab === 'notifications' && (
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Notification Preferences</h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      Manage email notifications and real-time alert delivery
                    </p>
                  </div>
                </div>
                {saving && <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-color)]" />}
              </div>

              <div className="space-y-4 divide-y divide-[var(--border-color)]">
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">Email Notifications</h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Receive registration tickets, certificate issuances, and official invitations via email.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => {
                      setEmailAlerts(e.target.checked);
                      handleSaveStudentSettings({ emailAlerts: e.target.checked });
                    }}
                    className="w-4 h-4 rounded text-[var(--primary-color)] focus:ring-[var(--primary-color)] cursor-pointer"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">In-App Alerts</h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Show badges and real-time alerts in the top notification bell.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={inAppAlerts}
                    onChange={(e) => {
                      setInAppAlerts(e.target.checked);
                      handleSaveStudentSettings({ inAppAlerts: e.target.checked });
                    }}
                    className="w-4 h-4 rounded text-[var(--primary-color)] focus:ring-[var(--primary-color)] cursor-pointer"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">Event Schedule Reminders</h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Receive automated countdown reminders 24h and 1h prior to event commencement.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={eventReminders}
                    onChange={(e) => {
                      setEventReminders(e.target.checked);
                      handleSaveStudentSettings({ eventReminders: e.target.checked });
                    }}
                    className="w-4 h-4 rounded text-[var(--primary-color)] focus:ring-[var(--primary-color)] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. DEDICATED SECURITY & CREDENTIALS SECTION (Requirements 10, 11, 12, 13, 14) */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Section Header */}
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)]">
                      Security & Credentials
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Manage password changes, OTP email recovery, two-factor authentication, and administrative PIN
                    </p>
                  </div>
                </div>
              </div>

              {/* Function 1: Change Password (Requirement 11) */}
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                  <Lock className="w-4 h-4 text-blue-500" />
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Change Account Password</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Update your account password with standard cryptographic hashing
                    </p>
                  </div>
                </div>

                {passwordSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> {passwordSuccess}
                  </div>
                )}

                {passwordError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {passwordError}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3 max-w-xl">
                  {/* Current Password */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      Current Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full pl-3 pr-10 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                        New Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full pl-3 pr-10 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                        Confirm New Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full pl-3 pr-10 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </form>
              </div>

              {/* Function 2: Forgot Password / OTP Recovery (Requirement 12) */}
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                  <Mail className="w-4 h-4 text-amber-500" />
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Password Reset & OTP Recovery
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Recover account access with single-use, rate-limited email verification codes
                    </p>
                  </div>
                </div>

                {forgotSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> {forgotSuccess}
                  </div>
                )}

                {forgotError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {forgotError}
                  </div>
                )}

                {forgotStep === 1 ? (
                  <form onSubmit={handleRequestForgotOtp} className="space-y-3 max-w-xl">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                        Registered Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="your-account@domain.edu"
                        className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading || forgotCooldown > 0}
                      className="px-5 py-2 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                        </>
                      ) : forgotCooldown > 0 ? (
                        `Wait ${forgotCooldown}s`
                      ) : (
                        <>
                          Request Reset Code <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPasswordWithOtp} className="space-y-3 max-w-xl">
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
                      Enter the 6-digit code dispatched to <strong>{forgotEmail}</strong> and your new password.
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                        6-Digit Verification Code *
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-40 tracking-widest text-center font-mono font-bold p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                          New Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                          Confirm New Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {forgotLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Resetting...
                          </>
                        ) : (
                          'Verify & Save New Password'
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setForgotStep(1)}
                        className="px-3 py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        Change Email
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Function 3: Multi-Factor Authentication (Requirement 13) */}
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        Multi-Factor Authentication (MFA)
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        Require a secondary 6-digit email confirmation code when logging in
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                      mfaEnabledState
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                        : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                    }`}
                  >
                    {mfaEnabledState ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" /> Enabled
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5" /> Disabled
                      </>
                    )}
                  </span>
                </div>

                {mfaSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> {mfaSuccess}
                  </div>
                )}

                {mfaError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {mfaError}
                  </div>
                )}

                {!mfaEnabledState ? (
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--text-muted)]">
                      When Multi-Factor Authentication is active, signing in from any device will require verifying
                      a secure 6-digit code dispatched to your registered email address ({user?.email}).
                    </p>

                    {mfaSetupStep === 'idle' ? (
                      <button
                        type="button"
                        onClick={handleRequestEnableMfa}
                        disabled={mfaLoading}
                        className="px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        {mfaLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Initiating...
                          </>
                        ) : (
                          'Enable Multi-Factor Authentication'
                        )}
                      </button>
                    ) : (
                      <form onSubmit={handleVerifyEnableMfa} className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3 max-w-md">
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">
                          Enter Confirmation Code
                        </h4>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          We sent a 6-digit code to <strong>{user?.email}</strong>. Enter it below to activate MFA.
                        </p>

                        <input
                          type="text"
                          maxLength={6}
                          required
                          value={mfaOtp}
                          onChange={(e) => setMfaOtp(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          className="w-36 tracking-widest text-center font-mono font-bold p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                        />

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="submit"
                            disabled={mfaLoading}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                          >
                            {mfaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm & Enable'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setMfaSetupStep('idle')}
                            className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[var(--text-muted)]">
                      Your account is currently protected with secondary email verification.
                    </p>
                    <button
                      type="button"
                      onClick={handleDisableMfa}
                      disabled={mfaLoading}
                      className="px-4 py-2 rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                    >
                      {mfaLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Disabling...
                        </>
                      ) : (
                        'Disable Multi-Factor Authentication'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Function 4: College Account Security & 4-Digit Admin Access PIN (Requirement 14) */}
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                  <KeyRound className="w-4 h-4 text-blue-500" />
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      4-Digit Admin Access PIN
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Administrative protection for college workspaces, attendee check-in desks, and credential issuance
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">
                      Administrative PIN Security Desk
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Used by College Super Admins and delegated staff to authorize sensitive operations.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold shrink-0 cursor-pointer shadow-xs active:scale-95"
                  >
                    Manage / Reset PIN
                  </button>
                </div>

                <div className="text-[11px] text-[var(--text-muted)] space-y-1">
                  <p>• PIN hashes are stored using standard bcrypt encryption with automatic brute-force throttling (5-attempt lockout).</p>
                  <p>• Recovery of lost administrative PINs is enforced via registered college email OTP verification.</p>
                </div>
              </div>
            </div>
          )}

          {/* 5. APPEARANCE SECTION */}
          {activeTab === 'appearance' && (
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-[var(--primary-color)]" />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Theme & Appearance</h2>
                    <p className="text-xs text-[var(--text-muted)]">Select your preferred viewing theme</p>
                  </div>
                </div>

                {/* Quick Dark Toggle */}
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isDark ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-400" /> Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-indigo-500" /> Dark Mode
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {THEME_OPTIONS.map((t) => {
                  const isSelected =
                    currentTheme === t.id ||
                    (t.id === 'classic-blue' && currentTheme === 'light') ||
                    (t.id === 'neutral-slate' && currentTheme === 'dark');

                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTheme(t.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20 shadow-xs'
                          : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: t.accentColor }}
                          />
                          <span className="text-xs font-bold text-[var(--text-primary)]">{t.label}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[var(--primary-color)]" />}
                      </div>

                      <div
                        className={`h-10 rounded-lg border border-[var(--border-color)] flex items-center justify-center text-[11px] font-bold ${
                          t.id === 'neutral-slate' ? 'text-slate-200' : 'text-slate-800'
                        }`}
                        style={{ backgroundColor: t.bgPreview }}
                      >
                        Preview Theme
                      </div>

                      <p className="text-[11px] text-[var(--text-muted)] leading-tight">{t.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin PIN Management Modal */}
      {isPinModalOpen && (
        <AdminPinModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={() => {
            setIsPinModalOpen(false);
            showSuccessFeedback('Admin PIN validated successfully.');
          }}
          collegeName={college?.name || 'College Workspace'}
        />
      )}
    </div>
  );
};

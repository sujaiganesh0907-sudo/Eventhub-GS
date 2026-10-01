import React, { useState } from 'react';
import { useTheme, ThemeMode } from '../context/ThemeContext';
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
} from 'lucide-react';

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
    updateStudentProfileLocal,
    updateCollegeProfileLocal,
  } = useAuth();

  // Message privacy state
  const [studentMessagePrivacy, setStudentMessagePrivacy] = useState<'Everyone' | 'Following' | 'Connections' | 'Nobody'>(
    studentProfile?.messagePrivacy || 'Everyone'
  );
  const [studentProfileVisibility, setStudentProfileVisibility] = useState<'Public' | 'Private'>(
    studentProfile?.profileVisibility || 'Public'
  );

  const [collegeMessagePrivacy, setCollegeMessagePrivacy] = useState<'Everyone' | 'Connected' | 'Nobody'>(
    college?.messagePrivacy || 'Everyone'
  );

  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const themes: { id: ThemeMode; name: string; color: string; desc: string }[] = [
    { id: 'classic-blue', name: 'Classic Blue', color: '#2563eb', desc: 'Default academic navy & cobalt' },
    { id: 'midnight', name: 'Midnight', color: '#1e3a8a', desc: 'Deep ocean midnight aesthetic' },
    { id: 'emerald', name: 'Emerald Green', color: '#059669', desc: 'Emerald green campus vibe' },
    { id: 'violet', name: 'Royal Violet', color: '#7c3aed', desc: 'Distinctive collegiate amethyst' },
    { id: 'ocean', name: 'Ocean Cyan', color: '#0284c7', desc: 'Vibrant azure ocean tint' },
    { id: 'neutral', name: 'Neutral Slate', color: '#475569', desc: 'High-contrast monochrome minimal' },
  ];

  // Save student privacy changes
  const handleSaveStudentPrivacy = async (
    newVisibility?: 'Public' | 'Private',
    newMsgPrivacy?: 'Everyone' | 'Following' | 'Connections' | 'Nobody'
  ) => {
    const visibility = newVisibility || studentProfileVisibility;
    const msgPrivacy = newMsgPrivacy || studentMessagePrivacy;

    try {
      setSavingPrivacy(true);
      const res = await api.put<any>('/students/profile', {
        profileVisibility: visibility,
        messagePrivacy: msgPrivacy,
      });
      if (res.success && (res.student || res.profile)) {
        const updated = res.student || res.profile;
        if (updateStudentProfileLocal) updateStudentProfileLocal(updated);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to update student privacy settings:', err);
    } finally {
      setSavingPrivacy(false);
    }
  };

  // Save college privacy changes
  const handleSaveCollegePrivacy = async (newPrivacy: 'Everyone' | 'Connected' | 'Nobody') => {
    try {
      setSavingPrivacy(true);
      const res = await api.put<any>('/colleges/profile', {
        messagePrivacy: newPrivacy,
      });
      if (res.success && res.college) {
        if (updateCollegeProfileLocal) updateCollegeProfileLocal(res.college);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to update college privacy settings:', err);
    } finally {
      setSavingPrivacy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Preferences & Settings
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Privacy controls, messaging settings, themes, and collegiate preferences
          </p>
        </div>

        {savedSuccess && (
          <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5 self-start sm:self-auto animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" /> Settings Saved!
          </span>
        )}
      </div>

      {/* SECTION 1: Message & Profile Privacy Controls (Requirement 7 & 16) */}
      <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--primary-color)]" />
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Messaging & Profile Privacy</h2>
              <p className="text-xs text-[var(--text-muted)]">Control who can message you and view your account information</p>
            </div>
          </div>
          {savingPrivacy && <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-color)]" />}
        </div>

        {/* Student Privacy Settings */}
        {isStudent && (
          <div className="space-y-6 pt-2">
            {/* Profile Visibility */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-500" />
                Profile Visibility
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStudentProfileVisibility('Public');
                    handleSaveStudentPrivacy('Public', undefined);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    studentProfileVisibility === 'Public'
                      ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20'
                      : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Public Profile</span>
                    {studentProfileVisibility === 'Public' && <Check className="w-4 h-4 text-[var(--primary-color)]" />}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Other students and colleges can view your public credentials, skills, and follow you.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStudentProfileVisibility('Private');
                    handleSaveStudentPrivacy('Private', undefined);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    studentProfileVisibility === 'Private'
                      ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20'
                      : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Private Profile</span>
                    {studentProfileVisibility === 'Private' && <Check className="w-4 h-4 text-[var(--primary-color)]" />}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Sensitive profile content is hidden. Only followers you approve can see detailed information.
                  </p>
                </button>
              </div>
            </div>

            {/* Who Can Message Me */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-indigo-500" />
                Who can message me
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { id: 'Everyone', title: 'Everyone', desc: 'Anyone on EVENTHUB can message you' },
                  { id: 'Following', title: 'People I follow', desc: 'Only students you follow can message you' },
                  { id: 'Connections', title: 'Connections', desc: 'Only mutual student connections' },
                  { id: 'Nobody', title: 'Nobody', desc: 'Disable incoming direct messages' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      const val = opt.id as any;
                      setStudentMessagePrivacy(val);
                      handleSaveStudentPrivacy(undefined, val);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      studentMessagePrivacy === opt.id
                        ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20'
                        : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">{opt.title}</span>
                      {studentMessagePrivacy === opt.id && <Check className="w-3.5 h-3.5 text-[var(--primary-color)]" />}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* College Privacy Settings */}
        {isCollege && (
          <div className="space-y-4 pt-2">
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-500" />
              Incoming Collegiate Messages
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'Everyone', title: 'Everyone', desc: 'Any student or institution can message this college' },
                { id: 'Connected', title: 'Connected Only', desc: 'Only students connected to your college can message' },
                { id: 'Nobody', title: 'Nobody', desc: 'Disable incoming direct messages for this college' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const val = opt.id as any;
                    setCollegeMessagePrivacy(val);
                    handleSaveCollegePrivacy(val);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    collegeMessagePrivacy === opt.id
                      ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20'
                      : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{opt.title}</span>
                    {collegeMessagePrivacy === opt.id && <Check className="w-4 h-4 text-[var(--primary-color)]" />}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Theme Personalization */}
      <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-[var(--primary-color)]" />
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Theme & Appearance</h2>
              <p className="text-xs text-[var(--text-muted)]">Light mode, dark mode, and collegiate color palettes</p>
            </div>
          </div>

          {/* Dark / Light Toggle */}
          <button
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {themes.map((t) => {
            const isSelected = currentTheme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20 shadow-xs'
                    : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-xs font-bold text-[var(--text-primary)]">{t.name}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[var(--primary-color)]" />}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-tight">{t.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Fast Demo Switcher for Evaluation */}
      <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-500" />
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Interactive Demo Role Switcher
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Quickly switch between Student, College Super Admin, and College Staff views
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => switchAccount('student')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              isStudent
                ? 'border-[var(--primary-color)] bg-[var(--primary-light)]'
                : 'border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
              <User className="w-4 h-4 text-[var(--primary-color)]" /> Alex Chen
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Student / Participant</p>
          </button>

          <button
            onClick={() => switchAccount('college-super')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              user?.role === 'College Super Admin'
                ? 'border-[var(--primary-color)] bg-[var(--primary-light)]'
                : 'border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
              <Building2 className="w-4 h-4 text-blue-600" /> Dr. Arthur Vance
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">College Super Admin</p>
          </button>
        </div>
      </div>

      {/* SECTION 4: Current Session */}
      <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Signed in as</span>
          <p className="text-sm font-bold text-[var(--text-primary)]">{user?.fullName} ({user?.email})</p>
          <p className="text-xs text-[var(--text-muted)]">Role: {user?.role}</p>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl border border-red-500/20 text-red-600 hover:bg-red-500/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
};

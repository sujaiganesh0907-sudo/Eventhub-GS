import React from 'react';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
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
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentTheme, setTheme, isDark, toggleDarkMode } = useTheme();
  const { user, isCollege, isStudent, switchAccount, logout } = useAuth();

  const themes: { id: ThemeMode; name: string; color: string; desc: string }[] = [
    { id: 'classic-blue', name: 'Classic Blue', color: '#2563eb', desc: 'Default academic navy & cobalt' },
    { id: 'midnight', name: 'Midnight', color: '#1e3a8a', desc: 'Deep ocean midnight aesthetic' },
    { id: 'emerald', name: 'Emerald Green', color: '#059669', desc: 'Emerald green campus vibe' },
    { id: 'violet', name: 'Royal Violet', color: '#7c3aed', desc: 'Distinctive collegiate amethyst' },
    { id: 'ocean', name: 'Ocean Cyan', color: '#0284c7', desc: 'Vibrant azure ocean tint' },
    { id: 'neutral', name: 'Neutral Slate', color: '#475569', desc: 'High-contrast monochrome minimal' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] pb-4">
        <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
          System Preferences & Account
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Theme customization, account switches, and collegiate settings
        </p>
      </div>

      {/* SECTION 1: Theme Personalization */}
      <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-[var(--primary-color)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">Theme Palette</h2>
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

      {/* SECTION 2: Fast Demo Switcher for Evaluation */}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
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

          <button
            onClick={() => switchAccount('college-admin')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              user?.role === 'College Admin'
                ? 'border-[var(--primary-color)] bg-[var(--primary-light)]'
                : 'border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
              <Shield className="w-4 h-4 text-indigo-600" /> Marcus Brody
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Staff Event Coordinator</p>
          </button>
        </div>
      </div>

      {/* SECTION 3: Current Session */}
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

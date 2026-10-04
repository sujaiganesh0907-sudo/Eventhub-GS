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
  FileText,
  Users,
  Bell,
  KeyRound,
  ShieldAlert,
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
    updateStudentProfileLocal,
    updateCollegeProfileLocal,
  } = useAuth();

  // Active sub-navigation tab in Settings
  const [activeTab, setActiveTab] = useState<
    'account' | 'privacy' | 'messaging' | 'notifications' | 'group' | 'security' | 'appearance'
  >('account');

  // Privacy states (Requirements 6, 7, 8, 9)
  const [profileVisibility, setProfileVisibility] = useState<
    'Everyone' | 'EVENTHUB users' | 'Connections only' | 'Private'
  >((studentProfile?.profileVisibility as any) || 'Everyone');

  const [resumePrivacy, setResumePrivacy] = useState<
    'Everyone' | 'Connections' | 'Colleges only' | 'Private'
  >(studentProfile?.resumePrivacy || 'Colleges only');

  const [messagePrivacy, setMessagePrivacy] = useState<
    'Everyone' | 'Connections only' | 'Same college only' | 'Nobody'
  >((studentProfile?.messagePrivacy as any) || 'Everyone');

  const [groupAddPrivacy, setGroupAddPrivacy] = useState<
    'Everyone' | 'Connections only' | 'Same college only' | 'Nobody / request only'
  >(studentProfile?.groupAddPrivacy || 'Everyone');

  // Notification preferences
  const [emailAlerts, setEmailAlerts] = useState<boolean>(true);
  const [inAppAlerts, setInAppAlerts] = useState<boolean>(true);
  const [eventReminders, setEventReminders] = useState<boolean>(true);

  // College specific privacy
  const [collegeMessagePrivacy, setCollegeMessagePrivacy] = useState<'Everyone' | 'Connected' | 'Nobody'>(
    college?.messagePrivacy || 'Everyone'
  );

  // Saving state & feedback
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const showSuccessFeedback = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3000);
  };

  // Save student profile privacy updates
  const handleSaveStudentSettings = async (overrides?: any) => {
    try {
      setSaving(true);
      const payload = {
        profileVisibility: overrides?.profileVisibility || profileVisibility,
        messagePrivacy: overrides?.messagePrivacy || messagePrivacy,
        resumePrivacy: overrides?.resumePrivacy || resumePrivacy,
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
        showSuccessFeedback('Privacy and account preferences saved successfully.');
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
      showSuccessFeedback(`Theme updated to ${mode === 'neutral-slate' ? 'Neutral Slate (Dark)' : mode === 'classic-blue' ? 'Classic Blue (Light)' : 'System Default'}.`);
    } catch {
      // Local storage persistence already handled by ThemeContext
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
            Configure privacy boundaries, messaging filters, appearance, notifications, and security
          </p>
        </div>

        {savedMessage && (
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5 self-start sm:self-auto animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" /> {savedMessage}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar (Section 5) */}
        <div className="md:col-span-1 space-y-1">
          {[
            { id: 'account', label: 'Account', icon: User, desc: 'Identity & Switcher' },
            { id: 'privacy', label: 'Privacy', icon: Globe, desc: 'Profile & Resume' },
            { id: 'messaging', label: 'Messaging', icon: MessageSquare, desc: 'Who can message me' },
            { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts & Reminders' },
            { id: 'group', label: 'Group Privacy', icon: Users, desc: 'Group Add Permissions' },
            { id: 'security', label: 'Security', icon: Shield, desc: '4-Digit PIN & Session' },
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
                <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[var(--primary-text)]' : 'text-[var(--primary-color)]'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate leading-tight">{item.label}</p>
                  <p className={`text-[10px] truncate ${isCurrent ? 'opacity-80' : 'text-[var(--text-muted)]'}`}>
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
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Full Name</span>
                    <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{user?.fullName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Email Address</span>
                    <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{user?.email}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Account Role</span>
                    <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{user?.role}</p>
                  </div>
                  {isStudent && studentProfile?.collegeName && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Affiliated College</span>
                      <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{studentProfile.collegeName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Switch Helper (Requirement 1) */}
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Quick Switch Account</h2>
                    <p className="text-xs text-[var(--text-muted)]">
                      Instant evaluation switch between Suresh Student and Apex College Super Admin
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
                      {user?.email === 'sureshmanikkavasagam123@gmail.com' && <Check className="w-4 h-4 text-[var(--primary-color)]" />}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">sureshmanikkavasagam123@gmail.com</p>
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
                      {user?.role === 'College Super Admin' && <Check className="w-4 h-4 text-[var(--primary-color)]" />}
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

          {/* 2. PRIVACY SECTION (Profile & Resume) */}
          {activeTab === 'privacy' && (
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Profile & Resume Privacy</h2>
                    <p className="text-xs text-[var(--text-muted)]">Control visibility of personal portfolio, bio, and resume</p>
                  </div>
                </div>
                {saving && <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-color)]" />}
              </div>

              {isStudent && (
                <div className="space-y-6">
                  {/* Who can view my profile (Requirement 7) */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-2">
                      Who can view my profile?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'Everyone', title: 'Everyone', desc: 'Public visitors and all EVENTHUB members can view your profile.' },
                        { id: 'EVENTHUB users', title: 'EVENTHUB Users', desc: 'Only authenticated, signed-in students and colleges can view.' },
                        { id: 'Connections only', title: 'Connections Only', desc: 'Only mutual student connections can view detailed information.' },
                        { id: 'Private', title: 'Private', desc: 'Hidden profile. Sensitive details and accomplishments remain private.' },
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
                            {profileVisibility === opt.id && <Check className="w-3.5 h-3.5 text-[var(--primary-color)]" />}
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-1">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Who can view my resume (Requirement 8) */}
                  <div className="pt-4 border-t border-[var(--border-color)]">
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      Who can view my resume?
                    </label>
                    <p className="text-[11px] text-[var(--text-muted)] mb-3">
                      Configure permissions for collegiate recruiters and student connections. (Resume attachment UI integration activates in Part 2).
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      {[
                        { id: 'Everyone', title: 'Everyone', desc: 'Open to recruiters, students, and visitors' },
                        { id: 'Connections', title: 'Connections', desc: 'Only mutual connections' },
                        { id: 'Colleges only', title: 'Colleges Only', desc: 'Only verified collegiate recruitment desks' },
                        { id: 'Private', title: 'Private', desc: 'No one can view or download resume' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            const val = opt.id as any;
                            setResumePrivacy(val);
                            handleSaveStudentSettings({ resumePrivacy: val });
                          }}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            resumePrivacy === opt.id
                              ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20'
                              : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--text-primary)]">{opt.title}</span>
                            {resumePrivacy === opt.id && <Check className="w-3.5 h-3.5 text-[var(--primary-color)]" />}
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. MESSAGING SECTION (Requirement 6) */}
          {activeTab === 'messaging' && (
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[var(--primary-color)]" />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Messaging Privacy</h2>
                    <p className="text-xs text-[var(--text-muted)]">Control inbound direct messages and inquiry requests</p>
                  </div>
                </div>
                {saving && <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-color)]" />}
              </div>

              {isStudent && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-indigo-500" />
                    Who can message me?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'Everyone', title: 'Everyone', desc: 'Any student, educator, or collegiate representative on EVENTHUB can message you.' },
                      { id: 'Connections only', title: 'Connections Only', desc: 'Only mutual student connections can start direct conversations.' },
                      { id: 'Same college only', title: 'Same College Only', desc: 'Restricts direct messaging exclusively to peers and faculty from your institution.' },
                      { id: 'Nobody', title: 'Nobody', desc: 'Blocks all incoming direct messages. Conversation creation is disabled.' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          const val = opt.id as any;
                          setMessagePrivacy(val);
                          handleSaveStudentSettings({ messagePrivacy: val });
                        }}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          messagePrivacy === opt.id
                            ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20'
                            : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{opt.title}</span>
                          {messagePrivacy === opt.id && <Check className="w-3.5 h-3.5 text-[var(--primary-color)]" />}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isCollege && (
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    Collegiate Workspace Inbox Policy
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'Everyone', title: 'Everyone', desc: 'All registered students and partner colleges can initiate inquiries.' },
                      { id: 'Connected', title: 'Connected Only', desc: 'Only students enrolled or connected with your college can message.' },
                      { id: 'Nobody', title: 'Nobody', desc: 'Temporarily disable incoming direct inquiries.' },
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
                          {collegeMessagePrivacy === opt.id && <Check className="w-4 h-4 text-[var(--primary-color)]" />}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. NOTIFICATIONS SECTION */}
          {activeTab === 'notifications' && (
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Notification Preferences</h2>
                    <p className="text-xs text-[var(--text-muted)]">Manage email notifications and real-time alert delivery</p>
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

          {/* 5. GROUP PRIVACY SECTION (Requirement 9) */}
          {activeTab === 'group' && (
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Group Privacy Settings</h2>
                    <p className="text-xs text-[var(--text-muted)]">Control who can add you to collaborative group chats and project squads</p>
                  </div>
                </div>
                {saving && <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-color)]" />}
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-2">
                  Who can add me to a group?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'Everyone', title: 'Everyone', desc: 'Any student or event organizer can add you to project teams and study groups.' },
                    { id: 'Connections only', title: 'Connections Only', desc: 'Only mutual student connections can add you to groups directly.' },
                    { id: 'Same college only', title: 'Same College Only', desc: 'Only students and faculty from your institution can add you.' },
                    { id: 'Nobody / request only', title: 'Nobody / Request Only', desc: 'Disables direct adds; requires explicit invitation approval.' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const val = opt.id as any;
                        setGroupAddPrivacy(val);
                        handleSaveStudentSettings({ groupAddPrivacy: val });
                      }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        groupAddPrivacy === opt.id
                          ? 'border-[var(--primary-color)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-color)]/20'
                          : 'border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{opt.title}</span>
                        {groupAddPrivacy === opt.id && <Check className="w-3.5 h-3.5 text-[var(--primary-color)]" />}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. SECURITY SECTION */}
          {activeTab === 'security' && (
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Security & Credentials</h2>
                    <p className="text-xs text-[var(--text-muted)]">Protect sensitive admin access and identity verification</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-blue-500" />
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">4-Digit Admin Access PIN</h4>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Required for unlocking delegated College Workspace administration desks and pass scanners.
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

                <div className="text-xs text-[var(--text-muted)] space-y-1">
                  <p>• PIN entries are protected by bcrypt encryption with automatic brute-force throttling (5-attempt ceiling).</p>
                  <p>• Account recovery is secured by email OTP verification.</p>
                </div>
              </div>
            </div>
          )}

          {/* 7. APPEARANCE SECTION (Simplified: Classic Blue, Neutral Slate, System) */}
          {activeTab === 'appearance' && (
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-xs space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-[var(--primary-color)]" />
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">Theme & Appearance</h2>
                    <p className="text-xs text-[var(--text-muted)]">Select your preferred viewing theme (Requirement 4)</p>
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
                        className="h-10 rounded-lg border border-[var(--border-color)] flex items-center justify-center text-[10px] font-semibold text-[var(--text-muted)]"
                        style={{ backgroundColor: t.bgPreview }}
                      >
                        Preview Preview
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
          collegeName="Apex Institute of Technology"
        />
      )}
    </div>
  );
};

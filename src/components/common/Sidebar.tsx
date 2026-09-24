import React from 'react';
import {
  Home,
  Compass,
  Calendar,
  User,
  Building2,
  Bell,
  Settings,
  LogOut,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

interface SidebarProps {
  currentTab?: string;
  activeTab?: string;
  onSelectTab: (tab: string) => void;
  isCollege?: boolean;
  unreadNotifications?: number;
  onCreateEventClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  isCollege: propIsCollege,
  unreadNotifications,
  onCreateEventClick,
}) => {
  const effectiveTab = activeTab || currentTab || 'home';
  const { user, studentProfile, college, logout, switchAccount } = useAuth();
  const notif = useNotifications();
  const effectiveUnread = unreadNotifications !== undefined ? unreadNotifications : notif.unreadCount;

  const isStudent = user?.role === 'Student';
  const isCollege = propIsCollege !== undefined ? propIsCollege : (user?.role === 'College Super Admin' || user?.role === 'College Admin');

  const studentNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'colleges', label: 'Colleges', icon: Building2 },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'profile', label: 'Student ID', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: effectiveUnread },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const collegeNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'colleges', label: 'Colleges', icon: Building2 },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'college-profile', label: 'College ID', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: effectiveUnread },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = isCollege ? collegeNavItems : studentNavItems;

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-[var(--border-color)] bg-[var(--surface)] h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-[var(--border-color)]">
        <div
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-color)] to-blue-700 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform">
            E
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
              EVENTHUB
            </h1>
            <p className="text-[11px] font-medium text-[var(--text-muted)] tracking-wide">
              Discover · Connect · Participate
            </p>
          </div>
        </div>
      </div>

      {/* User Role Banner */}
      {user && (
        <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)] flex items-center gap-2.5">
          <div className="relative">
            <img
              src={
                isStudent
                  ? studentProfile?.profilePhoto ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                  : college?.logo ||
                    'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&auto=format&fit=crop&q=80'
              }
              alt="Avatar"
              className="w-9 h-9 rounded-lg object-cover border border-[var(--border-color)]"
            />
            {isCollege && college?.verificationStatus === 'Verified' && (
              <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-blue-600 text-white">
                <ShieldCheck className="w-3 h-3" />
              </span>
            )}
          </div>

          <div className="grow min-w-0">
            <p className="text-xs font-bold text-[var(--text-primary)] truncate">
              {isStudent ? studentProfile?.fullName || user.fullName : college?.name || user.fullName}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {user.role}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 grow overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = effectiveTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--primary-color)] text-[var(--primary-text)] font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-[var(--primary-text)]' : 'text-[var(--text-muted)]'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white text-[var(--primary-color)]'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Account Quick Switcher (Evaluation & Testing Helper) */}
      <div className="p-3 border-t border-[var(--border-color)] space-y-2">
        <div className="px-2 py-1">
          <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-1.5">
            Quick Switch Account
          </p>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => switchAccount('student')}
              title="Switch to Student account"
              className={`text-[10px] font-medium py-1 px-1.5 rounded-md border text-center transition-colors cursor-pointer ${
                user?.role === 'Student'
                  ? 'bg-[var(--primary-light)] border-[var(--primary-color)] text-[var(--primary-color)] font-bold'
                  : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => switchAccount('college-super')}
              title="Switch to Apex College Super Admin"
              className={`text-[10px] font-medium py-1 px-1.5 rounded-md border text-center transition-colors cursor-pointer ${
                user?.role === 'College Super Admin'
                  ? 'bg-[var(--primary-light)] border-[var(--primary-color)] text-[var(--primary-color)] font-bold'
                  : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              Super Admin
            </button>
            <button
              onClick={() => switchAccount('college-admin')}
              title="Switch to College Admin"
              className={`text-[10px] font-medium py-1 px-1.5 rounded-md border text-center transition-colors cursor-pointer ${
                user?.role === 'College Admin'
                  ? 'bg-[var(--primary-light)] border-[var(--primary-color)] text-[var(--primary-color)] font-bold'
                  : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

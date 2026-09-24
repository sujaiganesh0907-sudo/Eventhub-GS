import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Bell,
  Menu,
  X,
  Building2,
  Calendar,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenFilter: () => void;
  activeFilterCount?: number;
  onSelectTab?: (tab: string) => void;
  unreadNotificationsCount?: number;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
  onProfileClick?: () => void;
  onBrandClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenFilter,
  activeFilterCount = 0,
  onSelectTab,
  unreadNotificationsCount,
  onNotificationsClick,
  onSettingsClick,
  onProfileClick,
  onBrandClick,
}) => {
  const { user, studentProfile, college, isAuthenticated } = useAuth();
  const notif = useNotifications();
  const effectiveUnread = unreadNotificationsCount !== undefined ? unreadNotificationsCount : notif.unreadCount;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isStudent = user?.role === 'Student';
  const isCollege = user?.role === 'College Super Admin' || user?.role === 'College Admin';

  const avatarUrl = isStudent
    ? studentProfile?.profilePhoto ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
    : college?.logo ||
      'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&auto=format&fit=crop&q=80';

  const navigateTab = (tab: string) => {
    if (onSelectTab) onSelectTab(tab);
    if (tab === 'notifications' && onNotificationsClick) onNotificationsClick();
    if (tab === 'settings' && onSettingsClick) onSettingsClick();
    if (tab === 'home' && onBrandClick) onBrandClick();
  };

  return (
    <header className="sticky top-0 z-20 w-full border-b border-[var(--border-color)] bg-[var(--surface)]/90 backdrop-blur-md px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] md:hidden cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
          <div
            onClick={() => {
              if (onBrandClick) onBrandClick();
              else if (onSelectTab) onSelectTab(isAuthenticated ? 'home' : 'landing');
            }}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="w-7 h-7 rounded-lg bg-[var(--primary-color)] text-[var(--primary-text)] flex items-center justify-center font-black text-sm">
              E
            </div>
            <span className="font-extrabold text-base tracking-tight text-[var(--text-primary)]">
              EVENTHUB
            </span>
          </div>
        </div>

        {/* Global Search Bar with Filter Icon: ONLY when authenticated (Requirement 6) */}
        {isAuthenticated && (
          <div className="flex items-center gap-2 grow max-w-xl mx-auto">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search events, colleges, categories"
                className="w-full pl-10 pr-11 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] focus:bg-[var(--surface)] focus:border-[var(--primary-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden transition-all"
              />
              {/* Filter icon button on right of search input */}
              <button
                onClick={onOpenFilter}
                title="Open event filters"
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                  activeFilterCount > 0
                    ? 'bg-[var(--primary-color)] text-[var(--primary-text)] border-[var(--primary-color)]'
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {activeFilterCount > 0 && (
                  <span className="ml-1 text-[10px] font-bold leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Right Section: Notifications Bell & Avatar / Sign In */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* Notifications Button */}
              <button
                onClick={() => {
                  if (onNotificationsClick) onNotificationsClick();
                  else if (onSelectTab) onSelectTab('notifications');
                }}
                className="relative p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {effectiveUnread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {effectiveUnread > 9 ? '9+' : effectiveUnread}
                  </span>
                )}
              </button>

              {/* Profile / Avatar Button */}
              <button
                onClick={() => {
                  if (onProfileClick) onProfileClick();
                  else if (onSelectTab) onSelectTab(isCollege ? 'college-profile' : 'profile');
                }}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-lg object-cover border border-[var(--border-color)]"
                  />
                  {isCollege && college?.verificationStatus === 'Verified' && (
                    <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-blue-600 text-white">
                      <ShieldCheck className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <span className="hidden lg:inline text-xs font-semibold text-[var(--text-primary)] max-w-28 truncate">
                  {isStudent ? studentProfile?.fullName || user?.fullName : college?.name || user?.fullName}
                </span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                if (onProfileClick) onProfileClick();
                else if (onSelectTab) onSelectTab('auth');
              }}
              className="px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu (Authenticated only) */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-[var(--border-color)] space-y-1">
          <button
            onClick={() => {
              navigateTab('home');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center gap-2"
          >
            Home
          </button>
          <button
            onClick={() => {
              navigateTab('colleges');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center gap-2"
          >
            Colleges
          </button>
          <button
            onClick={() => {
              navigateTab('events');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center gap-2"
          >
            Events
          </button>
          <button
            onClick={() => {
              navigateTab(isCollege ? 'college-profile' : 'profile');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center gap-2"
          >
            {isCollege ? 'College ID' : 'Student ID'}
          </button>
          <button
            onClick={() => {
              navigateTab('settings');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center gap-2"
          >
            Settings
          </button>
        </div>
      )}
    </header>
  );
};

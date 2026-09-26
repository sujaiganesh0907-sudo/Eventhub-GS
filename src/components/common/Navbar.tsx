import React, { useState, useEffect, useRef } from 'react';
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
  MessageSquare,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../services/api';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenFilter?: () => void;
  activeFilterCount?: number;
  onSelectTab?: (tab: string) => void;
  unreadNotificationsCount?: number;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
  onProfileClick?: () => void;
  onBrandClick?: () => void;
  hideSearch?: boolean;
  hideMessages?: boolean;
  onMessagesClick?: () => void;
  onSelectStudent?: (studentId: string) => void;
  onSelectCollege?: (collegeId: string) => void;
  onSelectEvent?: (event: any) => void;
  unreadMessagesCount?: number;
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
  hideSearch = false,
  hideMessages = false,
  onMessagesClick,
  onSelectStudent,
  onSelectCollege,
  onSelectEvent,
  unreadMessagesCount = 0,
}) => {
  const { user, studentProfile, college, isAuthenticated } = useAuth();
  const notif = useNotifications();
  const effectiveUnread = unreadNotificationsCount !== undefined ? unreadNotificationsCount : notif.unreadCount;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Global Search State
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    students: any[];
    colleges: any[];
    events: any[];
    total: number;
  }>({
    students: [],
    colleges: [],
    events: [],
    total: 0,
  });

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch search results on input change (debounced)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || hideSearch || !isAuthenticated) {
      setSearchResults({ students: [], colleges: [], events: [], total: 0 });
      setIsDropdownOpen(false);
      return;
    }

    setIsDropdownOpen(true);
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await api.get<any>('/search/global', { q: trimmed });
        if (res.success) {
          setSearchResults({
            students: res.students || [],
            colleges: res.colleges || [],
            events: res.events || [],
            total: res.total || 0,
          });
        }
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery, hideSearch, isAuthenticated]);

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
    if (tab === 'messages' && onMessagesClick) onMessagesClick();
    if (tab === 'home' && onBrandClick) onBrandClick();
  };

  const handleStudentClick = (student: any) => {
    setIsDropdownOpen(false);
    if (onSelectStudent) {
      onSelectStudent(student.id || student._id);
    } else if (onSelectTab) {
      onSelectTab('profile');
    }
  };

  const handleCollegeClick = (col: any) => {
    setIsDropdownOpen(false);
    if (onSelectCollege) {
      onSelectCollege(col.id || col._id);
    } else if (onSelectTab) {
      onSelectTab('college-profile');
    }
  };

  const handleEventClick = (ev: any) => {
    setIsDropdownOpen(false);
    if (onSelectEvent) {
      onSelectEvent(ev);
    } else if (onSelectTab) {
      onSelectTab('events');
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[var(--border-color)] bg-[var(--surface)]/90 backdrop-blur-md px-4 sm:px-6 py-3">
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary-color)] to-blue-700 text-white flex items-center justify-center font-black text-sm shadow-xs">
              E
            </div>
            <span className="font-extrabold text-base tracking-tight text-[var(--text-primary)]">
              EVENTHUB
            </span>
          </div>
        </div>

        {/* Global Search Bar (Students, Colleges, Events) — ONLY when authenticated and NOT on Auth/Landing */}
        {isAuthenticated && !hideSearch && (
          <div className="relative flex items-center gap-2 grow max-w-xl mx-auto" ref={searchContainerRef}>
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim()) setIsDropdownOpen(true);
                }}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search students, colleges, events (@handle, name...)"
                className="w-full pl-10 pr-12 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] focus:bg-[var(--surface)] focus:border-[var(--primary-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden transition-all shadow-xs"
              />

              {/* Status / Loading indicator or Filter button */}
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-[var(--primary-color)] animate-spin mr-1.5" />
                ) : onOpenFilter ? (
                  <button
                    onClick={onOpenFilter}
                    title="Open event filters"
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
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
                ) : null}
              </div>
            </div>

            {/* LIVE GLOBAL SEARCH RESULTS DROPDOWN (Requirement 5) */}
            {isDropdownOpen && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-2xl overflow-hidden z-50 max-h-[80vh] overflow-y-auto animate-in fade-in-50 zoom-in-95 backdrop-blur-md">
                {isSearching && searchResults.total === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-color)]" />
                    <span>Searching students, colleges, and events...</span>
                  </div>
                ) : searchResults.total === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                    No results found for <span className="font-bold text-[var(--text-primary)]">"{searchQuery}"</span>
                  </div>
                ) : (
                  <div className="p-3 space-y-4">
                    {/* STUDENTS RESULTS */}
                    {searchResults.students.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                          <User className="w-3 h-3 text-[var(--primary-color)]" />
                          <span>Students ({searchResults.students.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {searchResults.students.map((student) => (
                            <div
                              key={student._id || student.id}
                              onClick={() => handleStudentClick(student)}
                              className="p-2 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={student.profilePhoto}
                                  alt={student.fullName}
                                  className="w-9 h-9 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-color)] truncate">
                                      {student.fullName}
                                    </span>
                                    {student.username && (
                                      <span className="text-[11px] font-semibold text-[var(--primary-color)]">
                                        {student.username}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                                    {student.collegeName} {student.department ? `· ${student.department}` : ''}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--primary-color)] shrink-0">
                                View Profile →
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* COLLEGES RESULTS */}
                    {searchResults.colleges.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-blue-500" />
                          <span>Colleges & Institutions ({searchResults.colleges.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {searchResults.colleges.map((col) => (
                            <div
                              key={col._id || col.id}
                              onClick={() => handleCollegeClick(col)}
                              className="p-2 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={col.logo}
                                  alt={col.name}
                                  className="w-9 h-9 rounded-xl object-cover border border-[var(--border-color)] shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-color)] truncate">
                                      {col.name}
                                    </span>
                                    {col.isVerified && (
                                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                                    {col.location || 'University Campus'} {col.username ? `· ${col.username}` : ''}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--primary-color)] shrink-0">
                                View College →
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* EVENTS RESULTS */}
                    {searchResults.events.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-emerald-500" />
                          <span>Events ({searchResults.events.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {searchResults.events.map((ev) => (
                            <div
                              key={ev._id || ev.id}
                              onClick={() => handleEventClick(ev)}
                              className="p-2 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={ev.poster}
                                  alt={ev.title}
                                  className="w-10 h-7 rounded-lg object-cover border border-[var(--border-color)] shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-color)] truncate block">
                                    {ev.title}
                                  </span>
                                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                                    {ev.hostCollegeName} · {ev.category} · {ev.eventDate}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                  ev.isFree ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-600'
                                }`}
                              >
                                {ev.isFree ? 'Free' : `$${ev.registrationFee}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right Section: Messages, Notifications Bell & Avatar / Sign In */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <>
              {/* MESSAGES BUTTON (Requirement 9) — Hidden on public/login pages */}
              {!hideMessages && (
                <button
                  onClick={() => {
                    if (onMessagesClick) onMessagesClick();
                    else if (onSelectTab) onSelectTab('messages');
                  }}
                  className="relative p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  aria-label="Messages"
                  title="Messages & Chats"
                >
                  <MessageSquare className="w-4 h-4" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </button>
              )}

              {/* Notifications Button */}
              <button
                onClick={() => {
                  if (onNotificationsClick) onNotificationsClick();
                  else if (onSelectTab) onSelectTab('notifications');
                }}
                className="relative p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                aria-label="Notifications"
                title="Notifications"
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
              navigateTab('messages');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--primary-color)]" /> Messages
            </span>
            {unreadMessagesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                {unreadMessagesCount}
              </span>
            )}
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

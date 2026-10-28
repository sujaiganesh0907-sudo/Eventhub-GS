import React from 'react';
import {
  Home,
  Calendar,
  User,
  Building2,
  Bell,
  Settings,
  LogOut,
  ShieldCheck,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  X,
  Repeat,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { DEFAULT_STUDENT_AVATAR, DEFAULT_COLLEGE_LOGO } from '../../services/imageDefaults';

export interface SidebarProps {
  currentTab?: string;
  activeTab?: string;
  onSelectTab: (tab: string) => void;
  isCollege?: boolean;
  unreadNotifications?: number;
  unreadMessages?: number;
  onCreateEventClick?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  isCollege: propIsCollege,
  unreadNotifications,
  unreadMessages = 0,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const effectiveTab = activeTab || currentTab || 'home';
  const { user, studentProfile, college, logout, switchAccount } = useAuth();
  const notif = useNotifications();
  const effectiveUnread = unreadNotifications !== undefined ? unreadNotifications : notif.unreadCount;

  const isParticipant = user?.role === 'Student';
  const isApprover =
    propIsCollege !== undefined
      ? propIsCollege
      : user?.role === 'College Super Admin' || user?.role === 'College Admin';
  const isOrganizer = user?.role === 'Organizer';

  const participantNavItems = [
    { id: 'home', label: 'Discover', icon: Home },
    { id: 'events', label: 'My Events', icon: Calendar },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
    { id: 'colleges', label: 'Colleges', icon: Building2 },
    { id: 'profile', label: 'Participant Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: effectiveUnread },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const approverNavItems = [
    { id: 'home', label: 'Approver Hub', icon: Home },
    { id: 'events', label: 'Manage Events', icon: Calendar },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
    { id: 'colleges', label: 'Colleges', icon: Building2 },
    { id: 'college-profile', label: 'Institution Profile', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: effectiveUnread },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const organizerNavItems = [
    { id: 'home', label: 'Organizer Hub', icon: Home },
    { id: 'events', label: 'Organized Events', icon: Calendar },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
    { id: 'colleges', label: 'Partner Colleges', icon: Building2 },
    { id: 'profile', label: 'Organizer Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: effectiveUnread },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = isApprover ? approverNavItems : isOrganizer ? organizerNavItems : participantNavItems;

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    if (isMobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full justify-between">
      {/* Top Section: Toggle button, User mini-badge, Nav links */}
      <div className="space-y-3">
        {/* Sidebar Header & Toggle */}
        <div
          className={`flex items-center pt-3 pb-2 px-3 border-b border-[var(--border-color)] ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {!collapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Navigation
            </span>
          )}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeft className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* User Profile Mini Banner */}
        {user && (
          <div
            className={`mx-2 p-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)] flex items-center gap-2.5 transition-all ${
              collapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <div className="relative shrink-0">
              <img
                src={
                  isParticipant
                    ? studentProfile?.profilePhoto || DEFAULT_STUDENT_AVATAR
                    : isApprover
                    ? college?.logo || DEFAULT_COLLEGE_LOGO
                    : DEFAULT_STUDENT_AVATAR
                }
                alt="Avatar"
                className="w-8 h-8 rounded-lg object-cover border border-[var(--border-color)]"
              />
              {isApprover && college?.verificationStatus === 'Verified' && (
                <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-blue-600 text-white">
                  <ShieldCheck className="w-2.5 h-2.5" />
                </span>
              )}
            </div>

            {!collapsed && (
              <div className="grow min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {isParticipant
                    ? studentProfile?.fullName || user.fullName
                    : isApprover
                    ? college?.name || user.fullName
                    : user.fullName}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                  <span className="truncate">
                    {isParticipant ? 'Participant' : isApprover ? 'Approver' : 'Organizer'}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation Items */}
        <nav className="px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                  collapsed
                    ? 'justify-center p-2.5'
                    : 'justify-between px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-[var(--primary-text)]' : 'text-[var(--text-muted)]'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`${
                      collapsed
                        ? 'absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[var(--surface)]'
                        : 'text-[10px] font-bold px-1.5 py-0.2 rounded-full'
                    } ${
                      isActive
                        ? 'bg-white text-[var(--primary-color)]'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {!collapsed && (item.badge > 99 ? '99+' : item.badge)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Account Switcher & Logout */}
      <div className="p-2 border-t border-[var(--border-color)] space-y-2 mt-4">
        {!collapsed ? (
          <>
            <div className="px-1.5 pt-1">
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-1.5 flex items-center gap-1">
                <Repeat className="w-3 h-3" /> Quick Switch
              </p>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => switchAccount('student')}
                  title="Switch to Participant Account"
                  className={`text-[9px] font-semibold py-1 px-1 rounded-lg border text-center transition-colors cursor-pointer truncate ${
                    isParticipant
                      ? 'bg-[var(--primary-light)] border-[var(--primary-color)] text-[var(--primary-color)] font-bold'
                      : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  Participant
                </button>
                <button
                  type="button"
                  onClick={() => switchAccount('college-super')}
                  title="Switch to Approver (College)"
                  className={`text-[9px] font-semibold py-1 px-1 rounded-lg border text-center transition-colors cursor-pointer truncate ${
                    isApprover
                      ? 'bg-[var(--primary-light)] border-[var(--primary-color)] text-[var(--primary-color)] font-bold'
                      : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  Approver
                </button>
                <button
                  type="button"
                  onClick={() => switchAccount('organizer')}
                  title="Switch to Organizer"
                  className={`text-[9px] font-semibold py-1 px-1 rounded-lg border text-center transition-colors cursor-pointer truncate ${
                    isOrganizer
                      ? 'bg-[var(--primary-light)] border-[var(--primary-color)] text-[var(--primary-color)] font-bold'
                      : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  Organizer
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => switchAccount(user?.role === 'Student' ? 'college-super' : 'student')}
              title={`Switch to ${user?.role === 'Student' ? 'College Admin' : 'Student'}`}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            >
              <Repeat className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-[var(--border-color)] bg-[var(--surface)] transition-all duration-300 ease-in-out select-none ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {renderContent(isCollapsed)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer panel */}
          <div className="relative w-72 max-w-[85vw] bg-[var(--surface)] h-full border-r border-[var(--border-color)] shadow-2xl z-10 flex flex-col p-2 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between p-2 border-b border-[var(--border-color)] mb-2">
              <span className="font-extrabold text-sm text-[var(--text-primary)]">EVENTHUB</span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderContent(false)}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

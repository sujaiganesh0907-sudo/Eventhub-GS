import React from 'react';
import { Home, Building2, Calendar, User, Bell, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

interface BottomNavProps {
  currentTab?: string;
  activeTab?: string;
  onSelectTab: (tab: string) => void;
  isCollege?: boolean;
  unreadNotifications?: number;
  unreadMessages?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  isCollege: propIsCollege,
  unreadNotifications,
  unreadMessages = 0,
}) => {
  const effectiveTab = activeTab || currentTab || 'home';
  const { user } = useAuth();
  const notif = useNotifications();
  const effectiveUnread = unreadNotifications !== undefined ? unreadNotifications : notif.unreadCount;

  const isCollege = propIsCollege !== undefined ? propIsCollege : (user?.role === 'College Super Admin' || user?.role === 'College Admin');

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'messages', label: 'Chat', icon: MessageSquare, badge: unreadMessages },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: isCollege ? 'college-profile' : 'profile', label: isCollege ? 'College ID' : 'Student ID', icon: isCollege ? Building2 : User },
    { id: 'notifications', label: 'Alerts', icon: Bell, badge: effectiveUnread },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border-color)] bg-[var(--surface)]/95 backdrop-blur-md px-2 py-1.5 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = effectiveTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
              isActive ? 'text-[var(--primary-color)] font-bold scale-105' : 'text-[var(--text-muted)]'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

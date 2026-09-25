import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { MultiStepEventForm } from './components/event/MultiStepEventForm';
import { EventFilterModal, FilterState } from './components/event/EventFilterModal';
import { RegistrationModal } from './components/registration/RegistrationModal';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { StudentHomePage } from './pages/StudentHomePage';
import { CollegeHomePage } from './pages/CollegeHomePage';
import { ViewEventPage } from './pages/ViewEventPage';
import { EventsManagementPage } from './pages/EventsManagementPage';
import { CollegesListPage } from './pages/CollegesListPage';
import { StudentProfilePage } from './pages/StudentProfilePage';
import { CollegeProfilePage } from './pages/CollegeProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { IEvent } from './types';

// Public routes that never require authentication
export const PUBLIC_ROUTES = new Set([
  'landing',
  'auth',
  'login',
  'register',
  'register-student',
  'register-college',
  'verify-otp',
  'otp',
  'forgot-password',
  'reset-password',
]);

const isPublicRoute = (tab: string): boolean => PUBLIC_ROUTES.has(tab);

const isPublicAuthTab = (tab: string): boolean => {
  return [
    'auth',
    'login',
    'register',
    'register-student',
    'register-college',
    'verify-otp',
    'otp',
  ].includes(tab);
};

const resolveTabFromPath = (pathname: string): string => {
  const p = pathname.toLowerCase().replace(/\/$/, '') || '/';
  if (p === '/verify-otp' || p === '/otp') return 'verify-otp';
  if (p === '/login' || p === '/auth') return 'auth';
  if (p === '/register' || p === '/register/student') return 'register';
  if (p === '/register/college') return 'register-college';
  if (p === '/forgot-password' || p === '/reset-password') return 'auth';
  if (p === '/' || p === '/landing') {
    const hasToken = !!localStorage.getItem('eventhub_token');
    return hasToken ? 'home' : 'landing';
  }

  const sub = p.replace(/^\//, '');
  if (['home', 'events', 'colleges', 'profile', 'college-profile', 'notifications', 'settings', 'view-event'].includes(sub)) {
    return sub;
  }
  return 'home';
};

const getPathForTab = (tab: string): string => {
  switch (tab) {
    case 'landing': return '/';
    case 'auth':
    case 'login': return '/login';
    case 'register':
    case 'register-student': return '/register';
    case 'register-college': return '/register/college';
    case 'verify-otp':
    case 'otp': return '/verify-otp';
    case 'home': return '/home';
    case 'events': return '/events';
    case 'colleges': return '/colleges';
    case 'profile': return '/profile';
    case 'college-profile': return '/college-profile';
    case 'notifications': return '/notifications';
    case 'settings': return '/settings';
    case 'view-event': return '/event';
    default: return '/';
  }
};

const AppContent: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated, isCollege, isStudent } = useAuth();
  const { unreadCount } = useNotifications();

  // Navigation State initialized safely from URL pathname
  const [activeTab, setActiveTab] = useState<string>(() => {
    return resolveTabFromPath(window.location.pathname);
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | undefined>();

  // Browser navigation sync
  const updateUrl = (tab: string) => {
    const targetPath = getPathForTab(tab);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // Route protection navigator
  const navigateToTab = (tab: string, notice?: string) => {
    if (!isAuthenticated && !isPublicRoute(tab)) {
      setAuthNotice(notice || 'Sign in to explore and register for events.');
      setActiveTab('auth');
      updateUrl('auth');
      return;
    }
    setAuthNotice(notice);
    setActiveTab(tab);
    updateUrl(tab);
  };

  // Browser history navigation sync
  useEffect(() => {
    const handlePopState = () => {
      const tab = resolveTabFromPath(window.location.pathname);
      setActiveTab(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Enforce route protection ONLY on protected/private routes after auth restoration finishes
  useEffect(() => {
    // CRITICAL: NEVER redirect while authentication status is restoring!
    if (authLoading) return;

    if (!isAuthenticated && !isPublicRoute(activeTab)) {
      setActiveTab('landing');
      if (window.location.pathname !== '/' && window.location.pathname !== '/landing') {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [authLoading, isAuthenticated, activeTab]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    category: 'All',
    isFree: 'all',
    mode: 'all',
    collegeId: '',
    sort: 'date',
  });

  // Event Creation & Registration Modals
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isStudentProposal, setIsStudentProposal] = useState(false);
  const [eventToRegister, setEventToRegister] = useState<IEvent | null>(null);

  const handleOpenCreateEvent = (asProposal: boolean = false) => {
    if (!isAuthenticated) {
      navigateToTab('auth', 'Sign in to create or propose events.');
      return;
    }
    setIsStudentProposal(asProposal);
    setIsCreateEventOpen(true);
  };

  const handleViewEvent = (event: IEvent) => {
    if (!isAuthenticated) {
      navigateToTab('auth', 'Sign in to view event details.');
      return;
    }
    setSelectedEventId(event._id);
    setActiveTab('view-event');
    updateUrl('view-event');
  };

  const handleViewCollege = (collegeId: string) => {
    if (!isAuthenticated) {
      navigateToTab('auth', 'Sign in to explore collegiate profiles.');
      return;
    }
    setSelectedCollegeId(collegeId);
    setActiveTab('college-profile');
    updateUrl('college-profile');
  };

  // During auth restoration, show clean full-screen loader without redirecting
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-3 border-[var(--primary-color)] border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-[var(--text-muted)]">
          Restoring EVENTHUB session...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (isAuthenticated && (activeTab === 'landing' || activeTab === 'view-event')) {
            setActiveTab('home');
            updateUrl('home');
          }
        }}
        onOpenFilter={() => setIsFilterModalOpen(true)}
        unreadNotificationsCount={unreadCount}
        onNotificationsClick={() => navigateToTab('notifications')}
        onSettingsClick={() => navigateToTab('settings')}
        onProfileClick={() => {
          if (!isAuthenticated) {
            navigateToTab('auth');
          } else {
            navigateToTab(isCollege ? 'college-profile' : 'profile');
          }
        }}
        onBrandClick={() => navigateToTab(isAuthenticated ? 'home' : 'landing')}
      />

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Desktop Sidebar (Only when authenticated and on non-public routes) */}
        {isAuthenticated && !isPublicRoute(activeTab) && (
          <aside className="hidden md:block w-60 shrink-0">
            <div className="sticky top-20">
              <Sidebar
                activeTab={activeTab}
                onSelectTab={(tab) => {
                  if (tab === 'profile') {
                    navigateToTab(isCollege ? 'college-profile' : 'profile');
                  } else {
                    navigateToTab(tab);
                  }
                }}
                isCollege={isCollege}
                unreadNotifications={unreadCount}
                onCreateEventClick={() => handleOpenCreateEvent(isStudent)}
              />
            </div>
          </aside>
        )}

        {/* Main Routed Content Area */}
        <main className="flex-1 min-w-0">
          {/* LANDING PAGE */}
          {activeTab === 'landing' && (
            <LandingPage
              onGetStarted={() => {
                setAuthNotice(undefined);
                navigateToTab('register');
              }}
              onExploreEvents={() => {
                if (!isAuthenticated) {
                  navigateToTab('auth', 'Sign in to explore and register for events.');
                } else {
                  navigateToTab('home');
                }
              }}
              onExploreColleges={() => {
                if (!isAuthenticated) {
                  navigateToTab('auth', 'Sign in to explore colleges.');
                } else {
                  navigateToTab('colleges');
                }
              }}
            />
          )}

          {/* AUTHENTICATION & OTP PAGES (Public Routes) */}
          {isPublicAuthTab(activeTab) && (
            <AuthPage
              initialMode={
                activeTab === 'verify-otp' || activeTab === 'otp'
                  ? 'otp'
                  : activeTab.startsWith('register')
                  ? 'register'
                  : 'login'
              }
              initialRole={activeTab === 'register-college' ? 'college' : 'student'}
              noticeMessage={authNotice}
              onNavigateTab={(tab, notice) => navigateToTab(tab, notice)}
              onSuccess={() => {
                setAuthNotice(undefined);
                navigateToTab('home');
              }}
            />
          )}

          {/* HOME / DASHBOARD TAB */}
          {isAuthenticated && activeTab === 'home' && (
            isCollege ? (
              <CollegeHomePage
                onOpenCreateEvent={() => handleOpenCreateEvent(false)}
                onSelectTab={(tab) => navigateToTab(tab)}
                onViewEvent={handleViewEvent}
              />
            ) : (
              <StudentHomePage
                searchQuery={searchQuery}
                filters={filters}
                onViewEvent={handleViewEvent}
                onRegister={(ev) => setEventToRegister(ev)}
                onSelectTab={(tab) => navigateToTab(tab)}
                onOpenFilter={() => setIsFilterModalOpen(true)}
              />
            )
          )}

          {/* EVENTS MANAGEMENT / MY EVENTS TAB */}
          {isAuthenticated && activeTab === 'events' && (
            <EventsManagementPage
              onOpenCreateEvent={handleOpenCreateEvent}
              onViewEvent={handleViewEvent}
            />
          )}

          {/* PARTNER COLLEGES TAB */}
          {isAuthenticated && activeTab === 'colleges' && (
            <CollegesListPage onSelectCollege={handleViewCollege} />
          )}

          {/* STUDENT PROFILE */}
          {isAuthenticated && activeTab === 'profile' && (
            <StudentProfilePage
              onViewEvent={handleViewEvent}
              onSelectCollege={handleViewCollege}
            />
          )}

          {/* COLLEGE PROFILE */}
          {isAuthenticated && activeTab === 'college-profile' && (
            <CollegeProfilePage
              collegeId={selectedCollegeId || undefined}
              onViewEvent={handleViewEvent}
              onRegisterEvent={(ev) => setEventToRegister(ev)}
            />
          )}

          {/* VIEW SINGLE EVENT */}
          {isAuthenticated && activeTab === 'view-event' && (
            selectedEventId ? (
              <ViewEventPage
                eventId={selectedEventId}
                onBack={() => navigateToTab(isCollege ? 'home' : 'home')}
                onSelectCollege={handleViewCollege}
              />
            ) : (
              <StudentHomePage
                searchQuery={searchQuery}
                filters={filters}
                onViewEvent={handleViewEvent}
                onRegister={(ev) => setEventToRegister(ev)}
                onSelectTab={(tab) => navigateToTab(tab)}
                onOpenFilter={() => setIsFilterModalOpen(true)}
              />
            )
          )}

          {/* NOTIFICATIONS */}
          {isAuthenticated && activeTab === 'notifications' && (
            <NotificationsPage
              onSelectEvent={(eventId) => {
                setSelectedEventId(eventId);
                setActiveTab('view-event');
                updateUrl('view-event');
              }}
            />
          )}

          {/* SETTINGS & THEMES */}
          {isAuthenticated && activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Authenticated only on non-public routes) */}
      {isAuthenticated && !isPublicRoute(activeTab) && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'profile') {
              navigateToTab(isCollege ? 'college-profile' : 'profile');
            } else {
              navigateToTab(tab);
            }
          }}
          isCollege={isCollege}
          unreadNotifications={unreadCount}
        />
      )}

      {/* Multi-Step Event Creation / Proposal Modal */}
      {isCreateEventOpen && (
        <MultiStepEventForm
          isOpen={isCreateEventOpen}
          onClose={() => setIsCreateEventOpen(false)}
          onSuccess={(newEvent) => {
            setIsCreateEventOpen(false);
            if (newEvent && newEvent._id) {
              handleViewEvent(newEvent);
            } else {
              navigateToTab(isCollege ? 'home' : 'events');
            }
          }}
          isStudentProposal={isStudentProposal}
        />
      )}

      {/* Event Discovery Filter Modal */}
      <EventFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        currentFilters={filters}
        onApplyFilters={(f) => setFilters(f)}
      />

      {/* Registration Modal */}
      {eventToRegister && (
        <RegistrationModal
          isOpen={!!eventToRegister}
          onClose={() => setEventToRegister(null)}
          event={eventToRegister}
          onRegistrationSuccess={() => {
            // Modal manages showing the ticket pass before closing
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

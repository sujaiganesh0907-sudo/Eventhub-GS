import React, { useState } from 'react';
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

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isCollege, isStudent } = useAuth();
  const { unreadCount } = useNotifications();

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>(isAuthenticated ? 'home' : 'landing');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | undefined>();

  // Route protection navigator (Requirement 8 & 9)
  const navigateToTab = (tab: string, notice?: string) => {
    if (!isAuthenticated && tab !== 'landing' && tab !== 'auth') {
      setAuthNotice(notice || 'Sign in to explore and register for events.');
      setActiveTab('auth');
      return;
    }
    setAuthNotice(notice);
    setActiveTab(tab);
  };

  // Enforce route protection if session logs out
  React.useEffect(() => {
    if (!isAuthenticated && activeTab !== 'landing' && activeTab !== 'auth') {
      setActiveTab('landing');
    }
  }, [isAuthenticated, activeTab]);

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
  };

  const handleViewCollege = (collegeId: string) => {
    if (!isAuthenticated) {
      navigateToTab('auth', 'Sign in to explore collegiate profiles.');
      return;
    }
    setSelectedCollegeId(collegeId);
    setActiveTab('college-profile');
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (isAuthenticated && (activeTab === 'landing' || activeTab === 'view-event')) {
            setActiveTab('home');
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
            setActiveTab(isCollege ? 'college-profile' : 'profile');
          }
        }}
        onBrandClick={() => setActiveTab(isAuthenticated ? 'home' : 'landing')}
      />

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Desktop Sidebar (Only when authenticated) */}
        {isAuthenticated && activeTab !== 'landing' && activeTab !== 'auth' && (
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
                setActiveTab('auth');
              }}
              onExploreEvents={() => {
                // Requirement 8: For unauthenticated users, Browse Live Events redirects to Sign In
                if (!isAuthenticated) {
                  navigateToTab('auth', 'Sign in to explore and register for events.');
                } else {
                  setActiveTab('home');
                }
              }}
              onExploreColleges={() => {
                if (!isAuthenticated) {
                  navigateToTab('auth', 'Sign in to explore colleges.');
                } else {
                  setActiveTab('colleges');
                }
              }}
            />
          )}

          {/* AUTHENTICATION PAGE */}
          {activeTab === 'auth' && (
            <AuthPage
              initialMode="login"
              noticeMessage={authNotice}
              onSuccess={() => {
                setAuthNotice(undefined);
                setActiveTab('home');
              }}
            />
          )}

          {/* HOME / DASHBOARD TAB */}
          {isAuthenticated && activeTab === 'home' && (
            isCollege ? (
              <CollegeHomePage
                onOpenCreateEvent={() => handleOpenCreateEvent(false)}
                onSelectTab={(tab) => setActiveTab(tab)}
                onViewEvent={handleViewEvent}
              />
            ) : (
              <StudentHomePage
                searchQuery={searchQuery}
                filters={filters}
                onViewEvent={handleViewEvent}
                onRegister={(ev) => setEventToRegister(ev)}
                onSelectTab={(tab) => setActiveTab(tab)}
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
          {isAuthenticated && activeTab === 'profile' && <StudentProfilePage />}

          {/* COLLEGE PROFILE */}
          {isAuthenticated && activeTab === 'college-profile' && (
            <CollegeProfilePage
              collegeId={selectedCollegeId || undefined}
              onViewEvent={handleViewEvent}
              onRegisterEvent={(ev) => setEventToRegister(ev)}
            />
          )}

          {/* VIEW SINGLE EVENT */}
          {isAuthenticated && activeTab === 'view-event' && selectedEventId && (
            <ViewEventPage
              eventId={selectedEventId}
              onBack={() => setActiveTab(isCollege ? 'home' : 'home')}
              onSelectCollege={handleViewCollege}
            />
          )}

          {/* NOTIFICATIONS */}
          {isAuthenticated && activeTab === 'notifications' && (
            <NotificationsPage
              onSelectEvent={(eventId) => {
                setSelectedEventId(eventId);
                setActiveTab('view-event');
              }}
            />
          )}

          {/* SETTINGS & THEMES */}
          {isAuthenticated && activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Authenticated only) */}
      {isAuthenticated && activeTab !== 'landing' && activeTab !== 'auth' && (
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
            handleViewEvent(newEvent);
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
            setEventToRegister(null);
            if (selectedEventId) {
              setActiveTab('view-event');
            }
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

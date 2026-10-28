import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { MultiStepEventForm } from './components/event/MultiStepEventForm';
import { EventFilterModal, FilterState } from './components/event/EventFilterModal';
import { RegistrationModal } from './components/registration/RegistrationModal';
import { api } from './services/api';

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
import { MessagesPage } from './pages/MessagesPage';
import { AdminProfilePage } from './pages/AdminProfilePage';
import { PublicVerificationModal } from './components/certificate/PublicVerificationModal';
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
  'verify',
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
  if (p.startsWith('/verify')) return 'verify';
  if (p.match(/^\/(?:event|events)\/[^/?#]+/)) return 'view-event';
  if (p.match(/^\/(?:college|colleges)\/[^/?#]+/)) return 'college-profile';
  if (p === '/college/events' || p === '/events') return 'events';
  if (p === '/' || p === '/landing') {
    const hasToken = !!localStorage.getItem('eventhub_token');
    return hasToken ? 'home' : 'landing';
  }

  const sub = p.replace(/^\//, '');
  if (['home', 'events', 'colleges', 'profile', 'college-profile', 'admin-profile', 'notifications', 'settings', 'view-event', 'messages'].includes(sub)) {
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
    case 'admin-profile': return '/admin-profile';
    case 'notifications': return '/notifications';
    case 'settings': return '/settings';
    case 'view-event': return '/event';
    case 'messages': return '/messages';
    case 'verify': return '/verify';
    default: return '/';
  }
};

interface NavHistoryItem {
  tab: string;
  selectedEventId?: string | null;
  selectedCollegeId?: string | null;
  selectedStudentId?: string | null;
  selectedConversationId?: string | null;
}

const AppContent: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated, isCollege, isStudent, college, studentProfile } = useAuth();
  const { unreadCount } = useNotifications();

  // Navigation State initialized safely from URL pathname
  const [activeTab, setActiveTab] = useState<string>(() => {
    return resolveTabFromPath(window.location.pathname);
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    const match = window.location.pathname.match(/\/(?:event|events)\/([^/?#]+)/);
    return match ? match[1] : null;
  });
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(() => {
    const match = window.location.pathname.match(/\/(?:college|colleges)\/([^/?#]+)/);
    return match ? match[1] : null;
  });
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [authNotice, setAuthNotice] = useState<string | undefined>();
  const [publicVerifyId, setPublicVerifyId] = useState<string | null>(() => {
    const match = window.location.pathname.match(/\/verify\/([^/?#]+)/);
    return match ? match[1] : null;
  });

  // Navigation history stack for seamless return to previous page (Requirement 17)
  const [navHistory, setNavHistory] = useState<NavHistoryItem[]>([]);

  // Collapsible Sidebar state (ChatGPT style, with responsive mobile drawer)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('eventhub_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('eventhub_sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  };

  // Browser navigation sync
  const updateUrl = (tab: string, eventId?: string | null, collegeId?: string | null) => {
    let targetPath = getPathForTab(tab);
    if (tab === 'view-event') {
      const eId = eventId !== undefined ? eventId : selectedEventId;
      if (eId) targetPath = `/event/${eId}`;
    } else if (tab === 'college-profile') {
      const cId = collegeId !== undefined ? collegeId : selectedCollegeId;
      if (cId) targetPath = `/colleges/${cId}`;
    }
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // Push new state onto history stack
  const pushNavState = (
    newTab: string,
    details?: {
      selectedEventId?: string | null;
      selectedCollegeId?: string | null;
      selectedStudentId?: string | null;
      selectedConversationId?: string | null;
    }
  ) => {
    setNavHistory((prev) => [
      ...prev,
      {
        tab: activeTab,
        selectedEventId,
        selectedCollegeId,
        selectedStudentId,
        selectedConversationId,
      },
    ]);
    const targetEventId = details?.selectedEventId !== undefined ? details.selectedEventId : selectedEventId;
    const targetCollegeId = details?.selectedCollegeId !== undefined ? details.selectedCollegeId : selectedCollegeId;
    if (details?.selectedEventId !== undefined) setSelectedEventId(details.selectedEventId);
    if (details?.selectedCollegeId !== undefined) setSelectedCollegeId(details.selectedCollegeId);
    if (details?.selectedStudentId !== undefined) setSelectedStudentId(details.selectedStudentId);
    if (details?.selectedConversationId !== undefined) setSelectedConversationId(details.selectedConversationId);
    setActiveTab(newTab);
    updateUrl(newTab, targetEventId, targetCollegeId);
  };

  // Go back to previous page
  const goBack = () => {
    if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      setNavHistory((prevStack) => prevStack.slice(0, -1));
      setActiveTab(prev.tab);
      setSelectedEventId(prev.selectedEventId || null);
      setSelectedCollegeId(prev.selectedCollegeId || null);
      setSelectedStudentId(prev.selectedStudentId || null);
      setSelectedConversationId(prev.selectedConversationId || null);
      updateUrl(prev.tab);
    } else {
      if (activeTab === 'view-event') {
        setActiveTab('events');
        updateUrl('events');
      } else if (activeTab === 'college-profile') {
        setActiveTab('colleges');
        updateUrl('colleges');
      } else if (activeTab === 'admin-profile') {
        setActiveTab('profile');
        updateUrl('profile');
      } else {
        navigateToTab(isAuthenticated ? 'home' : 'landing');
      }
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
    pushNavState(tab);
  };

  // Browser history navigation sync
  useEffect(() => {
    const handlePopState = () => {
      const tab = resolveTabFromPath(window.location.pathname);
      const evMatch = window.location.pathname.match(/\/(?:event|events)\/([^/?#]+)/);
      const colMatch = window.location.pathname.match(/\/(?:college|colleges)\/([^/?#]+)/);
      if (evMatch) setSelectedEventId(evMatch[1]);
      if (colMatch) setSelectedCollegeId(colMatch[1]);
      setActiveTab(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Track current user to detect account switches & role transitions (Requirements 1, 2, 3)
  const currentUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentId = user?._id || (user as any)?.id || null;
    if (currentUserIdRef.current !== null && currentId !== currentUserIdRef.current) {
      // Clear stale selection contexts
      setSelectedCollegeId(null);
      setSelectedStudentId(null);
      setSelectedEventId(null);
      setSelectedConversationId(null);
      setNavHistory([]);
      localStorage.removeItem('eventhub_active_college');

      // Start cleanly at role-specific home
      if (currentId) {
        setActiveTab('home');
        updateUrl('home');
      } else {
        setActiveTab('landing');
        updateUrl('landing');
      }
    }
    currentUserIdRef.current = currentId;
  }, [user?._id, (user as any)?.id, user?.role]);

  // Enforce route protection and ensure starting from role-specific Home on authenticated app reload (Requirement 3)
  const initialAuthDoneRef = useRef(false);
  useEffect(() => {
    if (authLoading) return;

    if (!initialAuthDoneRef.current) {
      initialAuthDoneRef.current = true;
      if (isAuthenticated) {
        if (activeTab !== 'verify') {
          setSelectedCollegeId(null);
          setSelectedStudentId(null);
          setSelectedEventId(null);
          setSelectedConversationId(null);
          setNavHistory([]);
          setActiveTab('home');
          updateUrl('home');
        }
      } else if (!isPublicRoute(activeTab)) {
        setActiveTab('landing');
        if (window.location.pathname !== '/' && window.location.pathname !== '/landing') {
          window.history.replaceState(null, '', '/');
        }
      }
      return;
    }

    if (!isAuthenticated && !isPublicRoute(activeTab)) {
      setActiveTab('landing');
      if (window.location.pathname !== '/' && window.location.pathname !== '/landing') {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [authLoading, isAuthenticated, activeTab]);

  // Periodic polling for unread messages count when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadMessagesCount(0);
      return;
    }

    const fetchUnread = async () => {
      try {
        const res = await api.get<{ success: boolean; unreadCount: number }>('/messages/unread-count');
        if (res.success && typeof res.unreadCount === 'number') {
          setUnreadMessagesCount(res.unreadCount);
        }
      } catch (err) {
        // silently ignore transient network issues
      }
    };

    fetchUnread();
    const timer = setInterval(fetchUnread, 12000);
    return () => clearInterval(timer);
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

  const handleViewEvent = (event: IEvent | string) => {
    if (!isAuthenticated) {
      navigateToTab('auth', 'Sign in to view event details.');
      return;
    }
    const eventId = typeof event === 'string' ? event : event._id;
    pushNavState('view-event', { selectedEventId: eventId });
  };

  const handleViewCollege = (collegeId: string) => {
    if (!isAuthenticated) {
      navigateToTab('auth', 'Sign in to explore collegiate profiles.');
      return;
    }
    pushNavState('college-profile', { selectedCollegeId: collegeId });
  };

  const handleViewStudent = (studentId: string) => {
    if (!isAuthenticated) {
      navigateToTab('auth', 'Sign in to view student profiles.');
      return;
    }
    pushNavState('profile', { selectedStudentId: studentId });
  };

  const handleOpenMessages = (conversationId?: string) => {
    if (!isAuthenticated) {
      navigateToTab('auth', 'Sign in to view messages.');
      return;
    }
    pushNavState('messages', { selectedConversationId: conversationId || null });
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

  // Determine if search and messages icons should be hidden (Requirements 3, 4, 5)
  // Search appears ONLY on Home (in Navbar), Messages (in MessagesPage), and Colleges (in CollegesListPage)
  const shouldHideSearch = !isAuthenticated || isPublicAuthTab(activeTab) || activeTab === 'landing' || activeTab !== 'home';
  const shouldHideMessages = !isAuthenticated || isPublicAuthTab(activeTab) || activeTab === 'landing';

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (isAuthenticated && (activeTab === 'landing')) {
            pushNavState('home');
          }
        }}
        hideSearch={shouldHideSearch}
        hideMessages={shouldHideMessages}
        onOpenFilter={() => setIsFilterModalOpen(true)}
        unreadNotificationsCount={unreadCount}
        unreadMessagesCount={unreadMessagesCount}
        onNotificationsClick={() => pushNavState('notifications')}
        onMessagesClick={() => handleOpenMessages()}
        onSettingsClick={() => pushNavState('settings')}
        onProfileClick={() => {
          if (!isAuthenticated) {
            pushNavState('auth');
          } else {
            pushNavState(isCollege ? 'college-profile' : 'profile', {
              selectedCollegeId: null,
              selectedStudentId: null,
            });
          }
        }}
        onBrandClick={() => navigateToTab(isAuthenticated ? 'home' : 'landing')}
        onSelectStudent={(sId) => handleViewStudent(sId)}
        onSelectCollege={(cId) => handleViewCollege(cId)}
        onSelectEvent={(ev) => handleViewEvent(ev)}
        onToggleSidebar={handleToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 gap-6">
        {/* Desktop Sidebar (Only when authenticated and on non-public routes) */}
        {isAuthenticated && !isPublicRoute(activeTab) && (
          <aside
            className={`hidden md:block transition-all duration-300 ease-in-out shrink-0 ${
              isSidebarCollapsed ? 'w-16' : 'w-60'
            }`}
          >
            <div className="sticky top-20 rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--surface)] shadow-xs">
              <Sidebar
                activeTab={activeTab}
                onSelectTab={(tab) => {
                  if (tab === 'messages') {
                    handleOpenMessages();
                  } else if (tab === 'profile') {
                    pushNavState(isCollege ? 'college-profile' : 'profile', {
                      selectedCollegeId: null,
                      selectedStudentId: null,
                    });
                  } else {
                    pushNavState(tab);
                  }
                }}
                isCollege={isCollege}
                unreadNotifications={unreadCount}
                unreadMessages={unreadMessagesCount}
                onCreateEventClick={() => handleOpenCreateEvent(isStudent)}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={handleToggleSidebar}
              />
            </div>
          </aside>
        )}

        {/* Mobile Sidebar Drawer */}
        {isAuthenticated && !isPublicRoute(activeTab) && isMobileSidebarOpen && (
          <Sidebar
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setIsMobileSidebarOpen(false);
              if (tab === 'messages') {
                handleOpenMessages();
              } else if (tab === 'profile') {
                pushNavState(isCollege ? 'college-profile' : 'profile', {
                  selectedCollegeId: null,
                  selectedStudentId: null,
                });
              } else {
                pushNavState(tab);
              }
            }}
            isCollege={isCollege}
            unreadNotifications={unreadCount}
            unreadMessages={unreadMessagesCount}
            onCreateEventClick={() => {
              setIsMobileSidebarOpen(false);
              handleOpenCreateEvent(isStudent);
            }}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />
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

          {/* STUDENT PROFILE (Self or Viewed Student) */}
          {isAuthenticated && activeTab === 'profile' && (
            <StudentProfilePage
              studentId={selectedStudentId || undefined}
              onViewEvent={handleViewEvent}
              onSelectCollege={handleViewCollege}
              onNavigateToMessages={handleOpenMessages}
              onOpenAdminAccess={(collegeId) => {
                if (collegeId) {
                  localStorage.setItem('eventhub_active_college', collegeId);
                }
                navigateToTab('admin-profile');
              }}
              onBack={goBack}
            />
          )}

          {/* COLLEGE PROFILE (Self or Viewed College) */}
          {isAuthenticated && activeTab === 'college-profile' && (
            <CollegeProfilePage
              collegeId={selectedCollegeId || (isCollege ? college?._id : (studentProfile?.targetCollegeId || 'col_apex_tech_01'))}
              onViewEvent={handleViewEvent}
              onRegisterEvent={(ev) => setEventToRegister(ev)}
              onNavigateToMessages={handleOpenMessages}
              onBack={goBack}
            />
          )}

          {/* MESSAGES & CHATS (Requirement 8-15) */}
          {isAuthenticated && activeTab === 'messages' && (
            <MessagesPage
              initialConversationId={selectedConversationId}
              initialGroupId={selectedConversationId && selectedConversationId.startsWith('group_') ? selectedConversationId.replace('group_', '') : undefined}
              onViewEvent={(eventId) => handleViewEvent(eventId)}
              onViewStudent={(studentId) => handleViewStudent(studentId)}
              onViewCollege={(collegeId) => handleViewCollege(collegeId)}
              onBack={goBack}
            />
          )}

          {/* VIEW SINGLE EVENT */}
          {isAuthenticated && activeTab === 'view-event' && (
            selectedEventId ? (
              <ViewEventPage
                eventId={selectedEventId}
                onBack={goBack}
                onSelectCollege={handleViewCollege}
                onNavigateToMessages={handleOpenMessages}
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

          {/* ADMIN PROFILE & MULTI-COLLEGE ADMIN WORKSPACES (Requirement 8-15) */}
          {isAuthenticated && activeTab === 'admin-profile' && (
            <AdminProfilePage
              onViewEvent={handleViewEvent}
              onSelectCollege={handleViewCollege}
              onNavigateToMessages={handleOpenMessages}
              onBack={goBack}
            />
          )}

          {/* NOTIFICATIONS */}
          {isAuthenticated && activeTab === 'notifications' && (
            <NotificationsPage
              onSelectEvent={(eventId) => {
                handleViewEvent(eventId);
              }}
              onOpenManageAdmins={(collegeId) => {
                handleViewCollege(collegeId);
              }}
              onNavigateToTab={(tab, meta) => {
                if (tab === 'messages') {
                  handleOpenMessages(meta?.conversationId);
                } else if (tab === 'profile') {
                  pushNavState(isCollege ? 'college-profile' : 'profile', {
                    selectedCollegeId: null,
                    selectedStudentId: null,
                  });
                } else if (tab === 'college-profile') {
                  if (meta?.collegeId) {
                    handleViewCollege(meta.collegeId);
                  } else {
                    pushNavState('college-profile');
                  }
                } else if (tab === 'events') {
                  if (meta?.eventId) {
                    handleViewEvent(meta.eventId);
                  } else {
                    pushNavState('events');
                  }
                } else {
                  navigateToTab(tab);
                }
              }}
            />
          )}

          {/* SETTINGS & THEMES */}
          {isAuthenticated && activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Public Online Certificate Verification Modal (Direct URL /verify/:id support) */}
      {publicVerifyId && (
        <PublicVerificationModal
          isOpen={!!publicVerifyId}
          onClose={() => {
            setPublicVerifyId(null);
            window.history.pushState(null, '', '/');
          }}
          certificateId={publicVerifyId}
        />
      )}

      {/* Mobile Bottom Navigation (Authenticated only on non-public routes) */}
      {isAuthenticated && !isPublicRoute(activeTab) && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'messages') {
              handleOpenMessages();
            } else if (tab === 'profile') {
              pushNavState(isCollege ? 'college-profile' : 'profile', {
                selectedCollegeId: null,
                selectedStudentId: null,
              });
            } else {
              pushNavState(tab);
            }
          }}
          isCollege={isCollege}
          unreadNotifications={unreadCount}
          unreadMessages={unreadMessagesCount}
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
              pushNavState(isCollege ? 'home' : 'events');
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
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

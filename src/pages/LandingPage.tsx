import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Building2,
  Award,
  QrCode,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Users,
  Compass,
} from 'lucide-react';
import { api } from '../services/api';

interface LandingPageProps {
  onGetStarted: () => void;
  onExploreEvents: () => void;
  onExploreColleges?: () => void;
}

interface RealStats {
  totalColleges?: number;
  totalStudents?: number;
  totalEvents?: number;
  activeEvents?: number;
  verifiedCollegesCount: number;
  participantsCount: number;
  publishedEventsCount: number;
  certificatesCount: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onExploreEvents,
  onExploreColleges,
}) => {
  const [stats, setStats] = useState<RealStats>({
    verifiedCollegesCount: 0,
    participantsCount: 0,
    publishedEventsCount: 0,
    certificatesCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchRealStats = async () => {
      try {
        const res = await api.get<{ success: boolean; stats: RealStats }>('/stats');
        if (isMounted && res.success && res.stats) {
          setStats(res.stats);
        }
      } catch (err) {
        console.warn('Could not load dynamic public stats:', err);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };

    fetchRealStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const collegesCount = stats.totalColleges !== undefined ? stats.totalColleges : stats.verifiedCollegesCount;
  const studentsCount = stats.totalStudents !== undefined ? stats.totalStudents : stats.participantsCount;
  const eventsCount = stats.activeEvents !== undefined ? stats.activeEvents : stats.publishedEventsCount;
  const certsCount = stats.certificatesCount;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Top Banner / Hero */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-16 pb-20 border-b border-[var(--border-color)] overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--primary-color)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-color)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-secondary)] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Inter-College Event Discovery & Verified Credentials Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[var(--text-primary)] leading-tight">
            Discover. Connect. <br className="hidden sm:inline" />
            <span className="text-[var(--primary-color)]">Participate.</span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            The unified ecosystem for collegiate hackathons, symposiums, workshops, and verified academic credentials. Connect with premier universities, reserve instant QR entry passes, and build your collegiate portfolio.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={onGetStarted}
              className="px-6 py-3 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onExploreEvents}
              className="px-6 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] font-bold text-sm transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4 text-[var(--primary-color)]" /> Browse Live Events
            </button>
          </div>

          {/* Quick Real Metrics Bar (Requirement 6: Real database counts, no hardcoded marketing values, no + approximations) */}
          <div className="pt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)]">
              <span className="text-2xl font-black text-[var(--primary-color)]">
                {loadingStats ? '—' : collegesCount}
              </span>
              <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">
                Partner Colleges
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)]">
              <span className="text-2xl font-black text-emerald-500">
                {loadingStats ? '—' : studentsCount}
              </span>
              <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">
                Students & Participants
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)]">
              <span className="text-2xl font-black text-indigo-500">
                {loadingStats ? '—' : eventsCount}
              </span>
              <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">
                Live Collegiate Events
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface)]">
              <span className="text-2xl font-black text-amber-500">
                {loadingStats ? '—' : certsCount}
              </span>
              <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">
                Verified Certificates
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars: 3-Role Architecture */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            A Unified Ecosystem for 3 Distinct Roles
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-xl mx-auto">
            Tailored workflows for students, college venue administrators, and independent event organizations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] space-y-3 shadow-xs">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 w-fit">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600">Role 1</span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Participant</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Explore inter-college hackathons, competitions, and workshops with instant QR passes, real-time seat tracking, and verified digital certificates.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] space-y-3 shadow-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 w-fit">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600">Role 2</span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Approver (College)</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Review and authorize external proposals, approve campus venues with 1-click feedback, manage attendance scanning, and issue accredited digital certificates.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] space-y-3 shadow-xs">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 w-fit">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600">Role 3</span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Organizer</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              External companies and tech guilds can propose events directly to host colleges, collect registrations in INR (₹), and track proposal approvals with email notifications.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--border-color)] py-8 px-4 text-center text-xs text-[var(--text-muted)]">
        <p>© 2026 EVENTHUB Inc. Inter-College Event Discovery & Management Engine.</p>
      </footer>
    </div>
  );
};

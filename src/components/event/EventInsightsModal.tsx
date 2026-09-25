import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { IEvent } from '../../types';
import { api } from '../../services/api';
import {
  Eye,
  Users,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  BarChart3,
  Loader2,
  Building2,
  GraduationCap,
} from 'lucide-react';

interface EventInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: IEvent;
}

export const EventInsightsModal: React.FC<EventInsightsModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.get<any>(`/events/${event._id}/insights`)
        .then((res) => {
          if (res.success) {
            setInsights(res.insights);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, event._id]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Event Analytics & Insights"
      subtitle={`${event.title} · Performance Overview`}
      maxWidth="2xl"
    >
      <div className="space-y-4 py-2">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-color)]" />
          </div>
        ) : !insights ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            Failed to load analytics data.
          </div>
        ) : (
          <>
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Total Views
                </span>
                <span className="text-xl font-black text-[var(--text-primary)] mt-1 block">
                  {insights.views ?? insights.viewsCount ?? 0}
                </span>
                {insights.conversionRate !== undefined && (
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">
                    {insights.conversionRate}% conversion
                  </span>
                )}
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Registrations
                </span>
                <span className="text-xl font-black text-[var(--text-primary)] mt-1 block">
                  {insights.registrations ?? insights.totalRegistrations ?? 0} / {insights.capacity || event.capacity}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-medium">
                  {insights.seatsFilledPercent || 0}% capacity
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                <span className="text-[10px] uppercase font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Attendance Rate
                </span>
                <span className="text-xl font-black text-emerald-600 mt-1 block">
                  {insights.attendanceRate || 0}% ({insights.attendanceCount ?? insights.attendedCount ?? 0})
                </span>
                <span className="text-[10px] text-emerald-600/80 font-medium">
                  Present attendees
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> Total Revenue
                </span>
                <span className="text-xl font-black text-[var(--primary-color)] mt-1 block">
                  ${insights.revenue ?? insights.totalRevenue ?? 0}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-medium">
                  {event.isFree ? 'Free Event' : `Fee: $${event.registrationFee}`}
                </span>
              </div>
            </div>

            {/* Department Breakdown */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[var(--primary-color)]" /> Department Breakdown
              </h4>
              {Object.keys(insights.departmentBreakdown || {}).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No participant registrations yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(insights.departmentBreakdown).map(([dept, count]: any) => (
                    <div key={dept} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">{dept}</span>
                      <span className="font-bold text-[var(--text-primary)]">{count} student(s)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Institution Breakdown */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[var(--primary-color)]" /> Participating Colleges
              </h4>
              {Object.keys(insights.collegeBreakdown || {}).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No participant registrations yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(insights.collegeBreakdown).map(([col, count]: any) => (
                    <div key={col} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">{col}</span>
                      <span className="font-bold text-[var(--text-primary)]">{count} participant(s)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

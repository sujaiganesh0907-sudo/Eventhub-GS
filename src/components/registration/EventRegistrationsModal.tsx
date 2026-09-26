import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { IEvent } from '../../types';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Mail,
  UserCheck,
  CreditCard,
  Ticket,
} from 'lucide-react';

interface EventRegistrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: IEvent;
}

export const EventRegistrationsModal: React.FC<EventRegistrationsModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAttended, setFilterAttended] = useState<'all' | 'attended' | 'not_attended'>('all');

  useEffect(() => {
    if (!isOpen || !event) return;
    setLoading(true);
    api
      .get<any>(`/registrations/college?eventId=${event._id}`)
      .then((res) => {
        if (res.success) {
          setRegistrations(res.registrations || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load event registrations', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, event]);

  const filtered = registrations.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.studentName?.toLowerCase().includes(q) ||
      r.studentEmail?.toLowerCase().includes(q) ||
      r.registrationId?.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (filterAttended === 'attended') return r.attended === true;
    if (filterAttended === 'not_attended') return !r.attended;
    return true;
  });

  const attendedCount = registrations.filter((r) => r.attended).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Event Registrations"
      subtitle={`${event.title} · ${registrations.length} registered · ${attendedCount} attended`}
      maxWidth="2xl"
    >
      <div className="space-y-4 py-2">
        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by student name, email, or pass ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary-color)] transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 bg-[var(--surface-subtle)] p-1 rounded-xl border border-[var(--border-color)] text-xs">
            <button
              type="button"
              onClick={() => setFilterAttended('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filterAttended === 'all'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({registrations.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterAttended('attended')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filterAttended === 'attended'
                  ? 'bg-[var(--surface)] text-emerald-600 shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Attended ({attendedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterAttended('not_attended')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                filterAttended === 'not_attended'
                  ? 'bg-[var(--surface)] text-amber-600 shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Pending ({registrations.length - attendedCount})
            </button>
          </div>
        </div>

        {/* Registrations List */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
            <p className="text-xs text-[var(--text-muted)]">Loading registrations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center border border-[var(--border-color)] rounded-xl bg-[var(--surface-subtle)] space-y-1.5">
            <Users className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
            <p className="text-xs font-bold text-[var(--text-primary)]">
              {search ? 'No matching registrations found' : 'No students registered yet'}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {search ? 'Try clearing your search query.' : 'Participant details will show here once students sign up.'}
            </p>
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
            {filtered.map((reg) => (
              <div
                key={reg._id}
                className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary-color)]/10 text-[var(--primary-color)] font-bold flex items-center justify-center text-xs shrink-0">
                    {reg.studentName ? reg.studentName.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text-primary)] truncate">
                        {reg.studentName}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--surface-subtle)] px-1.5 py-0.5 rounded-md border border-[var(--border-color)]">
                        {reg.registrationId}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] mt-0.5">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        {reg.studentEmail}
                      </span>
                      {reg.studentDepartment && (
                        <span>· {reg.studentDepartment}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {reg.attended ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Attended
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-medium text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Absent
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      reg.paymentStatus === 'Completed' || reg.paymentStatus === 'Free'
                        ? 'bg-blue-500/10 text-blue-600'
                        : 'bg-zinc-500/10 text-zinc-500'
                    }`}
                  >
                    {reg.paymentStatus || 'Confirmed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] transition-colors cursor-pointer border border-[var(--border-color)]"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

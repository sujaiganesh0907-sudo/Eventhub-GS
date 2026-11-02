import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { IEvent } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Mail,
  Phone,
  Building2,
  Calendar,
  Download,
  Eye,
  FileSpreadsheet,
  Check,
  X,
  CreditCard,
  UserCheck,
  ExternalLink,
  Table as TableIcon,
  LayoutGrid,
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
  const { showToast } = useToast();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAttended, setFilterAttended] = useState<'all' | 'attended' | 'not_attended'>('all');
  const [filterPayment, setFilterPayment] = useState<'all' | 'completed' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedReg, setSelectedReg] = useState<any | null>(null);
  const [updatingAttendanceId, setUpdatingAttendanceId] = useState<string | null>(null);

  // Fetch registrations whenever modal opens or event changes
  useEffect(() => {
    if (!isOpen || !event) return;
    setLoading(true);
    api
      .get<any>(`/registrations/college?eventId=${event._id}`)
      .then((res) => {
        if (res.success) {
          setRegistrations(res.registrations || []);
        } else {
          showToast(res.message || 'Failed to load registrations', 'error');
        }
      })
      .catch((err) => {
        console.error('Failed to load event registrations', err);
        showToast('Error loading registrations from server', 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, event]);

  // Extract all configured & historical custom questions safely
  const customQuestions = useMemo(() => {
    const list: { id: string; label: string; type: string }[] = [];
    const seen = new Set<string>();

    // 1. Configured questions from event model
    if (Array.isArray(event?.registrationQuestions)) {
      event.registrationQuestions.forEach((q) => {
        if (q && q.label) {
          list.push({
            id: q.id || `q_${q.label.trim()}`,
            label: q.label.trim(),
            type: q.type || 'Short Text',
          });
          seen.add(q.id);
          seen.add(q.label.trim().toLowerCase());
        }
      });
    }

    // 2. Scan registrations' answersList for any historical/edited questions
    registrations.forEach((reg) => {
      if (Array.isArray(reg.answersList)) {
        reg.answersList.forEach((a: any) => {
          if (a && a.label && !seen.has(a.questionId) && !seen.has(a.label.trim().toLowerCase())) {
            list.push({
              id: a.questionId || `q_${a.label.trim()}`,
              label: a.label.trim(),
              type: a.type || 'Short Text',
            });
            seen.add(a.questionId);
            seen.add(a.label.trim().toLowerCase());
          }
        });
      }
    });

    return list;
  }, [event, registrations]);

  // Safe mapping helper to associate an answer with a question
  const getAnswerForQuestion = (reg: any, q: { id: string; label: string }) => {
    // 1. Primary: check answersList snapshot
    if (Array.isArray(reg.answersList)) {
      const found = reg.answersList.find(
        (a: any) =>
          (a.questionId && a.questionId === q.id) ||
          (a.label && a.label.trim().toLowerCase() === q.label.trim().toLowerCase())
      );
      if (found && found.answer !== undefined && found.answer !== null && found.answer !== '') {
        return Array.isArray(found.answer) ? found.answer.join(', ') : String(found.answer);
      }
    }

    // 2. Secondary: check customResponses object (keyed by question id or label)
    if (reg.customResponses && typeof reg.customResponses === 'object') {
      if (reg.customResponses[q.id] !== undefined && reg.customResponses[q.id] !== null && reg.customResponses[q.id] !== '') {
        const val = reg.customResponses[q.id];
        return Array.isArray(val) ? val.join(', ') : String(val);
      }
      if (reg.customResponses[q.label] !== undefined && reg.customResponses[q.label] !== null && reg.customResponses[q.label] !== '') {
        const val = reg.customResponses[q.label];
        return Array.isArray(val) ? val.join(', ') : String(val);
      }
    }

    // 3. Tertiary: check answers array
    if (Array.isArray(reg.answers)) {
      const found = reg.answers.find(
        (a: any) =>
          (a.questionId && a.questionId === q.id) ||
          (a.label && a.label.trim().toLowerCase() === q.label.trim().toLowerCase())
      );
      if (found && found.answer !== undefined && found.answer !== null && found.answer !== '') {
        return Array.isArray(found.answer) ? found.answer.join(', ') : String(found.answer);
      }
    }

    return '—';
  };

  // Quick Attendance Mark
  const handleToggleAttendance = async (reg: any) => {
    if (updatingAttendanceId) return;
    setUpdatingAttendanceId(reg._id);
    const targetStatus = reg.attended ? 'Absent' : 'Present';
    try {
      const res = await api.post<any>('/attendance/mark', {
        eventId: event._id,
        registrationId: reg.registrationId || reg._id,
        status: targetStatus,
      });

      if (res.success) {
        setRegistrations((prev) =>
          prev.map((r) =>
            r._id === reg._id
              ? { ...r, attended: targetStatus === 'Present', attendedAt: targetStatus === 'Present' ? new Date().toISOString() : null }
              : r
          )
        );
        if (selectedReg && selectedReg._id === reg._id) {
          setSelectedReg((prev: any) => ({
            ...prev,
            attended: targetStatus === 'Present',
            attendedAt: targetStatus === 'Present' ? new Date().toISOString() : null,
          }));
        }
        showToast(
          targetStatus === 'Present'
            ? `Marked ${reg.studentName || 'Participant'} as Present`
            : `Marked ${reg.studentName || 'Participant'} as Absent`,
          'success'
        );
      } else {
        showToast(res.message || 'Failed to update attendance', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update attendance status', 'error');
    } finally {
      setUpdatingAttendanceId(null);
    }
  };

  // CSV Export with formula injection defense and UTF-8 BOM
  const handleExportCSV = () => {
    if (registrations.length === 0) {
      showToast('No registration data available to export.', 'info');
      return;
    }

    try {
      const sanitizeCell = (val: any): string => {
        if (val === null || val === undefined) return '""';
        let str = String(val).trim();
        // Prevent CSV formula injection attack in Excel / Sheets
        if (/^[=+\-@\t\r]/.test(str)) {
          str = `'${str}`;
        }
        return `"${str.replace(/"/g, '""')}"`;
      };

      // Define standard columns
      const headers = [
        'Registration ID',
        'Participant Name',
        'Student ID / Roll No',
        'Email',
        'Phone Number',
        'College / Institution',
        'Department',
        'Year',
        'Registration Date',
        'Attendance Status',
        'Attended At',
        'Payment Status',
        'Fee Paid (INR)',
        'Participation Type',
        'Team Name',
        ...customQuestions.map((q) => q.label),
      ];

      const csvRows: string[] = [];
      csvRows.push(headers.map(sanitizeCell).join(','));

      registrations.forEach((reg) => {
        const regDateFormatted = reg.registrationDate || reg.createdAt
          ? new Date(reg.registrationDate || reg.createdAt).toLocaleString()
          : '';
        const attendedAtFormatted = reg.attendedAt ? new Date(reg.attendedAt).toLocaleString() : '';

        const row = [
          reg.registrationId || reg._id,
          reg.studentName || '',
          reg.studentId || '',
          reg.studentEmail || '',
          reg.studentPhone || '',
          reg.studentCollege || '',
          reg.studentDepartment || '',
          reg.studentYear || '',
          regDateFormatted,
          reg.attended ? 'Present / Attended' : 'Absent',
          attendedAtFormatted,
          reg.paymentStatus || (event.isFree ? 'Free' : 'Pending'),
          event.isFree ? '0' : String(event.registrationFee || 0),
          reg.registrationType || 'Individual',
          reg.teamName || '—',
          ...customQuestions.map((q) => getAnswerForQuestion(reg, q)),
        ];

        csvRows.push(row.map(sanitizeCell).join(','));
      });

      // Include UTF-8 BOM (\uFEFF) for proper regional/Tamil character rendering in Excel
      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `${(event.title || 'event')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-registrations.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${registrations.length} registrations to ${filename}`, 'success');
    } catch (err: any) {
      console.error('Export failed', err);
      showToast('Failed to export registrations CSV.', 'error');
    }
  };

  // Filtered registrations based on search & filter state
  const filtered = registrations.filter((r) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const matchStandard =
        (r.studentName && r.studentName.toLowerCase().includes(q)) ||
        (r.studentEmail && r.studentEmail.toLowerCase().includes(q)) ||
        (r.registrationId && r.registrationId.toLowerCase().includes(q)) ||
        (r.studentCollege && r.studentCollege.toLowerCase().includes(q)) ||
        (r.studentDepartment && r.studentDepartment.toLowerCase().includes(q)) ||
        (r.teamName && r.teamName.toLowerCase().includes(q));

      const matchCustom = customQuestions.some((question) => {
        const ans = getAnswerForQuestion(r, question);
        return ans && ans.toLowerCase().includes(q);
      });

      if (!matchStandard && !matchCustom) return false;
    }

    if (filterAttended === 'attended' && !r.attended) return false;
    if (filterAttended === 'not_attended' && r.attended) return false;

    if (filterPayment === 'completed' && r.paymentStatus !== 'Completed' && r.paymentStatus !== 'Free') return false;
    if (filterPayment === 'pending' && (r.paymentStatus === 'Completed' || r.paymentStatus === 'Free')) return false;

    return true;
  });

  const attendedCount = registrations.filter((r) => r.attended).length;
  const pendingAttendanceCount = registrations.length - attendedCount;
  const completedPaymentCount = registrations.filter((r) => r.paymentStatus === 'Completed' || r.paymentStatus === 'Free').length;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Event Registrations & Participant Roster"
        subtitle={`${event.title} · ${registrations.length} total participants · Real-time attendance and submitted answers`}
        maxWidth="7xl"
      >
        <div className="space-y-4 py-1 flex-1 flex flex-col min-h-0">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-sm">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider block">
                  Total Registered
                </span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">
                  {registrations.length}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider block">
                  Attended / Present
                </span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {attendedCount}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider block">
                  Pending Check-in
                </span>
                <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                  {pendingAttendanceCount}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-sm">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider block">
                  Payment Status
                </span>
                <span className="text-base font-extrabold text-[var(--text-primary)]">
                  {event.isFree ? '100% Free' : `${completedPaymentCount} Paid`}
                </span>
              </div>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search across student name, email, pass ID, college, or submitted answers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Attendance Filter */}
              <div className="flex items-center bg-[var(--surface-subtle)] p-0.5 rounded-xl border border-[var(--border-color)] text-xs">
                <button
                  type="button"
                  onClick={() => setFilterAttended('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterAttended === 'attended'
                      ? 'bg-[var(--surface)] text-emerald-600 shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Present ({attendedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterAttended('not_attended')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterAttended === 'not_attended'
                      ? 'bg-[var(--surface)] text-amber-600 shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Absent ({pendingAttendanceCount})
                </button>
              </div>

              {/* View Switcher */}
              <div className="flex items-center bg-[var(--surface-subtle)] p-0.5 rounded-xl border border-[var(--border-color)] text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Spreadsheet Table View"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  title="Card Grid View"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-[var(--surface)] text-[var(--primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-[var(--primary)]" />
              <p className="text-xs font-semibold text-[var(--text-muted)]">
                Loading saved registration records & custom answers...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface-subtle)] space-y-2">
              <Users className="w-10 h-10 mx-auto text-[var(--text-muted)]" />
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {search ? 'No matching registrations found' : 'No participant registrations found for this event'}
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                {search
                  ? 'Try modifying your search keywords or clear active filters.'
                  : 'Participant records will automatically appear here once students submit the registration form.'}
              </p>
            </div>
          ) : viewMode === 'table' ? (
            /* Spreadsheet Table View (Google Sheets Style) */
            <div className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--surface)] flex-1 flex flex-col">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 uppercase text-[10px] font-bold tracking-wider border-b border-[var(--border-color)] select-none">
                    <tr>
                      <th className="px-3 py-2.5 border-r border-[var(--border-color)] text-center w-10">#</th>
                      <th className="px-3 py-2.5 border-r border-[var(--border-color)] text-center w-14">Action</th>
                      <th className="px-3 py-2.5 border-r border-[var(--border-color)] whitespace-nowrap min-w-[130px]">
                        Registration ID
                      </th>
                      <th className="px-3 py-2.5 border-r border-[var(--border-color)] whitespace-nowrap min-w-[170px]">
                        Participant Name
                      </th>
                      <th className="px-3 py-2.5 border-r border-[var(--border-color)] whitespace-nowrap min-w-[200px]">
                        Email
                      </th>
                      <th className="px-3 py-2.5 border-r border-[var(--border-color)] whitespace-nowrap min-w-[120px]">
                        Phone
                      </th>
                      <th className="px-3 py-2.5 border-r border-[var(--border-color)] whitespace-nowrap min-w-[180px]">
                        College / Institution
                      </th>
                      <th className="px-3 py-2.5 border-r border-[var(--border-color)] whitespace-nowrap min-w-[130px]">
                        Department & Year
                      </th>
                      <th className="px-3 py-2.5 border-r border-[var(--border-color)] whitespace-nowrap min-w-[130px]">
                        Registered On
                      </th>
                      <th className="px-3 py-2.5 border-r border-[var(--border-color)] whitespace-nowrap min-w-[130px] text-center">
                        Attendance
                      </th>
                      <th className="px-3 py-2.5 border-r border-[var(--border-color)] whitespace-nowrap min-w-[100px] text-center">
                        Payment
                      </th>
                      {event.registrationType === 'Team' && (
                        <th className="px-3 py-2.5 border-r border-[var(--border-color)] whitespace-nowrap min-w-[130px]">
                          Team Name
                        </th>
                      )}

                      {/* Dynamic Custom Question Columns */}
                      {customQuestions.map((q) => (
                        <th
                          key={q.id}
                          className="px-3 py-2.5 border-r border-[var(--border-color)] whitespace-nowrap min-w-[180px] bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{q.label}</span>
                            <span className="text-[8px] font-normal px-1 py-0.2 rounded bg-indigo-200/50 dark:bg-indigo-800/50">
                              {q.type}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] font-normal">
                    {filtered.map((reg, idx) => {
                      const regDate = reg.registrationDate || reg.createdAt;
                      return (
                        <tr
                          key={reg._id || idx}
                          className="hover:bg-[var(--surface-subtle)] transition-colors group"
                        >
                          <td className="px-3 py-2 border-r border-[var(--border-color)] text-center text-[10px] text-[var(--text-muted)] font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-2 py-2 border-r border-[var(--border-color)] text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedReg(reg)}
                              title="View Full Participant Details & Answers"
                              className="p-1 rounded-lg text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                          <td className="px-3 py-2 border-r border-[var(--border-color)] font-mono text-[11px] font-semibold text-[var(--text-primary)] whitespace-nowrap">
                            {reg.registrationId || reg._id}
                          </td>
                          <td className="px-3 py-2 border-r border-[var(--border-color)] font-bold text-[var(--text-primary)] whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold flex items-center justify-center text-[9px] shrink-0">
                                {reg.studentName ? reg.studentName.charAt(0).toUpperCase() : 'P'}
                              </span>
                              <span className="truncate">{reg.studentName || '—'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 border-r border-[var(--border-color)] text-[var(--text-secondary)] whitespace-nowrap">
                            {reg.studentEmail || '—'}
                          </td>
                          <td className="px-3 py-2 border-r border-[var(--border-color)] text-[var(--text-secondary)] whitespace-nowrap font-mono text-[11px]">
                            {reg.studentPhone || '—'}
                          </td>
                          <td className="px-3 py-2 border-r border-[var(--border-color)] text-[var(--text-secondary)] truncate max-w-[200px]">
                            {reg.studentCollege || '—'}
                          </td>
                          <td className="px-3 py-2 border-r border-[var(--border-color)] text-[var(--text-secondary)] whitespace-nowrap">
                            {reg.studentDepartment || reg.studentYear ? (
                              <span>
                                {reg.studentDepartment || 'General'}
                                {reg.studentYear ? ` · Yr ${reg.studentYear}` : ''}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-2 border-r border-[var(--border-color)] text-[var(--text-muted)] text-[11px] whitespace-nowrap">
                            {regDate ? new Date(regDate).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-3 py-2 border-r border-[var(--border-color)] text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleAttendance(reg)}
                              disabled={updatingAttendanceId === reg._id}
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer transition-all ${
                                reg.attended
                                  ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                              }`}
                            >
                              {updatingAttendanceId === reg._id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : reg.attended ? (
                                <>
                                  <Check className="w-3 h-3" /> Present
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" /> Absent
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-2 border-r border-[var(--border-color)] text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                reg.paymentStatus === 'Completed' || reg.paymentStatus === 'Free' || event.isFree
                                  ? 'bg-blue-500/10 text-blue-600'
                                  : 'bg-zinc-500/10 text-zinc-500'
                              }`}
                            >
                              {event.isFree ? 'Free' : (reg.paymentStatus || 'Confirmed')}
                            </span>
                          </td>
                          {event.registrationType === 'Team' && (
                            <td className="px-3 py-2 border-r border-[var(--border-color)] text-[var(--text-secondary)] whitespace-nowrap font-medium">
                              {reg.teamName || '—'}
                            </td>
                          )}

                          {/* Dynamic Custom Question Answer Cells */}
                          {customQuestions.map((q) => {
                            const val = getAnswerForQuestion(reg, q);
                            const isUrl = typeof val === 'string' && /^https?:\/\//i.test(val);
                            return (
                              <td
                                key={q.id}
                                className="px-3 py-2 border-r border-[var(--border-color)] text-[var(--text-primary)] max-w-[260px] truncate"
                              >
                                {isUrl ? (
                                  <a
                                    href={val}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate"
                                  >
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{val}</span>
                                  </a>
                                ) : (
                                  <span className={val === '—' ? 'text-[var(--text-muted)]' : 'font-medium'}>
                                    {val}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map((reg) => (
                <div
                  key={reg._id}
                  className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--primary)]/50 transition-all space-y-2.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-bold flex items-center justify-center text-sm shrink-0">
                        {reg.studentName ? reg.studentName.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">
                          {reg.studentName}
                        </h4>
                        <span className="font-mono text-[10px] text-[var(--text-muted)]">
                          {reg.registrationId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedReg(reg)}
                        className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        title="View Full Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAttendance(reg)}
                        disabled={updatingAttendanceId === reg._id}
                        className={`px-2 py-1 rounded-lg font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer transition-all ${
                          reg.attended
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {reg.attended ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {reg.attended ? 'Present' : 'Absent'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)]">
                    <div className="truncate">
                      <span className="block text-[9px] uppercase font-semibold text-[var(--text-muted)]">
                        Email
                      </span>
                      <span className="text-[var(--text-primary)] font-medium truncate block">
                        {reg.studentEmail || '—'}
                      </span>
                    </div>
                    <div className="truncate">
                      <span className="block text-[9px] uppercase font-semibold text-[var(--text-muted)]">
                        Phone
                      </span>
                      <span className="text-[var(--text-primary)] font-medium truncate block font-mono">
                        {reg.studentPhone || '—'}
                      </span>
                    </div>
                    <div className="truncate col-span-2">
                      <span className="block text-[9px] uppercase font-semibold text-[var(--text-muted)]">
                        College / Institution
                      </span>
                      <span className="text-[var(--text-primary)] font-medium truncate block">
                        {reg.studentCollege || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Answers summary snippet */}
                  {customQuestions.length > 0 && (
                    <div className="p-2 rounded-lg bg-[var(--surface-subtle)] text-[11px] space-y-1">
                      <span className="font-semibold text-[10px] text-indigo-600 dark:text-indigo-400 block">
                        Custom Answers ({customQuestions.length}):
                      </span>
                      {customQuestions.slice(0, 2).map((q) => (
                        <div key={q.id} className="flex items-center justify-between gap-2">
                          <span className="text-[var(--text-muted)] truncate max-w-[50%]">{q.label}:</span>
                          <span className="font-semibold text-[var(--text-primary)] truncate max-w-[50%]">
                            {getAnswerForQuestion(reg, q)}
                          </span>
                        </div>
                      ))}
                      {customQuestions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setSelectedReg(reg)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline block pt-0.5"
                        >
                          + {customQuestions.length - 2} more answers...
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>
              Showing <strong>{filtered.length}</strong> of <strong>{registrations.length}</strong> registered participants
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-subtle)] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer text-[var(--text-primary)]"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                Download Spreadsheet
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-[var(--primary)] text-white font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Single Registration Detail Sub-Modal */}
      {selectedReg && (
        <Modal
          isOpen={Boolean(selectedReg)}
          onClose={() => setSelectedReg(null)}
          title="Participant Registration Details"
          subtitle={`Pass ID: ${selectedReg.registrationId} · Registered for ${event.title}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 py-2 text-xs">
            {/* Header Identity Card */}
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-bold flex items-center justify-center text-base shrink-0">
                  {selectedReg.studentName ? selectedReg.studentName.charAt(0).toUpperCase() : 'P'}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    {selectedReg.studentName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-[var(--text-muted)]">
                    <span className="font-mono bg-[var(--surface)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                      {selectedReg.registrationId}
                    </span>
                    <span>·</span>
                    <span>{selectedReg.studentCollege || 'Participant'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleAttendance(selectedReg)}
                disabled={updatingAttendanceId === selectedReg._id}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
                  selectedReg.attended
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                {updatingAttendanceId === selectedReg._id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : selectedReg.attended ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                {selectedReg.attended ? 'Present' : 'Mark Present'}
              </button>
            </div>

            {/* Standard Profile Fields */}
            <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] space-y-2">
              <span className="font-bold text-[11px] uppercase text-[var(--text-muted)] tracking-wider block">
                Contact & Academic Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Email Address</span>
                  <span className="font-semibold text-[var(--text-primary)] break-all">
                    {selectedReg.studentEmail || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Phone Number</span>
                  <span className="font-semibold font-mono text-[var(--text-primary)]">
                    {selectedReg.studentPhone || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">College / Institution</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {selectedReg.studentCollege || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Department & Year</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {selectedReg.studentDepartment || 'General'}{' '}
                    {selectedReg.studentYear ? `(Year ${selectedReg.studentYear})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Registration Date & Time</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {selectedReg.registrationDate || selectedReg.createdAt
                      ? new Date(selectedReg.registrationDate || selectedReg.createdAt).toLocaleString()
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Payment Status</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {event.isFree ? 'Free Event' : (selectedReg.paymentStatus || 'Confirmed')}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Specific Custom Questions & Answers */}
            <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] uppercase text-indigo-700 dark:text-indigo-300 tracking-wider">
                  Event-Specific Registration Answers
                </span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">
                  {customQuestions.length} Questions
                </span>
              </div>

              {customQuestions.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic py-2">
                  No additional custom questions were configured for this event.
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  {customQuestions.map((q, qIdx) => {
                    const ans = getAnswerForQuestion(selectedReg, q);
                    const isUrl = typeof ans === 'string' && /^https?:\/\//i.test(ans);
                    return (
                      <div
                        key={q.id || qIdx}
                        className="p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {qIdx + 1}. {q.label}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] font-mono">
                            {q.type}
                          </span>
                        </div>
                        <div className="text-xs pt-0.5">
                          {isUrl ? (
                            <a
                              href={ans}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="break-all">{ans}</span>
                            </a>
                          ) : (
                            <span className={ans === '—' ? 'text-[var(--text-muted)] italic' : 'font-medium text-[var(--text-primary)]'}>
                              {ans}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReg(null)}
                className="px-4 py-2 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface)] border border-[var(--border-color)] font-bold text-xs text-[var(--text-primary)] cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

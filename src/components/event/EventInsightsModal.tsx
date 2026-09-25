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
  QrCode,
  FileText,
  Search,
  Filter,
  X,
} from 'lucide-react';
import { TicketModal } from '../registration/TicketModal';

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

  // Search and Filter state for Registered Students
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'All' | 'Present' | 'Absent'>('All');
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'Paid' | 'Pending' | 'Free' | 'Failed'>('All');

  // Preview modals
  const [selectedStudentForQr, setSelectedStudentForQr] = useState<any | null>(null);
  const [selectedStudentForResponses, setSelectedStudentForResponses] = useState<any | null>(null);

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

  const registeredStudents: any[] = insights?.registeredStudents || [];

  const filteredStudents = registeredStudents.filter((student) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      student.studentName?.toLowerCase().includes(q) ||
      student.studentEmail?.toLowerCase().includes(q) ||
      student.registrationId?.toLowerCase().includes(q) ||
      student.passId?.toLowerCase().includes(q) ||
      student.studentCollege?.toLowerCase().includes(q);

    // Attendance filter
    let matchesAttendance = true;
    if (attendanceFilter === 'Present') matchesAttendance = Boolean(student.attended);
    if (attendanceFilter === 'Absent') matchesAttendance = !student.attended;

    // Payment filter
    let matchesPayment = true;
    if (paymentFilter === 'Paid') matchesPayment = student.paymentStatus === 'Completed';
    if (paymentFilter === 'Pending') matchesPayment = student.paymentStatus === 'Pending';
    if (paymentFilter === 'Free') matchesPayment = student.paymentStatus === 'Waived';
    if (paymentFilter === 'Failed') matchesPayment = student.paymentStatus === 'Failed';

    return matchesSearch && matchesAttendance && matchesPayment;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Event Analytics & Insights"
      subtitle={`${event.title} · Performance & Registered Students`}
      maxWidth="4xl"
    >
      <div className="space-y-6 py-2 max-h-[82vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="py-16 flex justify-center">
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
                  {insights.views ?? 0}
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
                  {insights.registrations ?? 0} / {insights.capacity || event.capacity}
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
                  {insights.attendanceRate || 0}% ({insights.attendanceCount ?? 0})
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
                  ${insights.revenue ?? 0}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-medium">
                  {event.isFree ? 'Free Event' : `Fee: $${event.registrationFee}`}
                </span>
              </div>
            </div>

            {/* Department & Institution Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-[var(--primary-color)]" /> Department Breakdown
                </h4>
                {Object.keys(insights.departmentBreakdown || {}).length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No participant registrations yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {Object.entries(insights.departmentBreakdown).map(([dept, count]: any) => (
                      <div key={dept} className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)] truncate">{dept}</span>
                        <span className="font-bold text-[var(--text-primary)]">{count} student(s)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[var(--primary-color)]" /> Participating Colleges
                </h4>
                {Object.keys(insights.collegeBreakdown || {}).length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No participant registrations yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {Object.entries(insights.collegeBreakdown).map(([col, count]: any) => (
                      <div key={col} className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)] truncate">{col}</span>
                        <span className="font-bold text-[var(--text-primary)]">{count} participant(s)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 8: REGISTERED STUDENTS LIST */}
            <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[var(--primary-color)]" />
                    Registered Students Roster ({filteredStudents.length} of {registeredStudents.length})
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Real canonical participant registrations, passes, and submission details.
                  </p>
                </div>
              </div>

              {/* Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative sm:col-span-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, email, pass ID..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] shrink-0">Attendance:</span>
                  <select
                    value={attendanceFilter}
                    onChange={(e: any) => setAttendanceFilter(e.target.value)}
                    className="grow p-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                  >
                    <option value="All">All Attendance</option>
                    <option value="Present">Present Only</option>
                    <option value="Absent">Absent Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] shrink-0">Payment:</span>
                  <select
                    value={paymentFilter}
                    onChange={(e: any) => setPaymentFilter(e.target.value)}
                    className="grow p-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                  >
                    <option value="All">All Payments</option>
                    <option value="Paid">Paid / Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Free">Free / Waived</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

              {/* Students List Table */}
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-muted)] bg-[var(--surface-subtle)]">
                  No registered participants match the active query or filter.
                </div>
              ) : (
                <div className="border border-[var(--border-color)] rounded-xl overflow-hidden divide-y divide-[var(--border-color)] max-h-80 overflow-y-auto bg-[var(--surface)]">
                  {filteredStudents.map((st) => (
                    <div
                      key={st._id}
                      className="p-3 hover:bg-[var(--surface-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors text-xs"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[var(--text-primary)]">{st.studentName}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]">
                            {st.registrationId}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              st.attended
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}
                          >
                            {st.attended ? 'Present' : 'Absent'}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                              st.paymentStatus === 'Completed' || st.paymentStatus === 'Waived'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}
                          >
                            {st.paymentStatus}
                          </span>
                        </div>

                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          {st.studentCollege} · {st.studentDepartment} ({st.studentYear}) · {st.studentEmail}
                        </p>

                        <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-2">
                          <span>Registered: {new Date(st.createdAt).toLocaleDateString()}</span>
                          {st.attendedAt && (
                            <span>Checked in: {new Date(st.attendedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {st.qrCodeUrl && (
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForQr(st)}
                            className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[var(--primary-color)]" /> View QR
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedStudentForResponses(st)}
                          className="px-2.5 py-1.5 rounded-lg bg-[var(--primary-color)] text-[var(--primary-text)] font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs active:scale-95"
                        >
                          <FileText className="w-3.5 h-3.5" /> Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal: View Canonical QR Pass */}
        {selectedStudentForQr && (
          <Modal
            isOpen={Boolean(selectedStudentForQr)}
            onClose={() => setSelectedStudentForQr(null)}
            title="Participant QR Ticket Pass"
            subtitle={`${selectedStudentForQr.studentName} · ${selectedStudentForQr.registrationId}`}
            maxWidth="sm"
          >
            <div className="p-4 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-md">
                <img
                  src={selectedStudentForQr.qrCodeUrl}
                  alt={`Pass QR ${selectedStudentForQr.registrationId}`}
                  className="w-52 h-52 object-contain"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                  Canonical Pass Token / ID
                </span>
                <span className="font-mono text-xs font-bold text-[var(--text-primary)] select-all block bg-[var(--surface-subtle)] px-2 py-1 rounded-md border border-[var(--border-color)]">
                  {selectedStudentForQr.passId || selectedStudentForQr.registrationId}
                </span>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] max-w-xs">
                This canonical QR ticket is identical to the one issued on the student pass and scanner desk.
              </p>

              <button
                type="button"
                onClick={() => setSelectedStudentForQr(null)}
                className="w-full py-2 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] font-bold text-xs cursor-pointer"
              >
                Close Pass Preview
              </button>
            </div>
          </Modal>
        )}

        {/* Modal: View Registration Form Responses */}
        {selectedStudentForResponses && (
          <Modal
            isOpen={Boolean(selectedStudentForResponses)}
            onClose={() => setSelectedStudentForResponses(null)}
            title="Registration Submission Details"
            subtitle={`${selectedStudentForResponses.studentName} (${selectedStudentForResponses.registrationId})`}
            maxWidth="md"
          >
            <div className="space-y-4 py-2">
              {/* Default student fields */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--surface-subtle)] p-3 rounded-xl border border-[var(--border-color)]">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">Student Name</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedStudentForResponses.studentName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">Email Address</span>
                  <span className="font-medium text-[var(--text-primary)] truncate block">{selectedStudentForResponses.studentEmail}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">College</span>
                  <span className="font-medium text-[var(--text-primary)]">{selectedStudentForResponses.studentCollege}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">Department & Year</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {selectedStudentForResponses.studentDepartment} ({selectedStudentForResponses.studentYear})
                  </span>
                </div>
              </div>

              {/* Custom Questions & Answers */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                  Custom Registration Form Answers:
                </span>

                {Object.keys(selectedStudentForResponses.customResponses || {}).length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic">
                    No custom event questions were submitted for this registration.
                  </p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {Object.entries(selectedStudentForResponses.customResponses || {}).map(([key, val]: any) => (
                      <div key={key} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)]">
                        <span className="font-bold text-[var(--text-secondary)] block mb-1">{key}</span>
                        <span className="font-semibold text-[var(--text-primary)] break-words block">
                          {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForResponses(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
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

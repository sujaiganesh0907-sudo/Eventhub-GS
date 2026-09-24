import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  QrCode,
  Scan,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  Users,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { IEvent, IEventRegistration } from '../../types';
import { api } from '../../services/api';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: IEvent;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Manual Attendance List State
  const [registrations, setRegistrations] = useState<IEventRegistration[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchAttendanceList = async () => {
    try {
      setLoadingList(true);
      const res = await api.get<any>(`/attendance/event/${event._id}`);
      if (res.success) {
        setRegistrations(res.registrations || []);
      }
    } catch (err) {
      console.error('Failed to fetch attendance list', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAttendanceList();
    }
  }, [isOpen, event._id]);

  const handleScanSubmit = async (tokenToUse?: string) => {
    const token = tokenToUse || qrTokenInput.trim();
    if (!token) return;

    setScanning(true);
    setScanResult(null);
    setScanError(null);

    try {
      const res = await api.post<any>('/attendance/scan', {
        eventId: event._id,
        qrToken: token,
      });

      if (res.success && res.valid) {
        setScanResult(res.registration);
      } else {
        setScanError(res.message || 'Ticket verification failed.');
      }
    } catch (err: any) {
      setScanError(err.message || 'Error communicating with attendance verification server.');
    } finally {
      setScanning(false);
    }
  };

  const handleConfirmAttendance = async (registrationId: string, status: 'Present' | 'Absent') => {
    setMarkingId(registrationId);
    try {
      const res = await api.post<any>('/attendance/mark', {
        registrationId,
        status,
      });

      if (res.success) {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.registrationId === registrationId || r._id === registrationId
              ? { ...r, attended: status === 'Present', attendedAt: status === 'Present' ? new Date().toISOString() : undefined }
              : r
          )
        );

        if (scanResult && (scanResult.registrationId === registrationId || scanResult._id === registrationId)) {
          setScanResult({
            ...scanResult,
            attended: status === 'Present',
          });
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update attendance');
    } finally {
      setMarkingId(null);
    }
  };

  // Stats calculation
  const totalRegistered = registrations.length;
  const presentCount = registrations.filter((r) => r.attended).length;
  const absentCount = totalRegistered - presentCount;

  const filteredRegistrations = registrations.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.studentName.toLowerCase().includes(q) ||
      r.registrationId.toLowerCase().includes(q) ||
      r.studentEmail.toLowerCase().includes(q) ||
      r.studentCollege.toLowerCase().includes(q)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance & Check-in Desk"
      subtitle={`${event.title} · ${event.eventDate}`}
      maxWidth="3xl"
    >
      <div className="space-y-4 py-2">
        {/* Attendance Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-center">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
              Total Registrations
            </span>
            <span className="text-xl font-black text-[var(--text-primary)]">{totalRegistered}</span>
          </div>
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block">
              Checked In (Present)
            </span>
            <span className="text-xl font-black text-emerald-600">{presentCount}</span>
          </div>
          <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-center">
            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
              Pending / Absent
            </span>
            <span className="text-xl font-black text-[var(--text-secondary)]">{absentCount}</span>
          </div>
        </div>

        {/* Tab Toggle: Scan Desk vs Manual Attendance */}
        <div className="flex border-b border-[var(--border-color)]">
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scan'
                ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Scan className="w-4 h-4" /> QR Code Scanner
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users className="w-4 h-4" /> Manual Check-in Roster ({registrations.length})
          </button>
        </div>

        {/* SCAN DESK TAB */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Scan Pass / Enter Registration Pass ID or QR Token
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={qrTokenInput}
                  onChange={(e) => setQrTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScanSubmit()}
                  placeholder="Paste QR token string or type Pass ID (e.g. REG-12345)"
                  className="grow p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] font-mono focus:outline-hidden"
                />
                <button
                  type="button"
                  disabled={scanning || !qrTokenInput.trim()}
                  onClick={() => handleScanSubmit()}
                  className="px-5 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                  Verify Ticket
                </button>
              </div>

              {/* Quick test badges with actual registered participants */}
              {registrations.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase block mb-1">
                    Quick test scan simulation:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {registrations.slice(0, 3).map((r) => (
                      <button
                        key={r._id}
                        type="button"
                        onClick={() => {
                          setQrTokenInput(r.qrToken);
                          handleScanSubmit(r.qrToken);
                        }}
                        className="px-2 py-1 rounded-md text-[11px] font-mono bg-[var(--surface)] border border-[var(--border-color)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] cursor-pointer"
                      >
                        {r.studentName} ({r.registrationId})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Scan Error Notice */}
            {scanError && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 flex items-start gap-3">
                <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold">Entry Denied / Ticket Invalid</h4>
                  <p className="text-xs mt-0.5">{scanError}</p>
                </div>
              </div>
            )}

            {/* Scan Success Box */}
            {scanResult && (
              <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                    <h4 className="text-sm font-bold">Ticket Verified Valid</h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--text-muted)]">
                    {scanResult.registrationId}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">Participant</span>
                    <span className="font-bold text-[var(--text-primary)]">{scanResult.studentName}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">College</span>
                    <span className="font-bold text-[var(--text-primary)] truncate block">
                      {scanResult.studentCollege}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">Type</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {scanResult.registrationType}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">Payment</span>
                    <span className="font-bold text-emerald-600">{scanResult.paymentStatus}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                  <div>
                    {scanResult.attended ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Already marked Present
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">Attendance pending check-in</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!scanResult.attended ? (
                      <button
                        type="button"
                        disabled={markingId === scanResult._id}
                        onClick={() => handleConfirmAttendance(scanResult._id, 'Present')}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <UserCheck className="w-4 h-4" /> Mark Attendance (Present)
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={markingId === scanResult._id}
                        onClick={() => handleConfirmAttendance(scanResult._id, 'Absent')}
                        className="px-4 py-2 rounded-xl border border-red-500/20 text-red-600 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserX className="w-4 h-4" /> Mark as Absent
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANUAL ROSTER TAB */}
        {activeTab === 'manual' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by participant name, pass ID, email, or institution..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>

            {loadingList ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="p-8 text-center border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-muted)]">
                No matching registrations found.
              </div>
            ) : (
              <div className="border border-[var(--border-color)] rounded-xl overflow-hidden divide-y divide-[var(--border-color)] max-h-80 overflow-y-auto">
                {filteredRegistrations.map((reg) => (
                  <div key={reg._id} className="p-3 bg-[var(--surface)] hover:bg-[var(--surface-subtle)] flex items-center justify-between gap-3 transition-colors">
                    <div className="grow min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {reg.studentName}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]">
                          {reg.registrationId}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        {reg.studentCollege} · {reg.studentDepartment}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          reg.attended
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {reg.attended ? 'Present' : 'Pending'}
                      </span>

                      <button
                        type="button"
                        disabled={markingId === reg._id}
                        onClick={() => handleConfirmAttendance(reg._id, reg.attended ? 'Absent' : 'Present')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          reg.attended
                            ? 'border border-red-500/20 text-red-600 hover:bg-red-500/10'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {reg.attended ? 'Mark Absent' : 'Mark Present'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};

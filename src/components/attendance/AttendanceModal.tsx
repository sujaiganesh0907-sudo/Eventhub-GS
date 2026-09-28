import React, { useState, useEffect, useRef } from 'react';
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
  Download,
  Camera,
  CameraOff,
  FileText,
  Mail,
  RefreshCw,
  ExternalLink,
  Award,
  Lock,
} from 'lucide-react';
import { IEvent } from '../../types';
import { api } from '../../services/api';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { DocxCertificateManagerModal } from '../certificate/DocxCertificateManagerModal';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: IEvent;
  onEventUpdated?: () => void;
}

export const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  onClose,
  event,
  onEventUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Roster / List State
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Finalization State
  const [isFinalized, setIsFinalized] = useState(Boolean(event.attendanceFinalized));
  const [finalizedAt, setFinalizedAt] = useState<string | null>(event.attendanceFinalizedAt || null);
  const [isConfirmingFinalize, setIsConfirmingFinalize] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizationNotice, setFinalizationNotice] = useState<string | null>(null);

  // Custom Answers View State
  const [viewingResponsesParticipant, setViewingResponsesParticipant] = useState<any | null>(null);
  const [retryingEmailId, setRetryingEmailId] = useState<string | null>(null);
  const [exportingReport, setExportingReport] = useState(false);
  const [showDocxCertModal, setShowDocxCertModal] = useState(false);

  // Fetch Attendance List
  const fetchAttendanceList = async () => {
    try {
      setLoadingList(true);
      const res = await api.get<any>(`/attendance/event/${event._id}`);
      if (res.success) {
        setRegistrations(res.list || []);
        setIsFinalized(Boolean(res.attendanceFinalized));
        setFinalizedAt(res.finalizedAt);
      }
    } catch (err) {
      console.error('Failed to fetch attendance roster', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAttendanceList();
    } else {
      stopCamera();
      setScanResult(null);
      setScanError(null);
      setIsCameraActive(false);
    }
  }, [isOpen, event._id]);

  // Clean up camera on unmount or tab change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setScanError(null);

    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {
          // ignore
        }
      }

      const scannerId = 'attendance-qr-reader';
      const html5QrCode = new Html5Qrcode(scannerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      setIsCameraActive(true);

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      const handleScanSuccess = async (decodedText: string) => {
        // Play quick feedback beep
        await stopCamera();
        handleVerifyTicket(decodedText);
      };

      // Try environment (rear) camera first, fallback to user camera
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          handleScanSuccess,
          () => {}
        );
      } catch (rearErr) {
        // Fallback to any available video input
        await html5QrCode.start(
          { facingMode: 'user' },
          config,
          handleScanSuccess,
          () => {}
        );
      }
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setIsCameraActive(false);
      setCameraError(
        err.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access in your browser settings to scan QR tickets.'
          : 'Unable to start camera. Please verify device camera is connected or use manual Pass ID entry.'
      );
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleVerifyTicket = async (tokenOrPayload?: string) => {
    const raw = tokenOrPayload || qrTokenInput.trim();
    if (!raw) return;

    setVerifying(true);
    setScanResult(null);
    setScanError(null);

    try {
      const res = await api.post<any>('/attendance/scan', {
        eventId: event._id,
        qrData: raw,
        rawToken: raw,
      });

      if (res.success && res.valid) {
        setScanResult(res.participant);
        setQrTokenInput('');
      } else {
        setScanError(res.message || 'Ticket verification failed.');
      }
    } catch (err: any) {
      setScanError(err.message || 'Error communicating with attendance verification server.');
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmAttendance = async (registrationId: string, status: 'Present' | 'Absent') => {
    setMarkingId(registrationId);
    try {
      const res = await api.post<any>('/attendance/mark', {
        eventId: event._id,
        registrationId,
        status,
        method: isCameraActive ? 'QR_SCAN' : 'MANUAL',
      });

      if (res.success) {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.registrationId === registrationId || r._id === registrationId
              ? {
                  ...r,
                  status,
                  attended: status === 'Present',
                  attendedAt: status === 'Present' ? new Date().toISOString() : null,
                  attendanceMethod: isCameraActive ? 'QR_SCAN' : 'MANUAL',
                }
              : r
          )
        );

        if (
          scanResult &&
          (scanResult.registrationId === registrationId || scanResult._id === registrationId)
        ) {
          setScanResult({
            ...scanResult,
            attended: status === 'Present',
            attendedAt: status === 'Present' ? new Date().toISOString() : null,
          });
        }

        if (onEventUpdated) onEventUpdated();
      } else {
        alert(res.message || 'Failed to update attendance');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update attendance');
    } finally {
      setMarkingId(null);
    }
  };

  const handleFinalizeAttendance = async () => {
    setFinalizing(true);
    setFinalizationNotice(null);
    try {
      const res = await api.post<any>(`/attendance/event/${event._id}/finalize`, {});
      if (res.success) {
        setIsFinalized(true);
        setFinalizedAt(res.finalizedAt);
        setFinalizationNotice(
          `Attendance successfully finalized! ${res.certificatesGenerated} participation certificates generated and sent.`
        );
        setIsConfirmingFinalize(false);
        fetchAttendanceList();
        if (onEventUpdated) onEventUpdated();
      } else {
        alert(res.message || 'Failed to finalize attendance');
      }
    } catch (err: any) {
      alert(err.message || 'Error finalizing attendance.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownloadReport = async () => {
    setExportingReport(true);
    try {
      const token = localStorage.getItem('eventhub_token');
      const response = await fetch(`/api/attendance/event/${event._id}/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${event._id}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download report');
    } finally {
      setExportingReport(false);
    }
  };

  const handleRetryEmail = async (certIdOrRegId: string) => {
    setRetryingEmailId(certIdOrRegId);
    try {
      const res = await api.post<any>(`/certificates/${certIdOrRegId}/retry-email`, {});
      if (res.success) {
        alert(res.message || 'Certificate email dispatched successfully.');
        fetchAttendanceList();
      } else {
        alert(res.message || 'Failed to retry email.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to retry email delivery.');
    } finally {
      setRetryingEmailId(null);
    }
  };

  // Stats calculation
  const totalRegistered = registrations.length;
  const presentCount = registrations.filter((r) => r.attended || r.status === 'Present').length;
  const absentCount = totalRegistered - presentCount;

  const filteredRegistrations = registrations.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.studentName?.toLowerCase().includes(q) ||
      r.registrationId?.toLowerCase().includes(q) ||
      r.studentEmail?.toLowerCase().includes(q) ||
      r.studentCollege?.toLowerCase().includes(q) ||
      r.qrToken?.toLowerCase().includes(q);

    const isPresent = r.attended || r.status === 'Present';
    if (statusFilter === 'present') return matchesSearch && isPresent;
    if (statusFilter === 'absent') return matchesSearch && !isPresent;
    return matchesSearch;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Check-In Desk & Attendance"
      subtitle={`${event.title} · ${event.eventDate}`}
      maxWidth="4xl"
    >
      <div className="space-y-4 py-2">
        {/* Finalization Notice Banner */}
        {isFinalized && (
          <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 text-indigo-600" />
              <div>
                <span className="font-bold">Attendance Finalized</span>
                <span className="text-indigo-600/80 ml-2">
                  Locked on {finalizedAt ? new Date(finalizedAt).toLocaleString() : 'Today'}.
                  Participation certificates generated.
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold uppercase">
              FINALIZED
            </span>
          </div>
        )}

        {finalizationNotice && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{finalizationNotice}</span>
          </div>
        )}

        {/* Attendance Stats Cards & Top Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="grid grid-cols-3 gap-2.5 flex-1">
            <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">
                Total Passes
              </span>
              <span className="text-lg font-black text-[var(--text-primary)]">{totalRegistered}</span>
            </div>
            <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                Present (Checked In)
              </span>
              <span className="text-lg font-black text-emerald-600">{presentCount}</span>
            </div>
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-600 block">
                Absent / Pending
              </span>
              <span className="text-lg font-black text-amber-600">{absentCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={exportingReport || registrations.length === 0}
              onClick={handleDownloadReport}
              className="px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {exportingReport ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-color)]" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download CSV
            </button>

            <button
              type="button"
              onClick={() => setShowDocxCertModal(true)}
              className="px-3.5 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-indigo-600" /> Participation Certificates (DOCX)
            </button>

            {!isFinalized ? (
              <button
                type="button"
                onClick={() => setIsConfirmingFinalize(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Award className="w-4 h-4" /> Finish Attendance
              </button>
            ) : null}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('scan');
            }}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scan'
                ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Scan className="w-4 h-4" /> Scan & Check-In Desk
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('manual');
            }}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users className="w-4 h-4" /> Attendance Roster ({registrations.length})
          </button>
        </div>

        {/* TAB 1: SCAN DESK */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Camera Scanner Box */}
              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-[var(--primary-color)]" /> Real-time Camera Scanner
                    </span>
                    {isCameraActive && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 text-[10px] font-bold animate-pulse">
                        Camera Live
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Point your device camera directly at the student's EVENTHUB QR ticket.
                  </p>
                </div>

                {/* Viewfinder container */}
                <div className="relative w-full aspect-square max-h-64 mx-auto rounded-xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center border border-[var(--border-color)] shadow-inner">
                  <div id="attendance-qr-reader" className="w-full h-full object-cover" />
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-400 bg-slate-900/90 space-y-2">
                      <Scan className="w-12 h-12 text-slate-500 stroke-1" />
                      <p className="text-xs font-semibold text-slate-300">Camera is idle</p>
                      <p className="text-[11px] text-slate-400 max-w-xs">
                        Click below to launch device camera and verify student passes.
                      </p>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{cameraError}</span>
                  </div>
                )}

                <div className="pt-2">
                  {!isCameraActive ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Camera className="w-4 h-4" /> Start Camera Scanner
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CameraOff className="w-4 h-4" /> Stop Camera
                    </button>
                  )}
                </div>
              </div>

              {/* Manual Pass ID / Token Box */}
              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[var(--text-primary)]">
                    Manual Pass ID / Secure QR Token Entry
                  </label>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Enter the student's Registration ID (e.g. EH-2026-XXXX) or paste the Pass Token directly.
                  </p>

                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={qrTokenInput}
                      onChange={(e) => setQrTokenInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyTicket()}
                      placeholder="e.g. EH-2026-ABCDEF or paste token"
                      className="grow p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] font-mono focus:outline-hidden"
                    />
                    <button
                      type="button"
                      disabled={verifying || !qrTokenInput.trim()}
                      onClick={() => handleVerifyTicket()}
                      className="px-4 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                      Verify
                    </button>
                  </div>
                </div>

                {/* Quick Simulation Badges */}
                {registrations.length > 0 && (
                  <div className="pt-3 border-t border-[var(--border-color)]">
                    <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider block mb-2">
                      Recent Registered Passes (Click to test):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {registrations.slice(0, 6).map((r) => (
                        <button
                          key={r._id}
                          type="button"
                          onClick={() => {
                            setQrTokenInput(r.registrationId);
                            handleVerifyTicket(r.registrationId);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[var(--surface)] border border-[var(--border-color)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] cursor-pointer flex items-center gap-1"
                        >
                          <span className="font-bold">{r.studentName}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">({r.registrationId})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scan Error Message */}
            {scanError && (
              <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-600 flex items-start gap-3">
                <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold">Pass Verification Failed</h4>
                  <p className="text-xs mt-0.5">{scanError}</p>
                </div>
              </div>
            )}

            {/* Scan Success / Participant Details Card */}
            {scanResult && (
              <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-4 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                    <h4 className="text-sm font-bold">Ticket Pass Authenticated & Valid</h4>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-color)]">
                    {scanResult.registrationId}
                  </span>
                </div>

                {/* Participant profile header */}
                <div className="flex items-center gap-3">
                  {scanResult.profilePhoto ? (
                    <img
                      src={scanResult.profilePhoto}
                      alt={scanResult.studentName}
                      className="w-12 h-12 rounded-full object-cover border border-[var(--border-color)] shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[var(--primary-color)] text-[var(--primary-text)] font-black text-base flex items-center justify-center shrink-0">
                      {scanResult.studentName?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      {scanResult.studentName}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {scanResult.studentCollege} · {scanResult.studentDepartment} ({scanResult.studentYear})
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[var(--surface)] p-3.5 rounded-xl border border-[var(--border-color)]">
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Email</span>
                    <span className="font-semibold text-[var(--text-primary)] truncate block">{scanResult.studentEmail}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Phone</span>
                    <span className="font-semibold text-[var(--text-primary)]">{scanResult.studentPhone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Pass ID / Token</span>
                    <span className="font-mono text-[var(--text-primary)] text-[10px] truncate block">{scanResult.passId}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Payment Status</span>
                    <span className="font-bold text-emerald-600">{scanResult.paymentStatus}</span>
                  </div>
                </div>

                {/* Custom Responses Section if available */}
                {scanResult.customResponses && Object.keys(scanResult.customResponses).length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Submitted Registration Responses & Custom Fields:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {Object.entries(scanResult.customResponses).map(([key, val]: any) => (
                        <div key={key} className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-color)]">
                          <span className="font-semibold text-[var(--text-secondary)] text-[11px] block">{key}</span>
                          <span className="font-bold text-[var(--text-primary)] text-xs block break-words">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Confirmation Action */}
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    {scanResult.attended ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Marked Present
                        {scanResult.attendedAt && (
                          <span className="text-[11px] font-normal text-[var(--text-muted)]">
                            ({new Date(scanResult.attendedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">Pending Check-in Confirmation</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!scanResult.attended ? (
                      <button
                        type="button"
                        disabled={markingId === scanResult.registrationId}
                        onClick={() => handleConfirmAttendance(scanResult.registrationId, 'Present')}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        <UserCheck className="w-4 h-4" /> Mark Attendance (Present)
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={markingId === scanResult.registrationId}
                        onClick={() => handleConfirmAttendance(scanResult.registrationId, 'Absent')}
                        className="px-4 py-2 rounded-xl border border-red-500/20 text-red-600 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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

        {/* TAB 2: ATTENDANCE ROSTER */}
        {activeTab === 'manual' && (
          <div className="space-y-3">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by student name, pass ID, email, or department..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1 bg-[var(--surface-subtle)] p-1 rounded-xl border border-[var(--border-color)]">
                {(['all', 'present', 'absent'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setStatusFilter(mode)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all capitalize cursor-pointer ${
                      statusFilter === mode
                        ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* List Table */}
            {loadingList ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary-color)]" />
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="p-8 text-center border border-[var(--border-color)] rounded-2xl text-xs text-[var(--text-muted)] bg-[var(--surface)]">
                No matching participant passes found for this filter.
              </div>
            ) : (
              <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden divide-y divide-[var(--border-color)] max-h-96 overflow-y-auto bg-[var(--surface)]">
                {filteredRegistrations.map((reg) => {
                  const isPresent = reg.attended || reg.status === 'Present';
                  return (
                    <div
                      key={reg._id}
                      className="p-3.5 hover:bg-[var(--surface-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {reg.studentName}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]">
                            {reg.registrationId}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              isPresent
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}
                          >
                            {isPresent ? 'Present' : 'Absent'}
                          </span>
                          {reg.attendanceMethod && (
                            <span className="text-[10px] font-medium text-[var(--text-muted)]">
                              via {reg.attendanceMethod === 'QR_SCAN' ? 'QR Scan' : 'Manual'}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          {reg.studentCollege} · {reg.studentDepartment} ({reg.studentYear}) · {reg.studentEmail}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                          <span>
                            Certificate:{' '}
                            <strong
                              className={
                                reg.certificateStatus === 'Sent' || reg.certificateStatus === 'Generated'
                                  ? 'text-emerald-600'
                                  : reg.certificateStatus === 'Failed'
                                  ? 'text-red-500'
                                  : 'text-[var(--text-secondary)]'
                              }
                            >
                              {reg.certificateStatus || (isPresent ? 'Pending' : 'Not Eligible')}
                            </strong>
                          </span>
                          {reg.customResponses && Object.keys(reg.customResponses).length > 0 && (
                            <button
                              type="button"
                              onClick={() => setViewingResponsesParticipant(reg)}
                              className="text-[var(--primary-color)] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                            >
                              <FileText className="w-3 h-3" /> View Responses
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {reg.certificateStatus === 'Failed' && (
                          <button
                            type="button"
                            disabled={retryingEmailId === reg.registrationId}
                            onClick={() => handleRetryEmail(reg.registrationId)}
                            className="px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            {retryingEmailId === reg.registrationId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            Retry Email
                          </button>
                        )}

                        {reg.certificateFileUrl && (
                          <a
                            href={reg.certificateFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" /> Cert PDF
                          </a>
                        )}

                        <button
                          type="button"
                          disabled={markingId === reg.registrationId}
                          onClick={() => handleConfirmAttendance(reg.registrationId, isPresent ? 'Absent' : 'Present')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                            isPresent
                              ? 'border border-red-500/20 text-red-600 hover:bg-red-500/10'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {isPresent ? 'Mark Absent' : 'Mark Present'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* View Custom Responses Modal */}
        {viewingResponsesParticipant && (
          <Modal
            isOpen={Boolean(viewingResponsesParticipant)}
            onClose={() => setViewingResponsesParticipant(null)}
            title="Participant Registration Answers"
            subtitle={`${viewingResponsesParticipant.studentName} (${viewingResponsesParticipant.registrationId})`}
            maxWidth="md"
          >
            <div className="space-y-3 py-2">
              <div className="space-y-2 text-xs">
                {Object.entries(viewingResponsesParticipant.customResponses || {}).map(([key, val]: any) => (
                  <div key={key} className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)]">
                    <span className="font-bold text-[var(--text-secondary)] block mb-0.5">{key}</span>
                    <span className="text-[var(--text-primary)] font-medium break-words">
                      {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingResponsesParticipant(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Finish Attendance Confirmation Modal */}
        {isConfirmingFinalize && (
          <Modal
            isOpen={isConfirmingFinalize}
            onClose={() => setIsConfirmingFinalize(false)}
            title="Finish Event Attendance?"
            subtitle={event.title}
            maxWidth="md"
          >
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Important Confirmation</span>
                </div>
                <p>
                  Finish attendance for this event? After finalization, the attendance roster will be locked,
                  and <strong>Participation Certificates</strong> will be automatically generated and delivered
                  to all <strong>Present</strong> participants.
                </p>
                <p className="font-semibold">
                  Absent participants will NOT receive a participation certificate.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  disabled={finalizing}
                  onClick={() => setIsConfirmingFinalize(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={finalizing}
                  onClick={handleFinalizeAttendance}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {finalizing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Award className="w-4 h-4" />
                  )}
                  {finalizing ? 'Finalizing & Generating...' : 'Confirm & Finalize Attendance'}
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
            Close Desk
          </button>
        </div>

        {/* DOCX CERTIFICATE MANAGER MODAL */}
        {showDocxCertModal && (
          <DocxCertificateManagerModal
            isOpen={showDocxCertModal}
            onClose={() => setShowDocxCertModal(false)}
            event={event}
            onUpdated={() => {
              fetchAttendanceList();
              onEventUpdated?.();
            }}
          />
        )}
      </div>
    </Modal>
  );
};

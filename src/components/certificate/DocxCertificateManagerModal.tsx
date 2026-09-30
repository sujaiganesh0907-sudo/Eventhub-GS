import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { IEvent } from '../../types';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Award,
  Users,
  Settings2,
  Eye,
  Send,
  Lock,
  Download,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DocxCertificateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: IEvent;
  initialTab?: 'upload' | 'mapping' | 'issuance';
  onUpdated?: () => void;
}

export const DocxCertificateManagerModal: React.FC<DocxCertificateManagerModalProps> = ({
  isOpen,
  onClose,
  event,
  initialTab,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'mapping' | 'issuance'>(
    initialTab || (event.certificateTemplate?.isActivated ? 'issuance' : 'upload')
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Template State
  const [template, setTemplate] = useState<any>(event.certificateTemplate || null);
  const [detectedPlaceholders, setDetectedPlaceholders] = useState<string[]>(
    event.certificateTemplate?.detectedPlaceholders || []
  );
  const [mappings, setMappings] = useState<Record<string, any>>(
    event.certificateTemplate?.mappings || {}
  );
  const [isActivated, setIsActivated] = useState<boolean>(
    Boolean(event.certificateTemplate?.isActivated)
  );
  const [registrationQuestions, setRegistrationQuestions] = useState<any[]>(
    event.registrationQuestions || []
  );

  // Uploading state
  const [uploading, setUploading] = useState(false);

  // Attendees state (Present only)
  const [presentAttendees, setPresentAttendees] = useState<any[]>([]);
  const [absentCount, setAbsentCount] = useState<number>(0);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  // Preview state
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);

  // Issuance state
  const [issuing, setIssuing] = useState(false);
  const [issuanceProgress, setIssuanceProgress] = useState<string | null>(null);

  // Fetch current template config & attendance
  const fetchTemplateAndAttendees = async () => {
    try {
      setLoading(true);
      setError(null);

      const [tmplRes, attRes] = await Promise.all([
        api.get<any>(`/events/${event._id}/certificate-template`),
        api.get<any>(`/attendance/event/${event._id}`),
      ]);

      if (tmplRes.success && tmplRes.template) {
        setTemplate(tmplRes.template);
        setDetectedPlaceholders(tmplRes.template.detectedPlaceholders || []);
        setMappings(tmplRes.template.mappings || {});
        setIsActivated(Boolean(tmplRes.template.isActivated));
        if (tmplRes.registrationQuestions) {
          setRegistrationQuestions(tmplRes.registrationQuestions);
        }
      }

      if (attRes.success && attRes.list) {
        // Filter ONLY Present participants (Requirement 1.1)
        const present = attRes.list.filter((r: any) => r.attended || r.status === 'Present');
        const absent = attRes.list.filter((r: any) => !r.attended && r.status !== 'Present');
        setPresentAttendees(present);
        setAbsentCount(absent.length);
      }
    } catch (err: any) {
      console.error('Failed to load template or attendees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      } else {
        setActiveTab(event.certificateTemplate?.isActivated ? 'issuance' : 'upload');
      }
      fetchTemplateAndAttendees();
    } else {
      setError(null);
      setSuccess(null);
      setPreviewResult(null);
    }
  }, [isOpen, event._id, initialTab]);

  // Handle DOCX file upload strictly
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Requirement 1.2: Reject other types with "Only DOCX certificate templates are supported."
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'docx') {
      setError('Only DOCX certificate templates are supported.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post<any>(`/events/${event._id}/certificate-template`, formData);
      if (res.success) {
        setTemplate(res.template);
        setDetectedPlaceholders(res.placeholders || []);
        setMappings(res.template.mappings || {});
        setIsActivated(Boolean(res.template.isActivated));
        setSuccess(`Template uploaded! Detected ${res.placeholders?.length || 0} placeholders.`);
        setActiveTab('mapping');
        onUpdated?.();
      } else {
        setError(res.message || 'Failed to upload template.');
      }
    } catch (err: any) {
      setError(err.message || 'Only DOCX certificate templates are supported.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Handle mapping changes
  const handleMappingChange = (placeholder: string, updates: any) => {
    setMappings((prev) => ({
      ...prev,
      [placeholder]: {
        ...(prev[placeholder] || {}),
        ...updates,
      },
    }));
  };

  // Save Mappings & Activate
  const handleSaveMappings = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await api.put<any>(`/events/${event._id}/certificate-template/mappings`, {
        mappings,
      });

      if (res.success) {
        setIsActivated(true);
        setTemplate(res.template);
        setSuccess('All placeholder mappings verified and template activated!');
        setActiveTab('issuance');
        onUpdated?.();
      } else {
        setError(res.message || 'Failed to save mappings.');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving placeholder mappings.');
    } finally {
      setLoading(false);
    }
  };

  // Preview Sample Certificate for 1 participant
  const handlePreviewSample = async (participantRegistrationId?: string) => {
    setPreviewing(true);
    setError(null);
    try {
      const res = await api.post<any>(`/events/${event._id}/certificate-template/preview`, {
        registrationId: participantRegistrationId,
      });

      if (res.success) {
        setPreviewResult(res.preview);
      } else {
        setError(res.message || 'Failed to generate preview certificate.');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating preview certificate.');
    } finally {
      setPreviewing(false);
    }
  };

  // Confirm, Generate & Send All Certificates (Requirement 1.4)
  const handleBulkIssueAndSend = async () => {
    if (presentAttendees.length === 0) {
      setError('No Present participants to issue certificates for.');
      return;
    }

    if (!confirm(`Are you sure you want to generate and issue verified certificates to all ${presentAttendees.length} Present participants? This will upload certificates and notify each student.`)) {
      return;
    }

    setIssuing(true);
    setError(null);
    setSuccess(null);
    setIssuanceProgress(`Generating certificates for ${presentAttendees.length} participants...`);

    try {
      const res = await api.post<any>(`/events/${event._id}/certificate-template/generate-and-send`, {});

      if (res.success) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setSuccess(res.message || `Successfully generated and delivered ${res.generatedCount} certificates!`);
        fetchTemplateAndAttendees();
        onUpdated?.();
      } else {
        setError(res.message || 'Failed to generate certificates.');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing certificate issuance.');
    } finally {
      setIssuing(false);
      setIssuanceProgress(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Participation Certificate Hub (DOCX)"
      subtitle={`${event.title} · Auto-Fill, Verify & Deliver`}
      maxWidth="4xl"
    >
      <div className="space-y-4 py-2">
        {/* Error and Success Banners */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Step Navigation Bar */}
        <div className="flex border-b border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'upload'
                ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>1. Upload DOCX Template</span>
            {template && (
              <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mapping')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'mapping'
                ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>2. Placeholder Mapping</span>
            {isActivated ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 font-bold">
                Activated
              </span>
            ) : detectedPlaceholders.length > 0 ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 font-bold">
                {detectedPlaceholders.length} tags
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('issuance')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'issuance'
                ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Verify & Issue ({presentAttendees.length} Present)</span>
          </button>
        </div>

        {/* TAB 1: UPLOAD DOCX TEMPLATE */}
        {activeTab === 'upload' && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--primary-color)]" />
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  Upload Microsoft Word (.docx) Certificate Template
                </h4>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Design your participation certificate in Microsoft Word using double-curly placeholders like{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--primary-color)] font-mono text-[11px] font-bold">
                  {'{{student_name}}'}
                </code>
                ,{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--primary-color)] font-mono text-[11px] font-bold">
                  {'{{college_name}}'}
                </code>
                , and{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--primary-color)] font-mono text-[11px] font-bold">
                  {'{{certificate_id}}'}
                </code>
                . Only <span className="font-bold text-[var(--text-primary)]">.docx</span> files are supported.
              </p>
            </div>

            {/* Current Template Card */}
            {template ? (
              <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                      DOCX
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[var(--text-primary)]">
                        {template.fileName || 'Active Certificate Template.docx'}
                      </h5>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Uploaded on {template.uploadedAt ? new Date(template.uploadedAt).toLocaleString() : 'Recently'} · {detectedPlaceholders.length} placeholders detected
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600 text-white">
                      Active Template
                    </span>
                    <a
                      href={template.fileUrl}
                      download
                      className="p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1"
                      title="Download Template"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {detectedPlaceholders.length > 0 && (
                  <div className="pt-2 border-t border-emerald-500/20">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block mb-1">
                      Detected Placeholders in Document:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {detectedPlaceholders.map((ph) => (
                        <span
                          key={ph}
                          className="px-2 py-0.5 rounded-md bg-[var(--surface)] border border-[var(--border-color)] text-[11px] font-mono font-semibold text-[var(--primary-color)]"
                        >
                          {`{{${ph}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-3">
                <FileText className="w-12 h-12 mx-auto text-[var(--text-muted)]" />
                <div>
                  <h5 className="text-sm font-bold text-[var(--text-primary)]">
                    No certificate template uploaded yet
                  </h5>
                  <p className="text-xs text-[var(--text-muted)]">
                    Upload your institution's official .docx certificate template to begin.
                  </p>
                </div>
              </div>
            )}

            {/* Upload Input Area */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]">
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  {template ? 'Replace / Upload New DOCX Template' : 'Choose DOCX Template File'}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Must be .docx format (Maximum 15MB)
                </span>
              </div>

              <label className="px-4 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing DOCX...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Browse .docx</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* TAB 2: PLACEHOLDER DETECTION & MAPPING */}
        {activeTab === 'mapping' && (
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-700 flex items-center gap-2.5 text-xs">
              <Info className="w-4 h-4 shrink-0 text-blue-600" />
              <span>
                Verify that each tag detected in your DOCX file matches the right student or event field.
                Standard tags are mapped automatically.
              </span>
            </div>

            {detectedPlaceholders.length === 0 ? (
              <div className="p-10 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
                <h5 className="text-xs font-bold text-[var(--text-primary)]">
                  No placeholders detected in template
                </h5>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Add tags like {'{{student_name}}'} or {'{{college_name}}'} inside your Word document and re-upload.
                </p>
              </div>
            ) : (
              <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--surface)]">
                <div className="p-3 border-b border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center justify-between text-xs font-bold text-[var(--text-muted)] uppercase">
                  <span>Detected Placeholder</span>
                  <span>Data Source & Mapping</span>
                </div>

                <div className="divide-y divide-[var(--border-color)]">
                  {detectedPlaceholders.map((ph) => {
                    const currentMapping = mappings[ph] || { sourceType: 'auto' };
                    const isStandard = [
                      'student_name',
                      'college_name',
                      'department',
                      'year',
                      'event_name',
                      'event_date',
                      'registration_id',
                      'certificate_id',
                      'student_email',
                      'event_category',
                      'host_college',
                    ].includes(ph.toLowerCase());

                    return (
                      <div key={ph} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[var(--primary-color)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                              {`{{${ph}}}`}
                            </span>
                            {isStandard && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                                Standard Auto-Mapped
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[var(--text-muted)] block mt-1">
                            {isStandard
                              ? `Auto-populates from participant's registered ${ph.replace(/_/g, ' ')}`
                              : 'Custom placeholder: select data source or enter fixed value'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 min-w-[280px]">
                          {isStandard ? (
                            <div className="px-3 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] w-full flex items-center justify-between">
                              <span>System Field: {ph}</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            </div>
                          ) : (
                            <div className="space-y-1.5 w-full">
                              <select
                                value={currentMapping.sourceType || 'fixed_text'}
                                onChange={(e) =>
                                  handleMappingChange(ph, {
                                    sourceType: e.target.value,
                                    sourceField: e.target.value === 'registration_question' ? registrationQuestions[0]?.id : undefined,
                                  })
                                }
                                className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs font-medium"
                              >
                                <option value="fixed_text">Fixed Text</option>
                                <option value="student_field">Student Field</option>
                                <option value="event_field">Event Field</option>
                                {registrationQuestions.length > 0 && (
                                  <option value="registration_question">Registration Question Answer</option>
                                )}
                              </select>

                              {currentMapping.sourceType === 'fixed_text' && (
                                <input
                                  type="text"
                                  placeholder="Enter fixed text value"
                                  value={currentMapping.fixedValue || ''}
                                  onChange={(e) => handleMappingChange(ph, { fixedValue: e.target.value })}
                                  className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                                />
                              )}

                              {currentMapping.sourceType === 'registration_question' && (
                                <select
                                  value={currentMapping.sourceField || ''}
                                  onChange={(e) => handleMappingChange(ph, { sourceField: e.target.value })}
                                  className="w-full p-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                                >
                                  {registrationQuestions.map((q) => (
                                    <option key={q.id} value={q.id}>
                                      {q.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveMappings}
                disabled={loading || detectedPlaceholders.length === 0}
                className="px-5 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Mappings & Activate Template
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: VERIFICATION TABLE & BULK ISSUANCE (Requirement 1.4) */}
        {activeTab === 'issuance' && (
          <div className="space-y-4 pt-1">
            {/* Header info bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-subtle)]">
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Eligible Verified Attendees: {presentAttendees.length} Present
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Only participants marked as Present during check-in are eligible for participation certificates ({absentCount} absent participants excluded).
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={previewing || presentAttendees.length === 0}
                  onClick={() => handlePreviewSample()}
                  className="px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5 text-blue-500" />}
                  Preview 1 Sample
                </button>

                <button
                  type="button"
                  disabled={issuing || presentAttendees.length === 0}
                  onClick={handleBulkIssueAndSend}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  {issuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                  Confirm, Generate & Send All
                </button>
              </div>
            </div>

            {issuanceProgress && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{issuanceProgress}</span>
              </div>
            )}

            {/* Sample Preview Result Card */}
            {previewResult && (
              <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h5 className="text-xs font-bold text-[var(--text-primary)]">
                      Sample Generated for {previewResult.participantName} ({previewResult.registrationId})
                    </h5>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-600 text-white font-bold">
                    Credential ID: {previewResult.certificateId}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {previewResult.pdfUrl && (
                    <a
                      href={previewResult.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Sample PDF
                    </a>
                  )}
                  {previewResult.docxUrl && (
                    <a
                      href={previewResult.docxUrl}
                      download
                      className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Populated DOCX
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Attendees Verification Table */}
            {presentAttendees.length === 0 ? (
              <div className="p-10 text-center border border-[var(--border-color)] rounded-2xl bg-[var(--surface)] space-y-2">
                <Users className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
                <h5 className="text-xs font-bold text-[var(--text-primary)]">
                  No attendees marked as Present yet
                </h5>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Mark participants as Present in the Check-In Desk before generating certificates.
                </p>
              </div>
            ) : (
              <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--surface)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border-color)] text-[10px] uppercase font-bold text-[var(--text-muted)]">
                      <tr>
                        <th className="p-3">Participant</th>
                        <th className="p-3">College & Department</th>
                        <th className="p-3">Registration ID</th>
                        <th className="p-3">Check-In Status</th>
                        <th className="p-3">Certificate Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {presentAttendees.map((att) => {
                        const status = att.certificateStatus || (att.certificateIssued ? 'Generated' : 'Eligible');
                        return (
                          <tr key={att._id || att.registrationId} className="hover:bg-[var(--surface-subtle)] transition-colors">
                            <td className="p-3 font-bold text-[var(--text-primary)]">
                              {att.studentName}
                            </td>
                            <td className="p-3 text-[var(--text-secondary)]">
                              {att.studentCollege} {att.studentDepartment ? `· ${att.studentDepartment}` : ''}
                            </td>
                            <td className="p-3 font-mono text-[var(--text-muted)]">
                              {att.registrationId}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                                Present
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                  status === 'Sent'
                                    ? 'bg-blue-500/10 text-blue-600'
                                    : status === 'Generated'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : status === 'Failed'
                                    ? 'bg-red-500/10 text-red-600'
                                    : 'bg-amber-500/10 text-amber-600'
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handlePreviewSample(att.registrationId)}
                                className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-[11px] font-semibold hover:bg-[var(--surface-hover)] cursor-pointer"
                              >
                                Preview
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

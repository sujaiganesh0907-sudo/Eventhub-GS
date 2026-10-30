import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Users,
  IndianRupee,
  Plus,
  Trash2,
  HelpCircle,
  AlertCircle,
  FileText,
  X,
  QrCode,
  Link as LinkIcon,
  Image as ImageIcon,
  Eye,
  Lock,
  Sparkles,
  Building2,
  Phone,
  Mail,
  UserCheck,
  Check,
  ArrowRight,
  Send,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ICollege, IParticipantQuestion } from '../../types';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface MultiStepEventFormProps {
  colleges?: ICollege[];
  eventToEdit?: any | null;
  onSuccess: (event: any) => void;
  onCancel?: () => void;
  onClose?: () => void;
  isOpen?: boolean;
  isStudentProposal?: boolean;
}

const WIZARD_STEPS = [
  { id: 1, number: '01', title: 'Basic Details', desc: 'Title, category, host & poster' },
  { id: 2, number: '02', title: 'Date & Venue', desc: 'Timing, deadline & location' },
  { id: 3, number: '03', title: 'Registration & Fee', desc: 'Capacity, pricing & questions' },
  { id: 4, number: '04', title: 'Review & Submit', desc: 'Final check & publication' },
];

export const MultiStepEventForm: React.FC<MultiStepEventFormProps> = ({
  colleges: propColleges,
  eventToEdit,
  onSuccess,
  onCancel,
  onClose,
  isOpen = true,
  isStudentProposal,
}) => {
  const { user, studentProfile, college, organizerProfile } = useAuth();
  const { showToast } = useToast();
  const handleClose = onClose || onCancel || (() => {});

  const [colleges, setColleges] = useState<ICollege[]>(propColleges || []);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [previewCustomForm, setPreviewCustomForm] = useState(false);

  // Check role: Student/Participant, Organizer, or College Approver
  const isParticipant = user?.role === 'Student';
  const isOrganizer = user?.role === 'Organizer';
  const isApprover = user?.role === 'College Super Admin' || user?.role === 'College Admin';
  const isProposal = isParticipant || isOrganizer || Boolean(isStudentProposal);

  // Is this an edit of an already published event?
  const isEditingPublished = Boolean(eventToEdit && eventToEdit.status === 'Published');
  const [publishedNewDeadline, setPublishedNewDeadline] = useState(
    eventToEdit?.registrationDeadline || ''
  );

  useEffect(() => {
    if (!propColleges || propColleges.length === 0) {
      api.get<any>('/colleges').then((res) => {
        if (res.success && res.colleges) setColleges(res.colleges);
      });
    }
  }, [propColleges]);

  // Form State initialized with clean, empty defaults
  const [formData, setFormData] = useState({
    // Step 1: Basic Details
    title: '',
    poster: '',
    targetCollegeId: '',
    category: 'Technical',
    eventType: 'Symposium',
    tagline: '',
    description: '',

    // Step 2: Date & Venue
    eventDate: '',
    startTime: '',
    endTime: '',
    registrationDeadline: '',
    reportingTime: '',
    eventMode: 'Offline' as 'Offline' | 'Online' | 'Hybrid',
    venue: '',
    hallRoom: '',
    buildingBlock: '',
    address: '',
    googleMapsLink: '',
    meetingPlatform: '',
    meetingLink: '',

    // Step 3: Registration, Fee & Questions
    registrationType: 'Individual' as 'Individual' | 'Team',
    minTeamSize: 2,
    maxTeamSize: 4,
    capacity: 100,
    educationLevel: ['UG', 'PG'],
    departments: ['All Disciplines'],
    eligibleYears: ['All Years'],
    primaryCoordinator: {
      name: user?.fullName || studentProfile?.fullName || '',
      role: isOrganizer ? 'Event Director' : 'Lead Coordinator',
      phone: studentProfile?.phoneNumber || organizerProfile?.phoneNumber || '',
      email: user?.email || '',
    },
    rulesAndGuidelines: '',
    isFree: true,
    registrationFee: 0,
    paymentConfig: {
      payeeName: college?.name || organizerProfile?.organizationName || user?.fullName || '',
      upiId: '',
      paymentInstructions: '',
    },
    registrationQuestions: [] as IParticipantQuestion[],
  });

  // Sync eventToEdit when provided
  useEffect(() => {
    if (eventToEdit) {
      setPublishedNewDeadline(eventToEdit.registrationDeadline || '');
      setFormData({
        title: eventToEdit.title || '',
        poster: eventToEdit.poster || '',
        targetCollegeId: eventToEdit.targetCollegeId || eventToEdit.hostCollegeId || '',
        category: eventToEdit.category || 'Technical',
        eventType: eventToEdit.eventType || 'Symposium',
        tagline: eventToEdit.tagline || '',
        description: eventToEdit.description || '',
        eventDate: eventToEdit.eventDate || '',
        startTime: eventToEdit.startTime || '',
        endTime: eventToEdit.endTime || '',
        registrationDeadline: eventToEdit.registrationDeadline || '',
        reportingTime: eventToEdit.reportingTime || '',
        eventMode: eventToEdit.eventMode || 'Offline',
        venue: eventToEdit.venue || '',
        hallRoom: eventToEdit.hallRoom || '',
        buildingBlock: eventToEdit.buildingBlock || '',
        address: eventToEdit.address || '',
        googleMapsLink: eventToEdit.googleMapsLink || '',
        meetingPlatform: eventToEdit.meetingPlatform || '',
        meetingLink: eventToEdit.meetingLink || '',
        registrationType: eventToEdit.registrationType || 'Individual',
        minTeamSize: eventToEdit.minTeamSize || 2,
        maxTeamSize: eventToEdit.maxTeamSize || 4,
        capacity: eventToEdit.capacity || 100,
        educationLevel: eventToEdit.educationLevel || ['UG', 'PG'],
        departments: eventToEdit.departments || ['All Disciplines'],
        eligibleYears: eventToEdit.eligibleYears || ['All Years'],
        primaryCoordinator: eventToEdit.primaryCoordinator || {
          name: user?.fullName || '',
          role: 'Lead Coordinator',
          phone: '',
          email: user?.email || '',
        },
        rulesAndGuidelines: eventToEdit.rulesAndGuidelines || '',
        isFree: eventToEdit.isFree ?? true,
        registrationFee: eventToEdit.registrationFee || 0,
        paymentConfig: eventToEdit.paymentConfig || {
          payeeName: college?.name || user?.fullName || '',
          upiId: '',
          paymentInstructions: '',
        },
        registrationQuestions: Array.isArray(eventToEdit.registrationQuestions)
          ? eventToEdit.registrationQuestions
          : [],
      });
    }
  }, [eventToEdit, college, user]);

  if (!isOpen) return null;

  const updateField = (field: string, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Step Validation logic
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    setError(null);

    if (step === 1) {
      const trimmedTitle = formData.title.trim();
      if (!trimmedTitle) {
        errors.title = 'Event Name is required.';
      } else if (trimmedTitle.length > 15) {
        errors.title = 'Event Name must be maximum 15 characters.';
      }

      if (!formData.poster) {
        errors.poster = 'Event Poster image is required.';
      }

      const trimmedDesc = formData.description.trim();
      const wordCount = trimmedDesc ? trimmedDesc.split(/\s+/).filter(Boolean).length : 0;
      if (!trimmedDesc) {
        errors.description = 'Event Description is required.';
      } else if (wordCount > 500) {
        errors.description = 'Event Description must be maximum 500 words.';
      }

      if (isProposal && !formData.targetCollegeId) {
        errors.targetCollegeId = 'Please select a Host College for your proposal.';
      }
    } else if (step === 2) {
      if (!formData.eventDate) errors.eventDate = 'Event Date is required.';
      if (!formData.startTime) errors.startTime = 'Start Time is required.';
      if (!formData.endTime) errors.endTime = 'End Time is required.';
      if (!formData.registrationDeadline) errors.registrationDeadline = 'Registration Deadline is required.';

      if (formData.eventDate && formData.startTime && formData.endTime) {
        const start = new Date(`${formData.eventDate}T${formData.startTime}`).getTime();
        const end = new Date(`${formData.eventDate}T${formData.endTime}`).getTime();
        if (end <= start) {
          errors.endTime = 'End Time must be after Start Time.';
        }
      }

      if (formData.eventDate && formData.startTime && formData.registrationDeadline) {
        const start = new Date(`${formData.eventDate}T${formData.startTime}`).getTime();
        const deadline = new Date(formData.registrationDeadline).getTime();
        if (deadline > start) {
          errors.registrationDeadline = 'Registration Deadline must be before event start time.';
        }
      }

      if (formData.eventMode === 'Offline' || formData.eventMode === 'Hybrid') {
        if (!formData.venue.trim()) {
          errors.venue = 'Venue name is required for offline/hybrid events.';
        }
      }
      if (formData.eventMode === 'Online' || formData.eventMode === 'Hybrid') {
        if (!formData.meetingLink.trim()) {
          errors.meetingLink = 'Meeting link is required for online/hybrid events.';
        } else if (!/^https?:\/\/.+/i.test(formData.meetingLink.trim())) {
          errors.meetingLink = 'Enter a valid URL (starting with http:// or https://).';
        }
      }
    } else if (step === 3) {
      if (formData.registrationType === 'Team') {
        if (formData.minTeamSize < 1) errors.minTeamSize = 'Min team size must be at least 1.';
        if (formData.maxTeamSize < formData.minTeamSize) errors.maxTeamSize = 'Max team size cannot be less than min team size.';
      }
      if (!formData.capacity || formData.capacity < 1) {
        errors.capacity = 'Capacity must be at least 1 participant.';
      }

      if (!formData.primaryCoordinator.name.trim()) {
        errors.coordName = 'Coordinator name is required.';
      }
      const phoneClean = formData.primaryCoordinator.phone.replace(/[\s\-()]/g, '');
      if (!/^[6-9]\d{9}$/.test(phoneClean) && !/^\d{10}$/.test(phoneClean)) {
        errors.coordPhone = 'Enter a valid 10-digit mobile number.';
      }
      if (!formData.primaryCoordinator.email.trim() || !/\S+@\S+\.\S+/.test(formData.primaryCoordinator.email)) {
        errors.coordEmail = 'Enter a valid coordinator email address.';
      }

      if (!formData.rulesAndGuidelines.trim()) {
        errors.rulesAndGuidelines = 'Rules and guidelines are required.';
      }

      if (!formData.isFree) {
        if (!formData.registrationFee || formData.registrationFee <= 0) {
          errors.registrationFee = 'Enter a valid event fee in INR (greater than 0).';
        }
        const upi = formData.paymentConfig.upiId.trim();
        if (!upi || !/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi)) {
          errors.upiId = 'Enter a valid Beneficiary UPI ID (e.g. name@bank).';
        }
      }

      // Validate custom questions
      for (let i = 0; i < formData.registrationQuestions.length; i++) {
        const q = formData.registrationQuestions[i];
        if (!q.label.trim()) {
          errors[`q_${i}`] = `Question #${i + 1} requires a question title.`;
        }
        if (q.type === 'Select / Multiple Choice' || q.type === 'Multiple Choice' || q.type === 'Dropdown') {
          const validOpts = (q.options || []).filter((o) => o && o.trim());
          if (validOpts.length < 2) {
            errors[`q_${i}`] = `Question #${i + 1} requires at least two valid options.`;
          }
        }
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please resolve the highlighted fields before proceeding.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1));
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Submit Handler
  const handleSubmit = async (saveAsDraft = false) => {
    if (!saveAsDraft && !validateStep(currentStep)) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // If editing a published event: update deadline only
      if (isEditingPublished) {
        const eventStart = new Date(`${eventToEdit.eventDate}T${eventToEdit.startTime}`).getTime();
        const deadline = new Date(publishedNewDeadline).getTime();
        if (isNaN(deadline) || deadline > eventStart) {
          throw new Error('Registration deadline must be before event start time.');
        }

        const res = await api.put<any>(`/events/${eventToEdit._id}`, {
          registrationDeadline: publishedNewDeadline,
        });

        if (res.success) {
          showToast('Registration deadline updated successfully.', 'success');
          onSuccess(res.event);
          handleClose();
        } else {
          throw new Error(res.message || 'Failed to update registration deadline.');
        }
        return;
      }

      // Format custom questions
      const sanitizedQuestions = formData.registrationQuestions.map((q) => ({
        id: q.id,
        label: q.label.trim(),
        type: q.type,
        required: Boolean(q.required),
        helperText: (q.helperText || '').trim(),
        options: (q.options || []).map((o) => o.trim()).filter(Boolean),
      }));

      const payload = {
        title: formData.title.trim(),
        poster: formData.poster,
        targetCollegeId: isProposal ? formData.targetCollegeId : undefined,
        category: formData.category,
        eventType: formData.eventType,
        tagline: formData.tagline.trim(),
        description: formData.description.trim(),

        eventDate: formData.eventDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        registrationDeadline: formData.registrationDeadline,
        reportingTime: formData.reportingTime.trim(),

        eventMode: formData.eventMode,
        venue: formData.venue.trim(),
        hallRoom: formData.hallRoom.trim(),
        buildingBlock: formData.buildingBlock.trim(),
        address: formData.address.trim(),
        googleMapsLink: formData.googleMapsLink.trim(),
        meetingPlatform: formData.meetingPlatform.trim(),
        meetingLink: formData.meetingLink.trim(),

        registrationType: formData.registrationType,
        minTeamSize: formData.registrationType === 'Team' ? Number(formData.minTeamSize) : 1,
        maxTeamSize: formData.registrationType === 'Team' ? Number(formData.maxTeamSize) : 1,
        capacity: Number(formData.capacity),
        educationLevel: formData.educationLevel,
        departments: formData.departments,
        eligibleYears: formData.eligibleYears,

        primaryCoordinator: {
          name: formData.primaryCoordinator.name.trim(),
          role: formData.primaryCoordinator.role.trim() || 'Lead Coordinator',
          phone: formData.primaryCoordinator.phone.replace(/[\s\-()]/g, ''),
          email: formData.primaryCoordinator.email.trim(),
        },

        rulesAndGuidelines: formData.rulesAndGuidelines.trim(),
        isFree: formData.isFree,
        registrationFee: formData.isFree ? 0 : Number(formData.registrationFee),
        paymentConfig: formData.isFree
          ? {}
          : {
              payeeName: formData.paymentConfig.payeeName.trim(),
              upiId: formData.paymentConfig.upiId.trim(),
              paymentInstructions: formData.paymentConfig.paymentInstructions.trim(),
            },

        registrationQuestions: sanitizedQuestions,
        saveAsDraft,
      };

      let res: any;
      if (eventToEdit && !isEditingPublished) {
        res = await api.put<any>(`/events/${eventToEdit._id}`, payload);
      } else {
        res = await api.post<any>('/events', payload);
      }

      if (res.success) {
        showToast(
          isProposal
            ? (saveAsDraft ? 'Proposal saved as draft.' : 'Proposal submitted to college for approval!')
            : 'Event published successfully!',
          'success'
        );
        onSuccess(res.event);
        handleClose();
      } else {
        throw new Error(res.message || 'Operation failed.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the event.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to add custom question (defaults to Multiple Choice with Option 1 & Option 2)
  const handleAddQuestion = () => {
    const newQ: IParticipantQuestion = {
      id: `q_${Date.now()}`,
      label: '',
      type: 'Multiple Choice',
      required: false,
      helperText: '',
      options: ['Option 1', 'Option 2'],
    };
    updateField('registrationQuestions', [...formData.registrationQuestions, newQ]);
  };

  const targetCollege = colleges.find((c) => c._id === formData.targetCollegeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={handleClose} />

      {/* Modal Card - Constrained height, Step-Only rendering with 2-column reference layout */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-4xl my-auto rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-2xl text-[var(--text-primary)] transition-all max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--surface-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-sm">
              {currentStep}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                {isEditingPublished
                  ? 'Update Registration Deadline'
                  : eventToEdit
                  ? 'Edit Event'
                  : isOrganizer
                  ? 'Submit Organizer Event Proposal'
                  : isParticipant
                  ? 'Submit Participant Event Proposal'
                  : 'Create College Event'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {isEditingPublished
                  ? 'Published events are locked to preserve integrity. You may update the deadline.'
                  : `Step ${currentStep} of 4: ${WIZARD_STEPS[currentStep - 1].title}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Step Progress Bar Indicator (Only for new/draft creation) */}
        {!isEditingPublished && (
          <div className="px-5 py-3 border-b border-[var(--border-color)] bg-[var(--surface)]">
            <div className="grid grid-cols-4 gap-2">
              {WIZARD_STEPS.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (step.id < currentStep || validateStep(currentStep)) {
                        setCurrentStep(step.id);
                      }
                    }}
                    className={`text-left p-2 rounded-xl transition-all border cursor-pointer ${
                      isActive
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]/30'
                        : isCompleted
                        ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-[var(--surface-subtle)]'
                        : 'border-transparent bg-[var(--surface-subtle)]/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-[var(--primary)] text-white'
                            : isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-[var(--border-color)] text-[var(--text-muted)]'
                        }`}
                      >
                        {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : step.id}
                      </span>
                      <span className={`text-xs font-semibold truncate ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                        {step.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step-Only Scrollable Body (Only the active step renders!) */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* PUBLISHED EVENT LOCK MODE */}
          {isEditingPublished ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-3">
                <Lock className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Published Event Protection</h4>
                  <p className="mt-1">
                    To maintain data integrity and avoid disruption for already registered students, event details (name, date, mode, fees) cannot be altered after publication. You can extend the registration deadline below.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Registration Deadline
                </label>
                <input
                  type="datetime-local"
                  value={publishedNewDeadline}
                  onChange={(e) => setPublishedNewDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            </div>
          ) : (
            <>
              {/* ================= STEP 1: BASIC DETAILS ================= */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Host College Picker for Proposals */}
                  {isProposal && (
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                        Host / Partner College <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.targetCollegeId}
                        onChange={(e) => updateField('targetCollegeId', e.target.value)}
                        className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] ${
                          fieldErrors.targetCollegeId ? 'border-red-500' : 'border-[var(--border-color)]'
                        }`}
                      >
                        <option value="">Select target host college for venue & approval</option>
                        {colleges.map((col) => (
                          <option key={col._id} value={col._id}>
                            {col.name} {col.verificationStatus === 'Verified' ? '✓ (Verified)' : ''}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.targetCollegeId && (
                        <p className="text-[11px] text-red-500 mt-1">{fieldErrors.targetCollegeId}</p>
                      )}
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">
                        This college will receive your event proposal for review and venue authorization.
                      </p>
                    </div>
                  )}

                  {/* Title with Max 15 Characters */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[var(--text-primary)]">
                        Event Name <span className="text-red-500">*</span>
                      </label>
                      <span className={`text-[11px] font-medium ${formData.title.length > 15 ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
                        {formData.title.length}/15
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={15}
                      value={formData.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      placeholder="e.g. HackSprint '26"
                      className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] ${
                        fieldErrors.title ? 'border-red-500' : 'border-[var(--border-color)]'
                      }`}
                    />
                    {fieldErrors.title && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.title}</p>}
                  </div>

                  {/* Category and Event Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => updateField('category', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                      >
                        <option value="Technical">Technical</option>
                        <option value="Cultural">Cultural</option>
                        <option value="Sports">Sports</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Hackathon">Hackathon</option>
                        <option value="Seminar">Seminar</option>
                        <option value="Webinar">Webinar</option>
                        <option value="Conference">Conference</option>
                        <option value="Fest">Fest</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                        Event Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.eventType}
                        onChange={(e) => updateField('eventType', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                      >
                        <option value="Symposium">Symposium</option>
                        <option value="Competition">Competition</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Hackathon">Hackathon</option>
                        <option value="Exhibition">Exhibition</option>
                        <option value="Cultural Night">Cultural Night</option>
                        <option value="Guest Lecture">Guest Lecture</option>
                      </select>
                    </div>
                  </div>

                  {/* Tagline */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                      Tagline / Catchphrase (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      value={formData.tagline}
                      onChange={(e) => updateField('tagline', e.target.value)}
                      placeholder="e.g. Code, innovate, and disrupt the future."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>

                  {/* Description with 500-Word Limit & Live Counter */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[var(--text-primary)]">
                        Event Description <span className="text-red-500">*</span>
                      </label>
                      <span
                        className={`text-[11px] font-semibold ${
                          (formData.description.trim() ? formData.description.trim().split(/\s+/).filter(Boolean).length : 0) > 500
                            ? 'text-red-500 font-bold'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {formData.description.trim() ? formData.description.trim().split(/\s+/).filter(Boolean).length : 0}/500 words
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      placeholder="Describe your event in detail (up to 500 words)..."
                      className={`w-full px-3 py-2 text-sm rounded-xl border bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] resize-none ${
                        fieldErrors.description ? 'border-red-500' : 'border-[var(--border-color)]'
                      }`}
                    />
                    {fieldErrors.description && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.description}</p>
                    )}
                  </div>

                  {/* Poster Image */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                      Event Poster Image <span className="text-red-500">*</span>
                    </label>
                    <FileUpload
                      value={formData.poster}
                      onChange={(url) => updateField('poster', url)}
                      accept="image/*"
                    />
                    {fieldErrors.poster && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.poster}</p>}
                  </div>
                </div>
              )}

              {/* ================= STEP 2: DATE & VENUE ================= */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Date, Start Time & End Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                        Event Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.eventDate}
                        onChange={(e) => updateField('eventDate', e.target.value)}
                        className={`w-full px-3 py-2 text-sm rounded-xl border bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] ${
                          fieldErrors.eventDate ? 'border-red-500' : 'border-[var(--border-color)]'
                        }`}
                      />
                      {fieldErrors.eventDate && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.eventDate}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                        Start Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => updateField('startTime', e.target.value)}
                        className={`w-full px-3 py-2 text-sm rounded-xl border bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] ${
                          fieldErrors.startTime ? 'border-red-500' : 'border-[var(--border-color)]'
                        }`}
                      />
                      {fieldErrors.startTime && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.startTime}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                        End Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => updateField('endTime', e.target.value)}
                        className={`w-full px-3 py-2 text-sm rounded-xl border bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] ${
                          fieldErrors.endTime ? 'border-red-500' : 'border-[var(--border-color)]'
                        }`}
                      />
                      {fieldErrors.endTime && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.endTime}</p>}
                    </div>
                  </div>

                  {/* Registration Deadline & Reporting Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                        Registration Deadline <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.registrationDeadline}
                        onChange={(e) => updateField('registrationDeadline', e.target.value)}
                        className={`w-full px-3 py-2 text-sm rounded-xl border bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] ${
                          fieldErrors.registrationDeadline ? 'border-red-500' : 'border-[var(--border-color)]'
                        }`}
                      />
                      {fieldErrors.registrationDeadline && (
                        <p className="text-[11px] text-red-500 mt-1">{fieldErrors.registrationDeadline}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                        Reporting Time (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.reportingTime}
                        onChange={(e) => updateField('reportingTime', e.target.value)}
                        placeholder="e.g. 08:30 AM (Registration Desk)"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                  </div>

                  {/* Event Mode */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                      Event Mode <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Offline', 'Online', 'Hybrid'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => updateField('eventMode', m)}
                          className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                            formData.eventMode === m
                              ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                              : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Venue Details (Offline / Hybrid) */}
                  {(formData.eventMode === 'Offline' || formData.eventMode === 'Hybrid') && (
                    <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/40 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                        <MapPin className="w-4 h-4 text-[var(--primary)]" />
                        <span>Physical Campus Venue Details</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                            Venue / Auditorium <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.venue}
                            onChange={(e) => updateField('venue', e.target.value)}
                            placeholder="e.g. Ramanujan Central Auditorium"
                            className={`w-full px-3 py-2 text-sm rounded-xl border bg-[var(--surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] ${
                              fieldErrors.venue ? 'border-red-500' : 'border-[var(--border-color)]'
                            }`}
                          />
                          {fieldErrors.venue && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.venue}</p>}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                            Hall / Room Number
                          </label>
                          <input
                            type="text"
                            value={formData.hallRoom}
                            onChange={(e) => updateField('hallRoom', e.target.value)}
                            placeholder="e.g. Seminar Hall B-302"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                          Full Campus Address
                        </label>
                        <input
                          type="text"
                          value={formData.address}
                          onChange={(e) => updateField('address', e.target.value)}
                          placeholder="e.g. Apex Tech Campus, 100 Feet Road, Bengaluru, Karnataka 560001"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Online Details (Online / Hybrid) */}
                  {(formData.eventMode === 'Online' || formData.eventMode === 'Hybrid') && (
                    <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/40 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                        <LinkIcon className="w-4 h-4 text-[var(--primary)]" />
                        <span>Online Meeting & Platform Details</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                            Platform
                          </label>
                          <input
                            type="text"
                            value={formData.meetingPlatform}
                            onChange={(e) => updateField('meetingPlatform', e.target.value)}
                            placeholder="e.g. Google Meet / Zoom"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                            Meeting Link URL <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="url"
                            value={formData.meetingLink}
                            onChange={(e) => updateField('meetingLink', e.target.value)}
                            placeholder="e.g. https://meet.google.com/abc-defg-hij"
                            className={`w-full px-3 py-2 text-sm rounded-xl border bg-[var(--surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] ${
                              fieldErrors.meetingLink ? 'border-red-500' : 'border-[var(--border-color)]'
                            }`}
                          />
                          {fieldErrors.meetingLink && (
                            <p className="text-[11px] text-red-500 mt-1">{fieldErrors.meetingLink}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================= STEP 3: REGISTRATION, FEE & QUESTIONS ================= */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Participation Type & Capacity */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                        Participation Type
                      </label>
                      <select
                        value={formData.registrationType}
                        onChange={(e) => updateField('registrationType', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                      >
                        <option value="Individual">Individual Entry</option>
                        <option value="Team">Team Entry</option>
                      </select>
                    </div>

                    {formData.registrationType === 'Team' ? (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                            Min Team Size
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={formData.minTeamSize}
                            onChange={(e) => updateField('minTeamSize', Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                            Max Team Size
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={15}
                            value={formData.maxTeamSize}
                            onChange={(e) => updateField('maxTeamSize', Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                          Max Participant Capacity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={5000}
                          value={formData.capacity}
                          onChange={(e) => updateField('capacity', Number(e.target.value))}
                          placeholder="e.g. 150"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Fee & Payment (INR Formatting) */}
                  <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-[var(--primary)]" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">Pricing & Registration Fee</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateField('isFree', true)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                            formData.isFree
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-muted)]'
                          }`}
                        >
                          Free Event
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField('isFree', false)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                            !formData.isFree
                              ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-bold'
                              : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-muted)]'
                          }`}
                        >
                          Paid Entry (INR ₹)
                        </button>
                      </div>
                    </div>

                    {!formData.isFree && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border-color)]">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                            Entry Fee (in INR ₹) <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">₹</span>
                            <input
                              type="number"
                              min={1}
                              value={formData.registrationFee}
                              onChange={(e) => updateField('registrationFee', Number(e.target.value))}
                              placeholder="250"
                              className={`w-full pl-8 pr-3 py-2 text-sm rounded-xl border bg-[var(--surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] ${
                                fieldErrors.registrationFee ? 'border-red-500' : 'border-[var(--border-color)]'
                              }`}
                            />
                          </div>
                          {fieldErrors.registrationFee && (
                            <p className="text-[11px] text-red-500 mt-1">{fieldErrors.registrationFee}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                            Beneficiary UPI ID <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.paymentConfig.upiId}
                            onChange={(e) =>
                              updateField('paymentConfig', { ...formData.paymentConfig, upiId: e.target.value })
                            }
                            placeholder="e.g. apexevents@oksbi"
                            className={`w-full px-3 py-2 text-sm rounded-xl border bg-[var(--surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] ${
                              fieldErrors.upiId ? 'border-red-500' : 'border-[var(--border-color)]'
                            }`}
                          />
                          {fieldErrors.upiId && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.upiId}</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coordinator Details with 10-Digit Phone */}
                  <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/40 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                      <UserCheck className="w-4 h-4 text-[var(--primary)]" />
                      <span>Primary Event Coordinator</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.primaryCoordinator.name}
                          onChange={(e) =>
                            updateField('primaryCoordinator', {
                              ...formData.primaryCoordinator,
                              name: e.target.value,
                            })
                          }
                          placeholder="e.g. Dr. Rajesh Kumar"
                          className={`w-full px-3 py-2 text-sm rounded-xl border bg-[var(--surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] ${
                            fieldErrors.coordName ? 'border-red-500' : 'border-[var(--border-color)]'
                          }`}
                        />
                        {fieldErrors.coordName && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.coordName}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                          Mobile (10 Digits) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          maxLength={10}
                          value={formData.primaryCoordinator.phone}
                          onChange={(e) =>
                            updateField('primaryCoordinator', {
                              ...formData.primaryCoordinator,
                              phone: e.target.value.replace(/\D/g, ''),
                            })
                          }
                          placeholder="e.g. 9876543210"
                          className={`w-full px-3 py-2 text-sm rounded-xl border bg-[var(--surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] ${
                            fieldErrors.coordPhone ? 'border-red-500' : 'border-[var(--border-color)]'
                          }`}
                        />
                        {fieldErrors.coordPhone && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.coordPhone}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={formData.primaryCoordinator.email}
                          onChange={(e) =>
                            updateField('primaryCoordinator', {
                              ...formData.primaryCoordinator,
                              email: e.target.value,
                            })
                          }
                          placeholder="e.g. coordinator@apextech.edu"
                          className={`w-full px-3 py-2 text-sm rounded-xl border bg-[var(--surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] ${
                            fieldErrors.coordEmail ? 'border-red-500' : 'border-[var(--border-color)]'
                          }`}
                        />
                        {fieldErrors.coordEmail && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.coordEmail}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Rules and Guidelines */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                      Rules & Participant Guidelines <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formData.rulesAndGuidelines}
                      onChange={(e) => updateField('rulesAndGuidelines', e.target.value)}
                      placeholder="e.g. 1. Bring a valid student/institution ID card. 2. Laptops are required for hands-on sessions."
                      className={`w-full px-3 py-2 text-sm rounded-xl border bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] resize-none ${
                        fieldErrors.rulesAndGuidelines ? 'border-red-500' : 'border-[var(--border-color)]'
                      }`}
                    />
                    {fieldErrors.rulesAndGuidelines && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.rulesAndGuidelines}</p>
                    )}
                  </div>

                  {/* Custom Participant Questions Builder */}
                  <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                          <FileText className="w-4 h-4 text-[var(--primary)]" />
                          <span>Custom Registration Questions</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Add custom form fields for participants to fill during registration.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Custom Details</span>
                      </button>
                    </div>

                    {formData.registrationQuestions.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] italic py-3 text-center bg-[var(--surface)] rounded-xl border border-dashed border-[var(--border-color)]">
                        No custom questions added. Click "+ Add Custom Details" to solicit T-shirt size, GitHub handle, or team background.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {formData.registrationQuestions.map((q, idx) => (
                          <div
                            key={q.id || idx}
                            className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] space-y-3 shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                              <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-[200px]">
                                <input
                                  type="text"
                                  value={q.label}
                                  onChange={(e) => {
                                    const next = [...formData.registrationQuestions];
                                    next[idx].label = e.target.value;
                                    updateField('registrationQuestions', next);
                                  }}
                                  placeholder="Enter question title (e.g. What is your department?)"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium text-[var(--text-primary)]"
                                />
                              </div>
                              <select
                                value={q.type}
                                onChange={(e) => {
                                  const next = [...formData.registrationQuestions];
                                  const newType = e.target.value as any;
                                  next[idx].type = newType;
                                  if (
                                    (newType === 'Multiple Choice' ||
                                      newType === 'Select / Multiple Choice' ||
                                      newType === 'Dropdown' ||
                                      newType === 'Checkbox') &&
                                    (!next[idx].options || next[idx].options.length < 2)
                                  ) {
                                    next[idx].options = ['Option 1', 'Option 2'];
                                  }
                                  updateField('registrationQuestions', next);
                                }}
                                className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] font-medium text-[var(--text-primary)]"
                              >
                                <option value="Short Text">Short Text</option>
                                <option value="Paragraph">Paragraph</option>
                                <option value="Multiple Choice">Multiple Choice</option>
                                <option value="Dropdown">Dropdown</option>
                                <option value="Checkbox">Checkbox / Multi-Select</option>
                                <option value="File Upload">File Upload</option>
                              </select>
                              <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={q.required}
                                  onChange={(e) => {
                                    const next = [...formData.registrationQuestions];
                                    next[idx].required = e.target.checked;
                                    updateField('registrationQuestions', next);
                                  }}
                                  className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                Required
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = formData.registrationQuestions.filter((_, i) => i !== idx);
                                  updateField('registrationQuestions', next);
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer transition-colors"
                                title="Delete Question"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Multiple Choice / Dropdown / Checkbox Options Builder */}
                            {(q.type === 'Multiple Choice' ||
                              q.type === 'Select / Multiple Choice' ||
                              q.type === 'Dropdown' ||
                              q.type === 'Checkbox') && (
                              <div className="pl-6 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-2 pt-1">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                  <span>Options (At least 2 required):</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...formData.registrationQuestions];
                                      const curOpts = next[idx].options && next[idx].options.length > 0 ? next[idx].options : ['Option 1', 'Option 2'];
                                      next[idx].options = [...curOpts, `Option ${curOpts.length + 1}`];
                                      updateField('registrationQuestions', next);
                                    }}
                                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Add Option
                                  </button>
                                </div>
                                <div className="space-y-1.5">
                                  {(q.options && q.options.length > 0 ? q.options : ['Option 1', 'Option 2']).map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-2">
                                      <span className="w-4 h-4 rounded-full border border-indigo-300 dark:border-indigo-700 flex items-center justify-center text-[10px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                                        {optIdx + 1}
                                      </span>
                                      <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                          const next = [...formData.registrationQuestions];
                                          const curOpts = [...(next[idx].options && next[idx].options.length > 0 ? next[idx].options : ['Option 1', 'Option 2'])];
                                          curOpts[optIdx] = e.target.value;
                                          next[idx].options = curOpts;
                                          updateField('registrationQuestions', next);
                                        }}
                                        placeholder={`Option ${optIdx + 1}`}
                                        className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium text-[var(--text-primary)]"
                                      />
                                      {(q.options || []).length > 2 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = [...formData.registrationQuestions];
                                            const curOpts = (next[idx].options || []).filter((_, i) => i !== optIdx);
                                            next[idx].options = curOpts;
                                            updateField('registrationQuestions', next);
                                          }}
                                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md cursor-pointer"
                                          title="Remove option"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= STEP 4: REVIEW & SUBMIT ================= */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Notice Banner */}
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      isProposal
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">
                        {isOrganizer
                          ? `Ready for Proposal Submission to ${targetCollege?.name || 'Host College'}`
                          : isParticipant
                          ? `Ready for Proposal Submission to ${targetCollege?.name || 'Host College'}`
                          : 'Ready for Immediate College Publication'}
                      </p>
                      <p className="mt-0.5 opacity-90 text-[11px]">
                        {isProposal
                          ? 'This event proposal will be routed directly to the college administration. Both you and the college approver will receive email updates upon review.'
                          : 'Your event will be published immediately on the public EVENTHUB discovery feed.'}
                      </p>
                    </div>
                  </div>

                  {/* Summary Preview Card */}
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
                    <div className="flex items-start gap-3">
                      {formData.poster ? (
                        <img
                          src={formData.poster}
                          alt={formData.title}
                          className="w-20 h-20 rounded-xl object-cover shrink-0 border border-[var(--border-color)]"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)]">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[var(--primary)]/10 text-[var(--primary)] uppercase">
                            {formData.category}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[var(--surface)] text-[var(--text-muted)]">
                            {formData.eventType}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            {formData.isFree ? 'FREE' : `₹${formData.registrationFee}`}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[var(--text-primary)] mt-1 truncate">
                          {formData.title || 'Untitled Event'}
                        </h3>
                        {formData.tagline && (
                          <p className="text-xs text-[var(--primary)] font-medium truncate">{formData.tagline}</p>
                        )}
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-0.5">{formData.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-color)] text-xs">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Date</span>
                        <span className="font-semibold">{formData.eventDate || 'Not set'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Timing</span>
                        <span className="font-semibold">
                          {formData.startTime} - {formData.endTime}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Mode & Venue</span>
                        <span className="font-semibold truncate block">
                          {formData.eventMode}: {formData.venue || formData.meetingPlatform || 'Online'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Capacity</span>
                        <span className="font-semibold">{formData.capacity} Attendees</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[var(--border-color)] text-xs">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Primary Coordinator</span>
                        <span className="font-semibold">
                          {formData.primaryCoordinator.name} ({formData.primaryCoordinator.phone})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Custom Registration Fields</span>
                        <span className="font-semibold">
                          {formData.registrationQuestions.length} custom questions configured
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Wizard Controls Footer */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--surface-subtle)] flex items-center justify-between gap-2">
          {isEditingPublished ? (
            <div className="flex items-center justify-end w-full gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--primary)] text-white hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {submitting ? 'Updating...' : 'Update Deadline'}
              </button>
            </div>
          ) : (
            <>
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface)] text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit(true)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Save Draft
                </button>

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-xl bg-[var(--primary)] text-white hover:opacity-95 transition-opacity cursor-pointer shadow-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmit(false)}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting...' : isProposal ? 'Submit Proposal' : 'Publish Event'}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

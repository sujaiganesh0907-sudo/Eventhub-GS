import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Award,
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
  ListOrdered,
  Eye,
  Lock,
  Sparkles,
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
  { id: 1, name: 'Basic Info' },
  { id: 2, name: 'Schedule' },
  { id: 3, name: 'Location & Mode' },
  { id: 4, name: 'Registration' },
  { id: 5, name: 'Rules & Prizes' },
  { id: 6, name: 'Payment' },
  { id: 7, name: 'Custom Details' },
  { id: 8, name: 'Review & Publish' },
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
  const { user, studentProfile, college } = useAuth();
  const { showToast } = useToast();
  const handleClose = onClose || onCancel || (() => {});

  const [colleges, setColleges] = useState<ICollege[]>(propColleges || []);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [previewCustomForm, setPreviewCustomForm] = useState(false);

  // Is this an edit of an already published event? (Requirement 11)
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

  // Form State initialized with clean, empty values (NO hardcoded placeholder samples)
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    title: '',
    poster: '',
    targetCollegeId: '',
    category: 'Technical',
    eventType: 'Symposium',
    tagline: '',
    description: '',

    // Step 2: Schedule
    eventDate: '',
    startTime: '',
    endTime: '',
    registrationDeadline: '',
    reportingTime: '',

    // Step 3: Location & Mode
    eventMode: 'Offline' as 'Offline' | 'Online' | 'Hybrid',
    venue: '',
    hallRoom: '',
    buildingBlock: '',
    address: '',
    googleMapsLink: '',
    meetingPlatform: '',
    meetingLink: '',

    // Step 4: Registration & Coordinators
    registrationType: 'Individual' as 'Individual' | 'Team',
    minTeamSize: 2,
    maxTeamSize: 4,
    capacity: 100,
    educationLevel: ['UG', 'PG'],
    departments: ['All Disciplines'],
    eligibleYears: ['All Years'],
    primaryCoordinator: {
      name: user?.fullName || studentProfile?.fullName || '',
      role: 'Lead Coordinator',
      phone: studentProfile?.phoneNumber || '',
      email: user?.email || '',
    },
    secondaryCoordinator: {
      name: '',
      role: '',
      phone: '',
      email: '',
    },

    // Step 5: Rules & Prizes
    rulesAndGuidelines: '',
    prizeAvailable: false,
    totalPrizePool: 0,
    firstPrize: '',
    secondPrize: '',
    thirdPrize: '',
    certificateAvailable: true,
    participationCertificate: true,
    winnerCertificate: false,

    // Step 6: Payment
    isFree: true,
    registrationFee: 0,
    paymentConfig: {
      payeeName: college?.name || user?.fullName || '',
      upiId: '',
      paymentInstructions: '',
    },

    // Step 7: Consolidated Custom Details (Google Forms style)
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
        secondaryCoordinator: eventToEdit.secondaryCoordinator || {
          name: '',
          role: '',
          phone: '',
          email: '',
        },
        rulesAndGuidelines: eventToEdit.rulesAndGuidelines || '',
        prizeAvailable: Boolean(eventToEdit.prizeAvailable),
        totalPrizePool: eventToEdit.totalPrizePool || 0,
        firstPrize: eventToEdit.firstPrize || '',
        secondPrize: eventToEdit.secondPrize || '',
        thirdPrize: eventToEdit.thirdPrize || '',
        certificateAvailable: eventToEdit.certificateAvailable ?? true,
        participationCertificate: eventToEdit.participationCertificate ?? true,
        winnerCertificate: Boolean(eventToEdit.winnerCertificate),
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
      if (!trimmedDesc) {
        errors.description = 'Event Description is required.';
      } else if (trimmedDesc.length > 200) {
        errors.description = 'Event Description must be maximum 200 characters.';
      }

      if (user?.role === 'Student' && !formData.targetCollegeId) {
        errors.targetCollegeId = 'Please select a Target College for your proposal.';
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
          errors.registrationDeadline = 'Registration Deadline must be before the event start time.';
        }
      }
    } else if (step === 3) {
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
      if (formData.googleMapsLink && !/^https?:\/\/.+/i.test(formData.googleMapsLink.trim())) {
        errors.googleMapsLink = 'Enter a valid URL.';
      }
    } else if (step === 4) {
      if (formData.registrationType === 'Team') {
        if (formData.minTeamSize < 1) errors.minTeamSize = 'Min team size must be at least 1.';
        if (formData.maxTeamSize < formData.minTeamSize) errors.maxTeamSize = 'Max team size cannot be less than min team size.';
      }
      if (!formData.capacity || formData.capacity < 1) {
        errors.capacity = 'Capacity must be a positive number.';
      }

      if (!formData.primaryCoordinator.name.trim()) {
        errors.coordName = 'Coordinator name is required.';
      }
      const phoneClean = formData.primaryCoordinator.phone.replace(/[\s\-()]/g, '');
      if (!/^[6-9]\d{9}$/.test(phoneClean) && !/^\d{10}$/.test(phoneClean)) {
        errors.coordPhone = 'Enter a valid 10-digit mobile number.';
      }
      if (!formData.primaryCoordinator.email.trim() || !/\S+@\S+\.\S+/.test(formData.primaryCoordinator.email)) {
        errors.coordEmail = 'Enter a valid email address.';
      }
    } else if (step === 5) {
      if (!formData.rulesAndGuidelines.trim()) {
        errors.rulesAndGuidelines = 'Rules and guidelines are required.';
      }
      if (formData.prizeAvailable && formData.totalPrizePool < 0) {
        errors.totalPrizePool = 'Prize pool must be 0 or greater.';
      }
    } else if (step === 6) {
      if (!formData.isFree) {
        if (!formData.registrationFee || formData.registrationFee <= 0) {
          errors.registrationFee = 'Enter a valid event fee in INR (greater than 0).';
        }
        const upi = formData.paymentConfig.upiId.trim();
        if (!upi || !/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi)) {
          errors.upiId = 'Enter a valid UPI ID (username@provider).';
        }
      }
    } else if (step === 7) {
      // Validate Custom Details questions
      for (let i = 0; i < formData.registrationQuestions.length; i++) {
        const q = formData.registrationQuestions[i];
        if (!q.label.trim()) {
          errors[`q_${i}`] = `Question #${i + 1} requires a question title.`;
        }
        if (q.type === 'Select / Multiple Choice' || q.type === 'Dropdown') {
          const validOpts = (q.options || []).filter((o) => o && o.trim());
          if (validOpts.length === 0) {
            errors[`q_${i}`] = `Question #${i + 1} (Multiple Choice) must have at least one option.`;
          }
        }
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please resolve the errors highlighted below.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(WIZARD_STEPS.length, prev + 1));
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
        helperText: q.helperText ? q.helperText.trim() : undefined,
        options:
          q.type === 'Select / Multiple Choice' || q.type === 'Dropdown'
            ? (q.options || []).map((o) => o.trim()).filter(Boolean)
            : undefined,
      }));

      const payload: any = {
        title: formData.title.trim(),
        poster: formData.poster,
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
        venue: formData.eventMode === 'Online' ? undefined : formData.venue.trim(),
        hallRoom: formData.eventMode === 'Online' ? undefined : formData.hallRoom.trim(),
        buildingBlock: formData.eventMode === 'Online' ? undefined : formData.buildingBlock.trim(),
        address: formData.eventMode === 'Online' ? undefined : formData.address.trim(),
        googleMapsLink: formData.eventMode === 'Online' ? undefined : formData.googleMapsLink.trim(),
        meetingPlatform: formData.eventMode === 'Offline' ? undefined : formData.meetingPlatform.trim(),
        meetingLink: formData.eventMode === 'Offline' ? undefined : formData.meetingLink.trim(),
        registrationType: formData.registrationType,
        minTeamSize: formData.registrationType === 'Team' ? formData.minTeamSize : undefined,
        maxTeamSize: formData.registrationType === 'Team' ? formData.maxTeamSize : undefined,
        capacity: Number(formData.capacity),
        educationLevel: formData.educationLevel,
        departments: formData.departments,
        eligibleYears: formData.eligibleYears,
        rulesAndGuidelines: formData.rulesAndGuidelines.trim(),
        prizeAvailable: formData.prizeAvailable,
        totalPrizePool: formData.prizeAvailable ? Number(formData.totalPrizePool) : 0,
        firstPrize: formData.prizeAvailable ? formData.firstPrize.trim() : '',
        secondPrize: formData.prizeAvailable ? formData.secondPrize.trim() : '',
        thirdPrize: formData.prizeAvailable ? formData.thirdPrize.trim() : '',
        certificateAvailable: formData.certificateAvailable,
        participationCertificate: formData.certificateAvailable ? formData.participationCertificate : false,
        winnerCertificate: formData.certificateAvailable ? formData.winnerCertificate : false,
        isFree: formData.isFree,
        registrationFee: formData.isFree ? 0 : Number(formData.registrationFee),
        paymentConfig: formData.isFree
          ? undefined
          : {
              payeeName: formData.paymentConfig.payeeName.trim(),
              upiId: formData.paymentConfig.upiId.trim(),
              paymentInstructions: formData.paymentConfig.paymentInstructions.trim(),
            },
        primaryCoordinator: {
          name: formData.primaryCoordinator.name.trim(),
          role: formData.primaryCoordinator.role.trim() || 'Lead Coordinator',
          phone: formData.primaryCoordinator.phone.trim(),
          email: formData.primaryCoordinator.email.trim(),
        },
        secondaryCoordinator: formData.secondaryCoordinator.name.trim()
          ? {
              name: formData.secondaryCoordinator.name.trim(),
              role: formData.secondaryCoordinator.role.trim() || 'Coordinator',
              phone: formData.secondaryCoordinator.phone.trim(),
              email: formData.secondaryCoordinator.email.trim(),
            }
          : undefined,
        registrationQuestions: sanitizedQuestions,
        saveAsDraft,
      };

      if (user?.role === 'Student') {
        payload.targetCollegeId = formData.targetCollegeId;
      }

      let res: any;
      if (eventToEdit && eventToEdit._id) {
        res = await api.put<any>(`/events/${eventToEdit._id}`, payload);
      } else {
        res = await api.post<any>('/events', payload);
      }

      if (res.success) {
        showToast(
          saveAsDraft
            ? 'Event saved as draft.'
            : user?.role === 'Student'
            ? 'Proposal submitted to college for approval.'
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

  // Helper to add custom question
  const handleAddQuestion = () => {
    const newQ: IParticipantQuestion = {
      id: `q_${Date.now()}`,
      label: '',
      type: 'Short Text',
      required: false,
      helperText: '',
      options: ['Option 1'],
    };
    updateField('registrationQuestions', [...formData.registrationQuestions, newQ]);
  };

  // Generate UPI QR code preview URL
  const upiString = `upi://pay?pa=${encodeURIComponent(
    formData.paymentConfig.upiId.trim()
  )}&pn=${encodeURIComponent(
    formData.paymentConfig.payeeName || 'EVENTHUB'
  )}&am=${formData.registrationFee}&cu=INR`;
  const upiQrPreviewUrl = formData.paymentConfig.upiId.trim()
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiString)}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={handleClose} />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-3xl my-auto rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-2xl text-[var(--text-primary)] transition-all max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-color)] bg-[var(--surface-subtle)]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              {isEditingPublished
                ? 'Update Registration Deadline'
                : eventToEdit
                ? 'Edit Event'
                : user?.role === 'Student'
                ? 'Submit Student Event Proposal'
                : 'Create College Event'}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {isEditingPublished
                ? 'Published events are locked to preserve participant integrity. You may update the deadline.'
                : `Step ${currentStep} of ${WIZARD_STEPS.length}: ${WIZARD_STEPS[currentStep - 1].name}`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicator (Hidden in Deadline-only edit mode) */}
        {!isEditingPublished && (
          <div className="px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--surface)] overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max">
              {WIZARD_STEPS.map((s) => {
                const isCurrent = s.id === currentStep;
                const isDone = s.id < currentStep;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (s.id < currentStep) {
                        setCurrentStep(s.id);
                      } else if (s.id > currentStep) {
                        if (validateStep(currentStep)) {
                          setCurrentStep(s.id);
                        }
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                        : isDone
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'text-[var(--text-muted)] hover:bg-[var(--surface-subtle)]'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent
                          ? 'bg-white/20 text-white'
                          : isDone
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'
                      }`}
                    >
                      {isDone ? '✓' : s.id}
                    </span>
                    <span className="hidden sm:inline">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Wizard Step Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ================= LOCKED PUBLISHED EVENT DEADLINE EDIT ================= */}
          {isEditingPublished ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <Lock className="w-4 h-4" />
                  <span>Published Event Safeguard Active</span>
                </div>
                <p>
                  This event is actively published and accepting registrations. Title, venue, schedule, and pricing are locked to protect student registrations. You can extend or shorten the registration deadline.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Registration Deadline *
                </label>
                <input
                  type="datetime-local"
                  value={publishedNewDeadline}
                  onChange={(e) => setPublishedNewDeadline(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Event Start: {eventToEdit?.eventDate} at {eventToEdit?.startTime}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2 text-xs">
                <p className="font-bold text-[var(--text-primary)]">Locked Event Summary:</p>
                <div className="grid grid-cols-2 gap-2 text-[var(--text-secondary)]">
                  <div><span className="font-semibold">Title:</span> {eventToEdit?.title}</div>
                  <div><span className="font-semibold">Mode:</span> {eventToEdit?.eventMode}</div>
                  <div><span className="font-semibold">Fee:</span> {eventToEdit?.isFree ? 'Free' : `₹${eventToEdit?.registrationFee}`}</div>
                  <div><span className="font-semibold">Capacity:</span> {eventToEdit?.capacity} seats</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ================= STEP 1: BASIC INFO ================= */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  {/* Event Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[var(--text-primary)]">
                        Event Name * (Max 15 characters)
                      </label>
                      <span
                        className={`text-[11px] font-semibold ${
                          formData.title.length > 15
                            ? 'text-red-500 font-bold'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {formData.title.length} / 15
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={15}
                      value={formData.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      placeholder="Enter event name"
                      className={`w-full p-2.5 rounded-xl border text-sm text-[var(--text-primary)] bg-[var(--surface-subtle)] focus:bg-[var(--surface)] focus:outline-hidden transition-all ${
                        fieldErrors.title
                          ? 'border-red-500'
                          : 'border-[var(--border-color)] focus:border-[var(--primary-color)]'
                      }`}
                    />
                    {fieldErrors.title && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.title}</p>
                    )}
                  </div>

                  {/* Target College (for Student Proposals) */}
                  {user?.role === 'Student' && (
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                        Target Institution for Proposal *
                      </label>
                      <select
                        value={formData.targetCollegeId}
                        onChange={(e) => updateField('targetCollegeId', e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-sm text-[var(--text-primary)] bg-[var(--surface-subtle)] focus:outline-hidden ${
                          fieldErrors.targetCollegeId
                            ? 'border-red-500'
                            : 'border-[var(--border-color)] focus:border-[var(--primary-color)]'
                        }`}
                      >
                        <option value="">Select Target College</option>
                        {colleges.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.targetCollegeId && (
                        <p className="text-[11px] text-red-500 mt-1">{fieldErrors.targetCollegeId}</p>
                      )}
                    </div>
                  )}

                  {/* Category & Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                        Category *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => updateField('category', e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                      >
                        <option value="Technical">Technical</option>
                        <option value="Hackathon">Hackathon</option>
                        <option value="Cultural">Cultural</option>
                        <option value="Sports">Sports</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Robotics">Robotics</option>
                        <option value="Management">Management</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                        Tagline (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.tagline}
                        onChange={(e) => updateField('tagline', e.target.value)}
                        placeholder="Enter short event tagline"
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                      />
                    </div>
                  </div>

                  {/* Poster Image File Upload */}
                  <div>
                    <FileUpload
                      label="Event Banner / Poster *"
                      helperText="Upload event poster image (JPG, PNG, WEBP)"
                      value={formData.poster}
                      onChange={(url) => updateField('poster', url)}
                    />
                    {fieldErrors.poster && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.poster}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[var(--text-primary)]">
                        Description * (Max 200 characters)
                      </label>
                      <span
                        className={`text-[11px] font-semibold ${
                          formData.description.length > 200
                            ? 'text-red-500 font-bold'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {formData.description.length} / 200
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={200}
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      placeholder="Enter a brief, compelling overview of the event"
                      className={`w-full p-2.5 rounded-xl border text-sm text-[var(--text-primary)] bg-[var(--surface-subtle)] focus:bg-[var(--surface)] focus:outline-hidden transition-all ${
                        fieldErrors.description
                          ? 'border-red-500'
                          : 'border-[var(--border-color)] focus:border-[var(--primary-color)]'
                      }`}
                    />
                    {fieldErrors.description && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* ================= STEP 2: SCHEDULE ================= */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                        Event Date *
                      </label>
                      <input
                        type="date"
                        value={formData.eventDate}
                        onChange={(e) => updateField('eventDate', e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-sm text-[var(--text-primary)] bg-[var(--surface-subtle)] ${
                          fieldErrors.eventDate ? 'border-red-500' : 'border-[var(--border-color)]'
                        }`}
                      />
                      {fieldErrors.eventDate && (
                        <p className="text-[11px] text-red-500 mt-1">{fieldErrors.eventDate}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                        Start Time *
                      </label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => updateField('startTime', e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-sm text-[var(--text-primary)] bg-[var(--surface-subtle)] ${
                          fieldErrors.startTime ? 'border-red-500' : 'border-[var(--border-color)]'
                        }`}
                      />
                      {fieldErrors.startTime && (
                        <p className="text-[11px] text-red-500 mt-1">{fieldErrors.startTime}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                        End Time *
                      </label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => updateField('endTime', e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-sm text-[var(--text-primary)] bg-[var(--surface-subtle)] ${
                          fieldErrors.endTime ? 'border-red-500' : 'border-[var(--border-color)]'
                        }`}
                      />
                      {fieldErrors.endTime && (
                        <p className="text-[11px] text-red-500 mt-1">{fieldErrors.endTime}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      Registration Deadline *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.registrationDeadline}
                      onChange={(e) => updateField('registrationDeadline', e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-sm text-[var(--text-primary)] bg-[var(--surface-subtle)] ${
                        fieldErrors.registrationDeadline
                          ? 'border-red-500'
                          : 'border-[var(--border-color)]'
                      }`}
                    />
                    {fieldErrors.registrationDeadline && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.registrationDeadline}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      Reporting Time (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.reportingTime}
                      onChange={(e) => updateField('reportingTime', e.target.value)}
                      placeholder="Enter reporting instructions or arrival details"
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              )}

              {/* ================= STEP 3: LOCATION & MODE ================= */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      Event Mode *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Offline', 'Online', 'Hybrid'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => updateField('eventMode', m)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            formData.eventMode === m
                              ? 'bg-[var(--primary-color)] text-[var(--primary-text)] border-[var(--primary-color)] shadow-xs'
                              : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--surface)]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Offline Details */}
                  {formData.eventMode !== 'Online' && (
                    <div className="space-y-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]">
                      <p className="text-xs font-bold text-[var(--text-primary)]">Campus Venue Details</p>
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Venue / Hall Name *
                        </label>
                        <input
                          type="text"
                          value={formData.venue}
                          onChange={(e) => updateField('venue', e.target.value)}
                          placeholder="Enter event venue"
                          className={`w-full p-2 rounded-lg border text-xs text-[var(--text-primary)] bg-[var(--surface)] ${
                            fieldErrors.venue ? 'border-red-500' : 'border-[var(--border-color)]'
                          }`}
                        />
                        {fieldErrors.venue && (
                          <p className="text-[11px] text-red-500 mt-1">{fieldErrors.venue}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                            Hall / Room Number
                          </label>
                          <input
                            type="text"
                            value={formData.hallRoom}
                            onChange={(e) => updateField('hallRoom', e.target.value)}
                            placeholder="Enter room or hall number"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                            Building / Block
                          </label>
                          <input
                            type="text"
                            value={formData.buildingBlock}
                            onChange={(e) => updateField('buildingBlock', e.target.value)}
                            placeholder="Enter building or campus block"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Google Maps Link (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.googleMapsLink}
                          onChange={(e) => updateField('googleMapsLink', e.target.value)}
                          placeholder="Enter a valid URL"
                          className={`w-full p-2 rounded-lg border text-xs text-[var(--text-primary)] bg-[var(--surface)] ${
                            fieldErrors.googleMapsLink ? 'border-red-500' : 'border-[var(--border-color)]'
                          }`}
                        />
                        {fieldErrors.googleMapsLink && (
                          <p className="text-[11px] text-red-500 mt-1">{fieldErrors.googleMapsLink}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Online Details */}
                  {formData.eventMode !== 'Offline' && (
                    <div className="space-y-3 p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]">
                      <p className="text-xs font-bold text-[var(--text-primary)]">Virtual Meeting Details</p>
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Meeting Platform
                        </label>
                        <input
                          type="text"
                          value={formData.meetingPlatform}
                          onChange={(e) => updateField('meetingPlatform', e.target.value)}
                          placeholder="Enter platform name (Google Meet, Zoom, Webex)"
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Meeting Link *
                        </label>
                        <input
                          type="text"
                          value={formData.meetingLink}
                          onChange={(e) => updateField('meetingLink', e.target.value)}
                          placeholder="Enter a valid URL"
                          className={`w-full p-2 rounded-lg border text-xs text-[var(--text-primary)] bg-[var(--surface)] ${
                            fieldErrors.meetingLink ? 'border-red-500' : 'border-[var(--border-color)]'
                          }`}
                        />
                        {fieldErrors.meetingLink && (
                          <p className="text-[11px] text-red-500 mt-1">{fieldErrors.meetingLink}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================= STEP 4: REGISTRATION & COORDINATOR ================= */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                        Registration Type *
                      </label>
                      <select
                        value={formData.registrationType}
                        onChange={(e) => updateField('registrationType', e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)]"
                      >
                        <option value="Individual">Individual Participation</option>
                        <option value="Team">Team Event</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                        Total Capacity / Seats *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formData.capacity}
                        onChange={(e) => updateField('capacity', Number(e.target.value))}
                        className={`w-full p-2.5 rounded-xl border text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] ${
                          fieldErrors.capacity ? 'border-red-500' : 'border-[var(--border-color)]'
                        }`}
                      />
                      {fieldErrors.capacity && (
                        <p className="text-[11px] text-red-500 mt-1">{fieldErrors.capacity}</p>
                      )}
                    </div>
                  </div>

                  {formData.registrationType === 'Team' && (
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Min Team Members
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formData.minTeamSize}
                          onChange={(e) => updateField('minTeamSize', Number(e.target.value))}
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                          Max Team Members
                        </label>
                        <input
                          type="number"
                          min={formData.minTeamSize}
                          value={formData.maxTeamSize}
                          onChange={(e) => updateField('maxTeamSize', Number(e.target.value))}
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Primary Coordinator */}
                  <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2.5">
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      Primary Faculty / Student Coordinator *
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <input
                          type="text"
                          value={formData.primaryCoordinator.name}
                          onChange={(e) =>
                            updateField('primaryCoordinator', {
                              ...formData.primaryCoordinator,
                              name: e.target.value,
                            })
                          }
                          placeholder="Enter coordinator name"
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                        />
                        {fieldErrors.coordName && (
                          <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.coordName}</p>
                        )}
                      </div>
                      <div>
                        <input
                          type="tel"
                          maxLength={10}
                          value={formData.primaryCoordinator.phone}
                          onChange={(e) =>
                            updateField('primaryCoordinator', {
                              ...formData.primaryCoordinator,
                              phone: e.target.value,
                            })
                          }
                          placeholder="Enter 10-digit mobile number"
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                        />
                        {fieldErrors.coordPhone && (
                          <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.coordPhone}</p>
                        )}
                      </div>
                      <div>
                        <input
                          type="email"
                          value={formData.primaryCoordinator.email}
                          onChange={(e) =>
                            updateField('primaryCoordinator', {
                              ...formData.primaryCoordinator,
                              email: e.target.value,
                            })
                          }
                          placeholder="Enter email address"
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                        />
                        {fieldErrors.coordEmail && (
                          <p className="text-[10px] text-red-500 mt-0.5">{fieldErrors.coordEmail}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 5: RULES & PRIZES ================= */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      Rules & Guidelines *
                    </label>
                    <textarea
                      rows={4}
                      value={formData.rulesAndGuidelines}
                      onChange={(e) => updateField('rulesAndGuidelines', e.target.value)}
                      placeholder="Specify event format, judging criteria, eligibility rules, and code of conduct"
                      className={`w-full p-2.5 rounded-xl border text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] ${
                        fieldErrors.rulesAndGuidelines
                          ? 'border-red-500'
                          : 'border-[var(--border-color)]'
                      }`}
                    />
                    {fieldErrors.rulesAndGuidelines && (
                      <p className="text-[11px] text-red-500 mt-1">{fieldErrors.rulesAndGuidelines}</p>
                    )}
                  </div>

                  {/* Prizes */}
                  <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Prize Pool & Awards
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={formData.prizeAvailable}
                          onChange={(e) => updateField('prizeAvailable', e.target.checked)}
                          className="rounded text-[var(--primary-color)]"
                        />
                        Prizes Offered
                      </label>
                    </div>

                    {formData.prizeAvailable && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                            Total Prize Pool in INR (₹)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={formData.totalPrizePool}
                            onChange={(e) => updateField('totalPrizePool', Number(e.target.value))}
                            placeholder="Enter total prize pool in INR"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                            First Prize / Winner Reward
                          </label>
                          <input
                            type="text"
                            value={formData.firstPrize}
                            onChange={(e) => updateField('firstPrize', e.target.value)}
                            placeholder="Enter first prize details"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= STEP 6: PAYMENT & INR ================= */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]">
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">Event Registration Fee</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Select whether this event is free for participants or requires a paid entry fee.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateField('isFree', true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          formData.isFree
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                        }`}
                      >
                        Free
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('isFree', false)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          !formData.isFree
                            ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                            : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                        }`}
                      >
                        Paid (INR ₹)
                      </button>
                    </div>
                  </div>

                  {!formData.isFree && (
                    <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                          Registration Fee per Participant in Indian Rupees (₹) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-[var(--text-muted)]">
                            ₹
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={formData.registrationFee || ''}
                            onChange={(e) => updateField('registrationFee', Number(e.target.value))}
                            placeholder="Enter event fee in INR"
                            className={`w-full pl-7 pr-3 py-2 rounded-lg border text-xs text-[var(--text-primary)] bg-[var(--surface)] ${
                              fieldErrors.registrationFee ? 'border-red-500' : 'border-[var(--border-color)]'
                            }`}
                          />
                        </div>
                        {fieldErrors.registrationFee && (
                          <p className="text-[11px] text-red-500 mt-1">{fieldErrors.registrationFee}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                            Beneficiary / College Payee Name *
                          </label>
                          <input
                            type="text"
                            value={formData.paymentConfig.payeeName}
                            onChange={(e) =>
                              updateField('paymentConfig', {
                                ...formData.paymentConfig,
                                payeeName: e.target.value,
                              })
                            }
                            placeholder="Enter beneficiary or college name"
                            className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                            Beneficiary UPI ID *
                          </label>
                          <input
                            type="text"
                            value={formData.paymentConfig.upiId}
                            onChange={(e) =>
                              updateField('paymentConfig', {
                                ...formData.paymentConfig,
                                upiId: e.target.value,
                              })
                            }
                            placeholder="Enter valid UPI ID (username@provider)"
                            className={`w-full p-2 rounded-lg border text-xs text-[var(--text-primary)] bg-[var(--surface)] ${
                              fieldErrors.upiId ? 'border-red-500' : 'border-[var(--border-color)]'
                            }`}
                          />
                          {fieldErrors.upiId && (
                            <p className="text-[11px] text-red-500 mt-1">{fieldErrors.upiId}</p>
                          )}
                        </div>
                      </div>

                      {/* Generated Live UPI QR Code Preview */}
                      {upiQrPreviewUrl && (
                        <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] flex flex-col sm:flex-row items-center gap-4">
                          <img
                            src={upiQrPreviewUrl}
                            alt="Payment QR"
                            className="w-28 h-28 rounded-lg border border-[var(--border-color)] bg-white p-1 object-contain"
                          />
                          <div className="text-xs space-y-1 text-center sm:text-left">
                            <p className="font-bold text-[var(--text-primary)] flex items-center gap-1 justify-center sm:justify-start">
                              <QrCode className="w-3.5 h-3.5 text-[var(--primary-color)]" />
                              Auto-Generated UPI Payment QR Code
                            </p>
                            <p className="text-[var(--text-muted)] text-[11px]">
                              Payee: <span className="font-semibold">{formData.paymentConfig.payeeName}</span>
                            </p>
                            <p className="text-[var(--text-muted)] text-[11px]">
                              UPI ID: <span className="font-mono">{formData.paymentConfig.upiId}</span>
                            </p>
                            <p className="text-[var(--text-muted)] text-[11px]">
                              Amount Due: <span className="font-bold text-[var(--primary-color)]">₹{formData.registrationFee}</span>
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                          Payment Instructions for Registrants
                        </label>
                        <textarea
                          rows={2}
                          value={formData.paymentConfig.paymentInstructions}
                          onChange={(e) =>
                            updateField('paymentConfig', {
                              ...formData.paymentConfig,
                              paymentInstructions: e.target.value,
                            })
                          }
                          placeholder="Enter instructions (e.g. pay via GPay, PhonePe, Paytm and enter transaction reference)"
                          className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================= STEP 7: CONSOLIDATED CUSTOM DETAILS (Google Forms Style) ================= */}
              {currentStep === 7 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        Custom Registration Details & Questions
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        Default details (Name, Email, Phone, College) are collected automatically. Add custom Google Forms-style questions below.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewCustomForm(!previewCustomForm)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                          previewCustomForm
                            ? 'bg-[var(--primary-color)] text-[var(--primary-text)] border-[var(--primary-color)]'
                            : 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-color)]'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{previewCustomForm ? 'Edit Questions' : 'Preview Form'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="px-3 py-1.5 rounded-xl bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-[var(--primary-hover)] transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Question</span>
                      </button>
                    </div>
                  </div>

                  {previewCustomForm ? (
                    // Live Form Preview Mode
                    <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Live Registration Form Preview
                      </p>
                      {formData.registrationQuestions.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)] italic">
                          No custom questions configured. Only default profile details will be requested.
                        </p>
                      ) : (
                        formData.registrationQuestions.map((q, idx) => (
                          <div key={q.id} className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border-color)] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[var(--text-primary)]">
                                {idx + 1}. {q.label || 'Untitled Question'}
                                {q.required && <span className="text-red-500 ml-1">*</span>}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">
                                {q.type}
                              </span>
                            </div>
                            {q.type === 'Short Text' && (
                              <input
                                type="text"
                                disabled
                                placeholder="Short text answer..."
                                className="w-full p-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] opacity-70"
                              />
                            )}
                            {q.type === 'Image Upload' && (
                              <div className="p-3 border border-dashed border-[var(--border-color)] rounded-lg text-center text-xs text-[var(--text-muted)]">
                                Image File Upload Input (JPG, PNG, WEBP)
                              </div>
                            )}
                            {q.type === 'Link' && (
                              <input
                                type="text"
                                disabled
                                placeholder="https://example.com/project"
                                className="w-full p-2 text-xs rounded-lg border border-[var(--border-color)] bg-[var(--surface-subtle)] opacity-70"
                              />
                            )}
                            {(q.type === 'Select / Multiple Choice' || q.type === 'Dropdown') && (
                              <div className="space-y-1 pl-2">
                                {(q.options || ['Option 1']).map((opt, oIdx) => (
                                  <label key={oIdx} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                    <input type="radio" disabled name={`preview_${q.id}`} />
                                    <span>{opt || `Option ${oIdx + 1}`}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    // Edit Questions List
                    <div className="space-y-3">
                      {formData.registrationQuestions.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-[var(--border-color)] rounded-xl text-xs text-[var(--text-muted)] space-y-2">
                          <p>No custom questions added yet.</p>
                          <button
                            type="button"
                            onClick={handleAddQuestion}
                            className="text-xs font-bold text-[var(--primary-color)] hover:underline cursor-pointer"
                          >
                            + Click here to add your first question
                          </button>
                        </div>
                      ) : (
                        formData.registrationQuestions.map((q, qIdx) => (
                          <div
                            key={q.id}
                            className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[var(--text-secondary)]">
                                Question #{qIdx + 1}
                              </span>
                              <div className="flex items-center gap-3">
                                {/* Required Toggle */}
                                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={q.required}
                                    onChange={(e) => {
                                      const updated = [...formData.registrationQuestions];
                                      updated[qIdx].required = e.target.checked;
                                      updateField('registrationQuestions', updated);
                                    }}
                                    className="rounded text-[var(--primary-color)]"
                                  />
                                  <span>Required</span>
                                </label>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = formData.registrationQuestions.filter(
                                      (_, i) => i !== qIdx
                                    );
                                    updateField('registrationQuestions', updated);
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1 text-xs flex items-center gap-1 cursor-pointer"
                                  title="Delete question"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {/* Question Title */}
                              <div className="sm:col-span-2">
                                <input
                                  type="text"
                                  value={q.label}
                                  onChange={(e) => {
                                    const updated = [...formData.registrationQuestions];
                                    updated[qIdx].label = e.target.value;
                                    updateField('registrationQuestions', updated);
                                  }}
                                  placeholder="Enter custom question label or title"
                                  className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                                />
                              </div>

                              {/* Question Type */}
                              <div>
                                <select
                                  value={q.type}
                                  onChange={(e) => {
                                    const updated = [...formData.registrationQuestions];
                                    updated[qIdx].type = e.target.value;
                                    if (
                                      (e.target.value === 'Select / Multiple Choice' ||
                                        e.target.value === 'Dropdown') &&
                                      (!updated[qIdx].options || updated[qIdx].options?.length === 0)
                                    ) {
                                      updated[qIdx].options = ['Option 1'];
                                    }
                                    updateField('registrationQuestions', updated);
                                  }}
                                  className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                                >
                                  <option value="Short Text">Short Text</option>
                                  <option value="Image Upload">Image Upload</option>
                                  <option value="Link">Link (URL)</option>
                                  <option value="Select / Multiple Choice">Select / Multiple Choice</option>
                                </select>
                              </div>
                            </div>

                            {fieldErrors[`q_${qIdx}`] && (
                              <p className="text-[11px] text-red-500 font-semibold">
                                {fieldErrors[`q_${qIdx}`]}
                              </p>
                            )}

                            {/* Multiple Choice Options Builder */}
                            {(q.type === 'Select / Multiple Choice' || q.type === 'Dropdown') && (
                              <div className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] space-y-2">
                                <p className="text-[11px] font-bold text-[var(--text-secondary)]">
                                  Configured Options
                                </p>
                                <div className="space-y-1.5">
                                  {(q.options || []).map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-2">
                                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                        {optIdx + 1}.
                                      </span>
                                      <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                          const updated = [...formData.registrationQuestions];
                                          const opts = [...(updated[qIdx].options || [])];
                                          opts[optIdx] = e.target.value;
                                          updated[qIdx].options = opts;
                                          updateField('registrationQuestions', updated);
                                        }}
                                        placeholder={`Enter option ${optIdx + 1} text`}
                                        className="flex-1 p-1.5 rounded-md border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs"
                                      />
                                      <button
                                        type="button"
                                        disabled={(q.options || []).length <= 1}
                                        onClick={() => {
                                          const updated = [...formData.registrationQuestions];
                                          const opts = (updated[qIdx].options || []).filter(
                                            (_, i) => i !== optIdx
                                          );
                                          updated[qIdx].options = opts;
                                          updateField('registrationQuestions', updated);
                                        }}
                                        className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30 cursor-pointer"
                                        title="Remove option"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...formData.registrationQuestions];
                                    const opts = [...(updated[qIdx].options || [])];
                                    opts.push(`Option ${opts.length + 1}`);
                                    updated[qIdx].options = opts;
                                    updateField('registrationQuestions', updated);
                                  }}
                                  className="mt-1 text-xs font-semibold text-[var(--primary-color)] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" /> Add Option
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ================= STEP 8: REVIEW & PUBLISH ================= */}
              {currentStep === 8 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
                    <div className="flex items-center gap-3">
                      {formData.poster && (
                        <img
                          src={formData.poster}
                          alt="Poster Preview"
                          className="w-20 h-20 rounded-xl object-cover border border-[var(--border-color)]"
                        />
                      )}
                      <div>
                        <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                          {formData.title || 'Untitled Event'}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                          {formData.category} · {formData.eventMode} · {formData.registrationType}
                        </p>
                        <p className="text-xs font-bold text-[var(--primary-color)] mt-0.5">
                          {formData.isFree ? 'Free Admission' : `₹${formData.registrationFee} INR`}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-color)] grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[var(--text-muted)]">Event Date:</span>{' '}
                        <span className="font-semibold">{formData.eventDate} ({formData.startTime} - {formData.endTime})</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Deadline:</span>{' '}
                        <span className="font-semibold">{formData.registrationDeadline}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Venue:</span>{' '}
                        <span className="font-semibold">{formData.eventMode === 'Online' ? formData.meetingPlatform || 'Online' : formData.venue}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Capacity:</span>{' '}
                        <span className="font-semibold">{formData.capacity} Seats</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Coordinator:</span>{' '}
                        <span className="font-semibold">{formData.primaryCoordinator.name} ({formData.primaryCoordinator.phone})</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Custom Questions:</span>{' '}
                        <span className="font-semibold">{formData.registrationQuestions.length} Questions</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {user?.role === 'Student'
                        ? 'Ready to submit! Your proposal will be reviewed by the target college administration.'
                        : 'All event details verified. Ready to publish immediately to EVENTHUB discovery.'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--border-color)] bg-[var(--surface-subtle)]">
          {isEditingPublished ? (
            <div className="flex items-center justify-end w-full gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(false)}
                className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all cursor-pointer shadow-xs"
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
                    className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface)] flex items-center gap-1.5 cursor-pointer transition-colors"
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
                  className="px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] transition-colors cursor-pointer"
                >
                  Save Draft
                </button>

                {currentStep < WIZARD_STEPS.length ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmit(false)}
                    className="px-6 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    {submitting
                      ? 'Publishing...'
                      : user?.role === 'Student'
                      ? 'Submit Proposal'
                      : 'Publish Event'}
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

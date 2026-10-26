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
  DollarSign,
  Plus,
  Trash2,
  HelpCircle,
  Upload,
  AlertCircle,
  FileText,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ICollege, IEventCustomField, IParticipantQuestion } from '../../types';
import { FileUpload } from '../common/FileUpload';
import { api } from '../../services/api';

interface MultiStepEventFormProps {
  colleges?: ICollege[];
  eventToEdit?: any | null;
  onSuccess: (event: any) => void;
  onCancel?: () => void;
  onClose?: () => void;
  isOpen?: boolean;
  isStudentProposal?: boolean;
}

const STEPS = [
  { id: 1, name: 'Basic Details' },
  { id: 2, name: 'Schedule' },
  { id: 3, name: 'Mode & Venue' },
  { id: 4, name: 'Registration' },
  { id: 5, name: 'Eligibility' },
  { id: 6, name: 'Format & Rounds' },
  { id: 7, name: 'Prizes & Certs' },
  { id: 8, name: 'Coordinators' },
  { id: 9, name: 'Payment' },
  { id: 10, name: 'Custom Info' },
  { id: 11, name: 'Form Builder' },
  { id: 12, name: 'Review & Submit' },
];

interface IEventRound {
  name: string;
  description: string;
  duration?: string;
  qualificationCriteria?: string;
  judgingCriteria?: string;
}

export const MultiStepEventForm: React.FC<MultiStepEventFormProps> = ({
  colleges: propColleges,
  eventToEdit,
  onSuccess,
  onCancel,
  onClose,
  isOpen,
  isStudentProposal,
}) => {
  const { user, college, studentProfile } = useAuth();
  const isStudent = isStudentProposal !== undefined ? isStudentProposal : user?.role === 'Student';
  const handleClose = onClose || onCancel || (() => {});

  const [colleges, setColleges] = useState<ICollege[]>(propColleges || []);

  useEffect(() => {
    if (!propColleges || propColleges.length === 0) {
      api.get<any>('/colleges').then((res) => {
        if (res.success && res.colleges) setColleges(res.colleges);
      });
    }
  }, [propColleges]);

  if (isOpen !== undefined && !isOpen) return null;

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Event Group creation state (Requirements 8, 9)
  const [createEventGroup, setCreateEventGroup] = useState(false);
  const [eventGroupName, setEventGroupName] = useState('');
  const [eventGroupDescription, setEventGroupDescription] = useState('');
  const [eventGroupPhoto, setEventGroupPhoto] = useState('');
  const [eventGroupChatPermissions, setEventGroupChatPermissions] = useState<'Everyone' | 'Admins Only'>('Everyone');

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Basic Details
    title: '',
    poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
    targetCollegeId: colleges[0]?._id || '',
    category: 'Hackathon',
    eventType: 'Technical',
    tagline: '',
    description: '',

    // Step 2: Schedule
    eventDate: '',
    startTime: '',
    endTime: '',
    registrationDeadline: '',
    reportingTime: '',
    registrationOpensOn: '',

    // Step 3: Location & Mode
    eventMode: 'Offline' as 'Offline' | 'Online' | 'Hybrid',
    venue: '',
    hallRoom: '',
    buildingBlock: '',
    address: '',
    googleMapsLink: '',
    transportParkingNotes: '',
    meetingPlatform: '',
    meetingLink: '',

    // Step 4: Registration
    registrationType: 'Individual' as 'Individual' | 'Team',
    minTeamSize: 2,
    maxTeamSize: 4,
    isFree: true,
    registrationFee: 0,
    capacity: 100,

    // Step 5: Eligibility
    educationLevel: ['UG', 'PG'],
    departments: ['All Disciplines'],
    eligibleYears: ['All Years'],
    genderRestriction: 'None',
    institutionRestriction: 'Open to All Colleges',
    additionalEligibilityNotes: '',

    // Step 6: Format & Rounds
    rulesAndGuidelines: '',
    hasMultipleRounds: false,
    rounds: [] as IEventRound[],
    requiredMaterials: '',
    thingsToCarry: '',
    softwareRequirements: '',
    hardwareRequirements: '',
    submissionRequirements: '',
    dressCode: '',

    // Step 7: Prizes & Certificates
    prizeAvailable: false,
    totalPrizePool: 0,
    firstPrize: '',
    secondPrize: '',
    thirdPrize: '',
    specialPrize: '',
    prizeNotes: '',
    certificateAvailable: false,
    participationCertificate: false,
    winnerCertificate: false,
    certificateType: 'Digital' as 'Digital' | 'Physical' | 'Both',
    certificateEligibility: '',
    deliveryMethod: '',

    // Step 8: Coordinators & Facilities
    primaryCoordinator: {
      name: user?.fullName || '',
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
    helpdeskContact: '',
    facilities: {
      food: false,
      foodDetails: '',
      accommodation: false,
      accommodationDetails: '',
      transport: false,
      transportDetails: '',
      parking: false,
      parkingDetails: '',
    },
    importantNotes: '',

    // Step 9: Payment
    paymentConfig: {
      payeeName: college?.name || '',
      upiId: '',
      paymentQr: '',
      paymentInstructions: '',
      refundPolicy: '',
    },

    // Step 10: Custom Event Information
    customDetails: [] as IEventCustomField[],

    // Step 11: Participant Questions
    registrationQuestions: [] as IParticipantQuestion[],
  });

  useEffect(() => {
    if (eventToEdit) {
      setFormData({
        title: eventToEdit.title || '',
        poster: eventToEdit.poster || '',
        targetCollegeId: eventToEdit.targetCollegeId || eventToEdit.hostCollegeId || '',
        category: eventToEdit.category || 'Hackathon',
        eventType: eventToEdit.eventType || 'Technical',
        tagline: eventToEdit.tagline || '',
        description: eventToEdit.description || '',
        eventDate: eventToEdit.eventDate || '',
        startTime: eventToEdit.startTime || '',
        endTime: eventToEdit.endTime || '',
        registrationDeadline: eventToEdit.registrationDeadline ? eventToEdit.registrationDeadline.slice(0, 16) : '',
        reportingTime: eventToEdit.reportingTime || '',
        registrationOpensOn: eventToEdit.registrationOpensOn || '',
        eventMode: eventToEdit.eventMode || 'Offline',
        venue: eventToEdit.venue || '',
        hallRoom: eventToEdit.hallRoom || '',
        buildingBlock: eventToEdit.buildingBlock || '',
        address: eventToEdit.address || '',
        googleMapsLink: eventToEdit.googleMapsLink || '',
        transportParkingNotes: eventToEdit.transportParkingNotes || '',
        meetingPlatform: eventToEdit.meetingPlatform || '',
        meetingLink: eventToEdit.meetingLink || '',
        registrationType: eventToEdit.registrationType || 'Individual',
        minTeamSize: eventToEdit.minTeamSize || 2,
        maxTeamSize: eventToEdit.maxTeamSize || 4,
        isFree: eventToEdit.isFree !== undefined ? eventToEdit.isFree : true,
        registrationFee: eventToEdit.registrationFee || 0,
        capacity: eventToEdit.capacity || 100,
        educationLevel: eventToEdit.educationLevel || ['UG', 'PG'],
        departments: eventToEdit.departments || ['All Disciplines'],
        eligibleYears: eventToEdit.eligibleYears || ['All Years'],
        genderRestriction: eventToEdit.genderRestriction || 'None',
        institutionRestriction: eventToEdit.institutionRestriction || 'Open to All Colleges',
        additionalEligibilityNotes: eventToEdit.additionalEligibilityNotes || '',
        rulesAndGuidelines: eventToEdit.rulesAndGuidelines || '',
        hasMultipleRounds: Boolean(eventToEdit.hasMultipleRounds),
        rounds: Array.isArray(eventToEdit.rounds) ? eventToEdit.rounds : [],
        requiredMaterials: eventToEdit.requiredMaterials || '',
        thingsToCarry: eventToEdit.thingsToCarry || '',
        softwareRequirements: eventToEdit.softwareRequirements || '',
        hardwareRequirements: eventToEdit.hardwareRequirements || '',
        submissionRequirements: eventToEdit.submissionRequirements || '',
        dressCode: eventToEdit.dressCode || '',
        prizeAvailable: Boolean(eventToEdit.prizeAvailable),
        totalPrizePool: eventToEdit.totalPrizePool || 0,
        firstPrize: eventToEdit.firstPrize || '',
        secondPrize: eventToEdit.secondPrize || '',
        thirdPrize: eventToEdit.thirdPrize || '',
        specialPrize: eventToEdit.specialPrize || '',
        prizeNotes: eventToEdit.prizeNotes || '',
        certificateAvailable: Boolean(eventToEdit.certificateAvailable),
        participationCertificate: Boolean(eventToEdit.participationCertificate),
        winnerCertificate: Boolean(eventToEdit.winnerCertificate),
        certificateType: eventToEdit.certificateType || 'Digital',
        certificateEligibility: eventToEdit.certificateEligibility || '',
        deliveryMethod: eventToEdit.deliveryMethod || '',
        primaryCoordinator: eventToEdit.primaryCoordinator || {
          name: user?.fullName || '',
          role: 'Lead Coordinator',
          phone: studentProfile?.phoneNumber || '',
          email: user?.email || '',
        },
        secondaryCoordinator: eventToEdit.secondaryCoordinator || {
          name: '',
          role: '',
          phone: '',
          email: '',
        },
        helpdeskContact: eventToEdit.helpdeskContact || '',
        facilities: eventToEdit.facilities || {
          food: false,
          foodDetails: '',
          accommodation: false,
          accommodationDetails: '',
          transport: false,
          transportDetails: '',
          parking: false,
          parkingDetails: '',
        },
        importantNotes: eventToEdit.importantNotes || '',
        paymentConfig: eventToEdit.paymentConfig || {
          payeeName: college?.name || '',
          upiId: '',
          paymentQr: '',
          paymentInstructions: '',
          refundPolicy: '',
        },
        customDetails: Array.isArray(eventToEdit.customDetails) ? eventToEdit.customDetails : [],
        registrationQuestions: Array.isArray(eventToEdit.registrationQuestions) ? eventToEdit.registrationQuestions : [],
      });
    }
  }, [eventToEdit, user, college]);

  const updateField = (field: string, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const validateCurrentStep = (): boolean => {
    setError(null);
    if (currentStep === 1) {
      if (!formData.title.trim()) {
        setError('Event title is required.');
        return false;
      }
      if (!formData.poster) {
        setError('Event poster is required.');
        return false;
      }
      if (!formData.description.trim()) {
        setError('Event description is required.');
        return false;
      }
      if (isStudent && !formData.targetCollegeId) {
        setError('Target College must be selected.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.eventDate) {
        setError('Event date is required.');
        return false;
      }
      if (!formData.startTime || !formData.endTime) {
        setError('Start and end times are required.');
        return false;
      }
      if (!formData.registrationDeadline) {
        setError('Registration deadline is required.');
        return false;
      }
    } else if (currentStep === 3) {
      if ((formData.eventMode === 'Offline' || formData.eventMode === 'Hybrid') && !formData.venue.trim()) {
        setError('Venue is required for Offline/Hybrid events.');
        return false;
      }
      if ((formData.eventMode === 'Online' || formData.eventMode === 'Hybrid') && !formData.meetingLink.trim()) {
        setError('Meeting link is required for Online/Hybrid events.');
        return false;
      }
    } else if (currentStep === 4) {
      if (formData.capacity <= 0) {
        setError('Capacity must be at least 1 participant.');
        return false;
      }
      if (!formData.isFree && formData.registrationFee <= 0) {
        setError('Registration fee must be greater than 0 for paid events.');
        return false;
      }
    } else if (currentStep === 6) {
      if (!formData.rulesAndGuidelines.trim()) {
        setError('Rules & guidelines are required for the competition.');
        return false;
      }
    } else if (currentStep === 8) {
      if (
        !formData.primaryCoordinator.name.trim() ||
        !formData.primaryCoordinator.phone.trim() ||
        !formData.primaryCoordinator.email.trim()
      ) {
        setError('Primary coordinator name, phone, and email are required.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (saveAsDraft = false) => {
    if (!validateCurrentStep()) return;
    setSubmitting(true);
    setError(null);

    try {
      const sanitizedSecondary = formData.secondaryCoordinator?.name?.trim()
        ? formData.secondaryCoordinator
        : undefined;

      const sanitizedCustomDetails = (formData.customDetails || []).filter(
        (cd) => cd.label?.trim() && cd.value?.trim()
      );

      const payload = {
        ...formData,
        tagline: formData.tagline?.trim() || '',
        reportingTime: formData.reportingTime?.trim() || '',
        venue: formData.eventMode === 'Online' ? '' : formData.venue?.trim() || '',
        hallRoom: formData.eventMode === 'Online' ? '' : formData.hallRoom?.trim() || '',
        buildingBlock: formData.eventMode === 'Online' ? '' : formData.buildingBlock?.trim() || '',
        address: formData.eventMode === 'Online' ? '' : formData.address?.trim() || '',
        googleMapsLink: formData.eventMode === 'Online' ? '' : formData.googleMapsLink?.trim() || '',
        transportParkingNotes: formData.eventMode === 'Online' ? '' : formData.transportParkingNotes?.trim() || '',
        meetingPlatform: formData.eventMode === 'Offline' ? '' : formData.meetingPlatform?.trim() || '',
        meetingLink: formData.eventMode === 'Offline' ? '' : formData.meetingLink?.trim() || '',
        additionalEligibilityNotes: formData.additionalEligibilityNotes?.trim() || '',
        rulesAndGuidelines: formData.rulesAndGuidelines?.trim() || '',
        rounds: formData.hasMultipleRounds ? formData.rounds : [],
        requiredMaterials: formData.requiredMaterials?.trim() || '',
        thingsToCarry: formData.thingsToCarry?.trim() || '',
        softwareRequirements: formData.softwareRequirements?.trim() || '',
        hardwareRequirements: formData.hardwareRequirements?.trim() || '',
        submissionRequirements: formData.submissionRequirements?.trim() || '',
        dressCode: formData.dressCode?.trim() || '',
        totalPrizePool: formData.prizeAvailable ? Number(formData.totalPrizePool) || 0 : 0,
        firstPrize: formData.prizeAvailable ? formData.firstPrize?.trim() || '' : '',
        secondPrize: formData.prizeAvailable ? formData.secondPrize?.trim() || '' : '',
        thirdPrize: formData.prizeAvailable ? formData.thirdPrize?.trim() || '' : '',
        specialPrize: formData.prizeAvailable ? formData.specialPrize?.trim() || '' : '',
        prizeNotes: formData.prizeAvailable ? formData.prizeNotes?.trim() || '' : '',
        participationCertificate: formData.certificateAvailable ? Boolean(formData.participationCertificate) : false,
        winnerCertificate: formData.certificateAvailable ? Boolean(formData.winnerCertificate) : false,
        certificateEligibility: formData.certificateAvailable ? formData.certificateEligibility?.trim() || '' : '',
        deliveryMethod: formData.certificateAvailable ? formData.deliveryMethod?.trim() || '' : '',
        secondaryCoordinator: sanitizedSecondary,
        helpdeskContact: formData.helpdeskContact?.trim() || '',
        facilities: formData.facilities,
        importantNotes: formData.importantNotes?.trim() || '',
        customDetails: sanitizedCustomDetails,
        saveAsDraft,
      };

      const res = eventToEdit
        ? await api.put<any>(`/events/${eventToEdit._id}`, payload)
        : await api.post<any>('/events', payload);

      if (res.success && res.event) {
        // Automatically create official Event Group if enabled (Requirements 8, 9)
        if (createEventGroup && !eventToEdit && !saveAsDraft) {
          try {
            await api.post('/groups', {
              name: (eventGroupName.trim() || `${res.event.title} — Official Group`).trim(),
              description: (
                eventGroupDescription.trim() || `Official participant community for ${res.event.title}`
              ).trim(),
              imageUrl: eventGroupPhoto || res.event.poster || '',
              type: 'Event',
              eventId: res.event._id,
              hostCollegeId: res.event.hostCollegeId || (college ? college._id : undefined),
              chatPermissions: eventGroupChatPermissions,
              visibility: 'Event Participants Only',
            });
          } catch (grpErr) {
            console.error('Failed to create official event group:', grpErr);
          }
        }
        onSuccess(res.event);
      } else {
        setError(res.message || 'Failed to save event');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save event. Please verify all fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const formBody = (
    <div className="max-w-4xl mx-auto rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto">
      {/* Header Banner */}
      <div className="mb-6 pb-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
            {eventToEdit
              ? (isStudent ? 'Edit Student Event Proposal' : 'Edit Event')
              : (isStudent ? 'Create Student Event Proposal' : 'Create & Publish College Event')}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Step {currentStep} of 12: {STEPS[currentStep - 1].name}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2 rounded-lg border border-[var(--border-color)] flex items-center gap-1 cursor-pointer"
        >
          <X className="w-4 h-4" /> Close
        </button>
      </div>

      {/* Steps Breadcrumb Slider */}
      <div className="overflow-x-auto pb-3 mb-6">
        <div className="flex items-center gap-1.5 min-w-max">
          {STEPS.map((s) => {
            const isCurrent = currentStep === s.id;
            const isDone = currentStep > s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id < currentStep || validateCurrentStep()) {
                    setCurrentStep(s.id);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                    : isDone
                    ? 'bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-color)]'
                    : 'text-[var(--text-muted)] opacity-60'
                }`}
              >
                <span>{s.id}.</span>
                <span>{s.name}</span>
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Basic Details */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Event Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. National Autonomous Robotics Championship 2026"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden"
              >
                <option value="Hackathon">Hackathon</option>
                <option value="Robotics">Robotics</option>
                <option value="Design">Design</option>
                <option value="Technical">Technical</option>
                <option value="Cultural">Cultural</option>
                <option value="Workshop">Workshop</option>
                <option value="Seminar">Seminar</option>
                <option value="Sports">Sports</option>
                <option value="Management">Management</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Event Type *
              </label>
              <input
                type="text"
                value={formData.eventType}
                onChange={(e) => updateField('eventType', e.target.value)}
                placeholder="e.g. Competitive Hackathon / Symposium"
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Host / Target College selection */}
          {isStudent ? (
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Target College for Proposal Approval *
              </label>
              <select
                value={formData.targetCollegeId}
                onChange={(e) => updateField('targetCollegeId', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden"
              >
                {colleges.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.officialDomain})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Your proposal will be sent directly to the college administration for review.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Host College
              </label>
              <input
                type="text"
                disabled
                value={college?.name || 'Apex Institute of Technology'}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-muted)] opacity-80"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Tagline (Optional)
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => updateField('tagline', e.target.value)}
              placeholder="e.g. Build, Innovate, and Scale Real Solutions"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>

          {/* Poster Upload with real file picker */}
          <FileUpload
            label="Event Poster / Banner (16:9 recommended) *"
            helperText="Upload event poster image (JPG, PNG, WEBP)"
            value={formData.poster}
            onChange={(url) => updateField('poster', url)}
          />

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Description *
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Detailed overview of the event, objectives, and what participants can expect..."
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden"
            />
          </div>
        </div>
      )}

      {/* STEP 2: Schedule */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Event Date *
              </label>
              <input
                type="date"
                value={formData.eventDate}
                onChange={(e) => updateField('eventDate', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Start Time *
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => updateField('startTime', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                End Time *
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => updateField('endTime', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Registration Deadline *
              </label>
              <input
                type="datetime-local"
                value={formData.registrationDeadline}
                onChange={(e) => updateField('registrationDeadline', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Reporting Time
              </label>
              <input
                type="text"
                value={formData.reportingTime}
                onChange={(e) => updateField('reportingTime', e.target.value)}
                placeholder="e.g. 08:30 AM"
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Location & Mode */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-2">
              Event Mode *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['Offline', 'Online', 'Hybrid'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateField('eventMode', m)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                    formData.eventMode === m
                      ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-[var(--primary-text)] shadow-xs'
                      : 'border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {(formData.eventMode === 'Offline' || formData.eventMode === 'Hybrid') && (
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
              <h4 className="text-xs font-bold uppercase text-[var(--text-primary)] tracking-wide">
                Offline Venue Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Venue *
                  </label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) => updateField('venue', e.target.value)}
                    placeholder="e.g. Main Auditorium"
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Hall / Room
                  </label>
                  <input
                    type="text"
                    value={formData.hallRoom}
                    onChange={(e) => updateField('hallRoom', e.target.value)}
                    placeholder="e.g. Hall 4"
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Building / Block
                  </label>
                  <input
                    type="text"
                    value={formData.buildingBlock}
                    onChange={(e) => updateField('buildingBlock', e.target.value)}
                    placeholder="e.g. Science Block B"
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Google Maps Link
                  </label>
                  <input
                    type="url"
                    value={formData.googleMapsLink}
                    onChange={(e) => updateField('googleMapsLink', e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>
            </div>
          )}

          {(formData.eventMode === 'Online' || formData.eventMode === 'Hybrid') && (
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
              <h4 className="text-xs font-bold uppercase text-[var(--text-primary)] tracking-wide">
                Online Access Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Meeting Platform
                  </label>
                  <input
                    type="text"
                    value={formData.meetingPlatform}
                    onChange={(e) => updateField('meetingPlatform', e.target.value)}
                    placeholder="e.g. Zoom / Google Meet / Discord"
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Meeting Link *
                  </label>
                  <input
                    type="url"
                    value={formData.meetingLink}
                    onChange={(e) => updateField('meetingLink', e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: Registration Details */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Registration Type *
              </label>
              <select
                value={formData.registrationType}
                onChange={(e) => updateField('registrationType', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)]"
              >
                <option value="Individual">Individual Participant</option>
                <option value="Team">Team Registration</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Capacity (Seats) *
              </label>
              <input
                type="number"
                min={1}
                value={formData.capacity}
                onChange={(e) => updateField('capacity', Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)]"
              />
            </div>
          </div>

          {formData.registrationType === 'Team' && (
            <div className="grid grid-cols-2 gap-4 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Min Team Size
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.minTeamSize}
                  onChange={(e) => updateField('minTeamSize', Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Max Team Size
                </label>
                <input
                  type="number"
                  min={formData.minTeamSize}
                  value={formData.maxTeamSize}
                  onChange={(e) => updateField('maxTeamSize', Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                />
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Free Event</h4>
                <p className="text-[11px] text-[var(--text-muted)]">No ticket fee required for participants</p>
              </div>
              <input
                type="checkbox"
                checked={formData.isFree}
                onChange={(e) => updateField('isFree', e.target.checked)}
                className="w-5 h-5 rounded-md accent-[var(--primary-color)] cursor-pointer"
              />
            </div>

            {!formData.isFree && (
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Registration Fee ($) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.registrationFee}
                  onChange={(e) => updateField('registrationFee', Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-sm text-[var(--text-primary)] font-bold"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 5: Eligibility */}
      {currentStep === 5 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Eligible Education Levels
            </label>
            <div className="flex flex-wrap gap-2">
              {['School', 'Diploma', 'UG', 'PG', 'PhD'].map((lvl) => {
                const checked = formData.educationLevel.includes(lvl);
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      const updated = checked
                        ? formData.educationLevel.filter((l) => l !== lvl)
                        : [...formData.educationLevel, lvl];
                      updateField('educationLevel', updated);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      checked
                        ? 'bg-[var(--primary-color)] text-[var(--primary-text)]'
                        : 'border border-[var(--border-color)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Eligible Departments (Comma separated)
            </label>
            <input
              type="text"
              value={formData.departments.join(', ')}
              onChange={(e) =>
                updateField(
                  'departments',
                  e.target.value.split(',').map((d) => d.trim()).filter(Boolean)
                )
              }
              placeholder="e.g. Computer Science, Electronics, Mechanical"
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Additional Eligibility Notes
            </label>
            <textarea
              rows={2}
              value={formData.additionalEligibilityNotes}
              onChange={(e) => updateField('additionalEligibilityNotes', e.target.value)}
              placeholder="Any specific prerequisite knowledge, device restrictions, or rules..."
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)]"
            />
          </div>
        </div>
      )}

      {/* STEP 6: Format & Multiple Rounds */}
      {currentStep === 6 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Rules & Guidelines *
            </label>
            <textarea
              rows={3}
              value={formData.rulesAndGuidelines}
              onChange={(e) => updateField('rulesAndGuidelines', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)]"
            />
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Multiple Rounds</h4>
                <p className="text-[11px] text-[var(--text-muted)]">Enable multi-stage competitions with qualification criteria</p>
              </div>
              <input
                type="checkbox"
                checked={formData.hasMultipleRounds}
                onChange={(e) => updateField('hasMultipleRounds', e.target.checked)}
                className="w-5 h-5 rounded-md accent-[var(--primary-color)] cursor-pointer"
              />
            </div>

            {formData.hasMultipleRounds && (
              <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                {formData.rounds.map((round, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Round {idx + 1}
                      </span>
                      {formData.rounds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.rounds.filter((_, i) => i !== idx);
                            updateField('rounds', updated);
                          }}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={round.name}
                      onChange={(e) => {
                        const updated = [...formData.rounds];
                        updated[idx].name = e.target.value;
                        updateField('rounds', updated);
                      }}
                      placeholder="Round Name"
                      className="w-full p-1.5 rounded-md border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                    />
                    <input
                      type="text"
                      value={round.description}
                      onChange={(e) => {
                        const updated = [...formData.rounds];
                        updated[idx].description = e.target.value;
                        updateField('rounds', updated);
                      }}
                      placeholder="Round Description & Criteria"
                      className="w-full p-1.5 rounded-md border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    updateField('rounds', [
                      ...formData.rounds,
                      { name: `Round ${formData.rounds.length + 1}`, description: '', duration: '', qualificationCriteria: '', judgingCriteria: '' },
                    ]);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  + Add Another Round
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 7: Prizes & Certificates */}
      {currentStep === 7 && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Prize Available</h4>
                <p className="text-[11px] text-[var(--text-muted)]">Configure prize pool and podium awards</p>
              </div>
              <input
                type="checkbox"
                checked={formData.prizeAvailable}
                onChange={(e) => updateField('prizeAvailable', e.target.checked)}
                className="w-5 h-5 rounded-md accent-[var(--primary-color)] cursor-pointer"
              />
            </div>

            {formData.prizeAvailable && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Total Prize Pool ($)
                  </label>
                  <input
                    type="number"
                    value={formData.totalPrizePool}
                    onChange={(e) => updateField('totalPrizePool', Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    First Prize
                  </label>
                  <input
                    type="text"
                    value={formData.firstPrize}
                    onChange={(e) => updateField('firstPrize', e.target.value)}
                    placeholder="e.g. $1,000 + Certificate"
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Second Prize
                  </label>
                  <input
                    type="text"
                    value={formData.secondPrize}
                    onChange={(e) => updateField('secondPrize', e.target.value)}
                    placeholder="e.g. $500"
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Third Prize
                  </label>
                  <input
                    type="text"
                    value={formData.thirdPrize}
                    onChange={(e) => updateField('thirdPrize', e.target.value)}
                    placeholder="e.g. $250"
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[var(--text-primary)]">Certificate Available</h4>
                <p className="text-[11px] text-[var(--text-muted)]">Issue verified participation & merit certificates</p>
              </div>
              <input
                type="checkbox"
                checked={formData.certificateAvailable}
                onChange={(e) => updateField('certificateAvailable', e.target.checked)}
                className="w-5 h-5 rounded-md accent-[var(--primary-color)] cursor-pointer"
              />
            </div>

            {formData.certificateAvailable && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="part_cert"
                    checked={formData.participationCertificate}
                    onChange={(e) => updateField('participationCertificate', e.target.checked)}
                    className="w-4 h-4 rounded-sm accent-[var(--primary-color)]"
                  />
                  <label htmlFor="part_cert" className="text-xs font-medium text-[var(--text-primary)]">
                    Participation Certificate
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="win_cert"
                    checked={formData.winnerCertificate}
                    onChange={(e) => updateField('winnerCertificate', e.target.checked)}
                    className="w-4 h-4 rounded-sm accent-[var(--primary-color)]"
                  />
                  <label htmlFor="win_cert" className="text-xs font-medium text-[var(--text-primary)]">
                    Winner / Merit Certificate
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 8: Coordinators & Facilities */}
      {currentStep === 8 && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
            <h4 className="text-xs font-bold uppercase text-[var(--text-primary)] tracking-wide">
              Primary Coordinator Details *
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.primaryCoordinator.name}
                  onChange={(e) =>
                    updateField('primaryCoordinator', { ...formData.primaryCoordinator, name: e.target.value })
                  }
                  className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={formData.primaryCoordinator.role}
                  onChange={(e) =>
                    updateField('primaryCoordinator', { ...formData.primaryCoordinator, role: e.target.value })
                  }
                  className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Phone *
                </label>
                <input
                  type="text"
                  value={formData.primaryCoordinator.phone}
                  onChange={(e) =>
                    updateField('primaryCoordinator', { ...formData.primaryCoordinator, phone: e.target.value })
                  }
                  className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.primaryCoordinator.email}
                  onChange={(e) =>
                    updateField('primaryCoordinator', { ...formData.primaryCoordinator, email: e.target.value })
                  }
                  className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
            <h4 className="text-xs font-bold uppercase text-[var(--text-primary)] tracking-wide">
              Participant Support & Facilities
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { key: 'food', label: 'Food Provided' },
                { key: 'accommodation', label: 'Accommodation' },
                { key: 'transport', label: 'Transport Shuttles' },
                { key: 'parking', label: 'Campus Parking' },
              ].map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(formData.facilities as any)[f.key]}
                    onChange={(e) =>
                      updateField('facilities', { ...formData.facilities, [f.key]: e.target.checked })
                    }
                    className="w-4 h-4 rounded-sm accent-[var(--primary-color)]"
                  />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 9: Payment Config */}
      {currentStep === 9 && (
        <div className="space-y-4">
          {formData.isFree ? (
            <div className="p-6 text-center rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)]">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                This event is marked as FREE.
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                No payment configuration is required for free participant registrations.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
              <h4 className="text-xs font-bold uppercase text-[var(--text-primary)] tracking-wide">
                Organizer Payment Setup
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Payee / Account Name
                  </label>
                  <input
                    type="text"
                    value={formData.paymentConfig.payeeName}
                    onChange={(e) =>
                      updateField('paymentConfig', { ...formData.paymentConfig, payeeName: e.target.value })
                    }
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    UPI ID (Optional fallback)
                  </label>
                  <input
                    type="text"
                    value={formData.paymentConfig.upiId}
                    onChange={(e) =>
                      updateField('paymentConfig', { ...formData.paymentConfig, upiId: e.target.value })
                    }
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Refund Policy
                </label>
                <input
                  type="text"
                  value={formData.paymentConfig.refundPolicy}
                  onChange={(e) =>
                    updateField('paymentConfig', { ...formData.paymentConfig, refundPolicy: e.target.value })
                  }
                  className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 10: Custom Event Information */}
      {currentStep === 10 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Add Custom Event Information
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Add event-specific details displayed under "Additional Event Information".
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newField: IEventCustomField = {
                  id: `cd_${Date.now()}`,
                  label: '',
                  type: 'Short Text',
                  value: '',
                  description: '',
                };
                updateField('customDetails', [...formData.customDetails, newField]);
              }}
              className="px-3 py-1.5 rounded-lg bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Custom Detail
            </button>
          </div>

          <div className="space-y-3">
            {formData.customDetails.map((detail, idx) => (
              <div key={detail.id} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-secondary)]">Detail #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      updateField(
                        'customDetails',
                        formData.customDetails.filter((_, i) => i !== idx)
                      );
                    }}
                    className="text-xs text-red-500 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={detail.label}
                    onChange={(e) => {
                      const updated = [...formData.customDetails];
                      updated[idx].label = e.target.value;
                      updateField('customDetails', updated);
                    }}
                    placeholder="Label (e.g. Discord Link)"
                    className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                  />
                  <select
                    value={detail.type}
                    onChange={(e) => {
                      const updated = [...formData.customDetails];
                      updated[idx].type = e.target.value as any;
                      updateField('customDetails', updated);
                    }}
                    className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                  >
                    <option value="Short Text">Short Text</option>
                    <option value="Long Text">Long Text</option>
                    <option value="Link">Link / URL</option>
                    <option value="Number">Number</option>
                    <option value="Date">Date</option>
                  </select>
                  <input
                    type="text"
                    value={detail.value}
                    onChange={(e) => {
                      const updated = [...formData.customDetails];
                      updated[idx].value = e.target.value;
                      updateField('customDetails', updated);
                    }}
                    placeholder="Value (e.g. https://discord.gg/...)"
                    className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 11: Participant Registration Form Builder */}
      {currentStep === 11 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Participant Registration Questions
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Standard profile questions (Name, Email, College, Phone, Department, Year) are prefilled automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newQ: IParticipantQuestion = {
                  id: `q_${Date.now()}`,
                  label: '',
                  type: 'Short Answer',
                  required: true,
                  helperText: '',
                };
                updateField('registrationQuestions', [...formData.registrationQuestions, newQ]);
              }}
              className="px-3 py-1.5 rounded-lg bg-[var(--primary-color)] text-[var(--primary-text)] text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Question
            </button>
          </div>

          <div className="space-y-3">
            {formData.registrationQuestions.map((q, idx) => (
              <div key={q.id} className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-secondary)]">Question #{idx + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) => {
                          const updated = [...formData.registrationQuestions];
                          updated[idx].required = e.target.checked;
                          updateField('registrationQuestions', updated);
                        }}
                        className="w-3.5 h-3.5 rounded-sm accent-[var(--primary-color)]"
                      />
                      <span>Required</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        updateField(
                          'registrationQuestions',
                          formData.registrationQuestions.filter((_, i) => i !== idx)
                        );
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={q.label}
                    onChange={(e) => {
                      const updated = [...formData.registrationQuestions];
                      updated[idx].label = e.target.value;
                      updateField('registrationQuestions', updated);
                    }}
                    placeholder="Question Label (e.g. GitHub Profile Link)"
                    className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                  />
                  <select
                    value={q.type}
                    onChange={(e) => {
                      const updated = [...formData.registrationQuestions];
                      updated[idx].type = e.target.value;
                      updateField('registrationQuestions', updated);
                    }}
                    className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                  >
                    <option value="Short Answer">Short Answer</option>
                    <option value="Long Answer">Long Answer</option>
                    <option value="Number">Number</option>
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                    <option value="Date">Date</option>
                    <option value="Dropdown">Dropdown</option>
                    <option value="Multiple Choice">Multiple Choice (Single Choice)</option>
                    <option value="Checkbox">Checkbox (Multi-Select)</option>
                    <option value="Link">Link / URL</option>
                    <option value="File Upload">File Upload (PDF / Document)</option>
                    <option value="Image Upload">Image Upload</option>
                  </select>
                </div>

                {(q.type === 'Dropdown' || q.type === 'Multiple Choice' || q.type === 'Checkbox') && (
                  <input
                    type="text"
                    value={(q.options || []).join(', ')}
                    onChange={(e) => {
                      const updated = [...formData.registrationQuestions];
                      updated[idx].options = e.target.value.split(',').map((o) => o.trim()).filter(Boolean);
                      updateField('registrationQuestions', updated);
                    }}
                    placeholder="Options (comma separated, e.g. Track A, Track B, Track C)"
                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)]"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 12: Review & Submit */}
      {currentStep === 12 && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-3">
            <h3 className="text-base font-bold text-[var(--text-primary)]">{formData.title}</h3>
            <div className="aspect-video w-full max-h-48 rounded-lg overflow-hidden bg-black flex items-center justify-center">
              <img src={formData.poster} alt="Poster preview" className="w-full h-full object-contain" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[var(--text-secondary)]">
              <div>
                <span className="font-semibold text-[var(--text-primary)]">Category: </span>
                {formData.category}
              </div>
              <div>
                <span className="font-semibold text-[var(--text-primary)]">Mode: </span>
                {formData.eventMode}
              </div>
              <div>
                <span className="font-semibold text-[var(--text-primary)]">Date: </span>
                {formData.eventDate}
              </div>
              <div>
                <span className="font-semibold text-[var(--text-primary)]">Fee: </span>
                {formData.isFree ? 'FREE' : `$${formData.registrationFee}`}
              </div>
            </div>
          </div>

          {/* Requirement 8 & 9: Create Event Group Option */}
          {!eventToEdit && !isStudent && (
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">
                      Create Official Event Group
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Create an official group for this event to communicate and collaborate with attendees
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createEventGroup}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCreateEventGroup(checked);
                      if (checked && !eventGroupName) {
                        setEventGroupName(`${formData.title || 'Event'} — Official Group`);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                </label>
              </div>

              {createEventGroup && (
                <div className="space-y-3 pt-3 border-t border-indigo-500/20 text-xs animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={eventGroupName || `${formData.title || 'Event'} — Official Group`}
                      onChange={(e) => setEventGroupName(e.target.value)}
                      placeholder="e.g. Hackathon 2026 — Official Group"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                      Group Description (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={eventGroupDescription}
                      onChange={(e) => setEventGroupDescription(e.target.value)}
                      placeholder={`Official participant community and announcements for ${formData.title || 'this event'}.`}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] font-medium resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                        Who Can Send Messages
                      </label>
                      <select
                        value={eventGroupChatPermissions}
                        onChange={(e) => setEventGroupChatPermissions(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] text-xs text-[var(--text-primary)] font-medium"
                      >
                        <option value="Everyone">Everyone (All Participants)</option>
                        <option value="Admins Only">Admins Only (Broadcast / Announcements)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[var(--text-primary)] mb-1">
                        Group Photo
                      </label>
                      <p className="text-[11px] text-[var(--text-muted)] py-2">
                        Defaults to event poster automatically
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-[var(--text-muted)]">
            {isStudent
              ? 'Submitting this proposal will send it to the Target College administrator for official review and approval.'
              : 'Submitting will immediately publish this event live on EVENTHUB under your verified college profile.'}
          </p>
        </div>
      )}

      {/* Footer Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-[var(--border-color)]">
        <div>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentStep < 12 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-semibold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(true)}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit(false)}
                className="px-6 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : isStudent ? 'Submit for Approval' : 'Publish Event'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (isOpen !== undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
        <div className="w-full max-w-4xl my-auto">
          {formBody}
        </div>
      </div>
    );
  }

  return formBody;
};

export type ThemeMode =
  | 'classic-blue'
  | 'neutral-slate'
  | 'system'
  | 'light'
  | 'dark';

export type UserRole = 'Student' | 'College Super Admin' | 'College Admin';

export interface IUser {
  id: string;
  _id?: string;
  email: string;
  role: UserRole;
  fullName: string;
  collegeId?: string;
}

export interface IStudentProfile {
  _id: string;
  id?: string;
  userId: string;
  fullName: string;
  username?: string;
  email?: string;
  collegeName: string;
  targetCollegeId?: string;
  phoneNumber?: string;
  department: string;
  yearOfStudy: string;
  bio?: string;
  location?: string;
  profilePhoto?: string;
  coverPhoto?: string;
  skills: string[];
  achievements: string[];
  profileVisibility?: 'Everyone' | 'EVENTHUB users' | 'Connections only' | 'Private' | 'Public';
  messagePrivacy?: 'Everyone' | 'Connections only' | 'Same college only' | 'Nobody' | 'Following' | 'Connections';
  resumePrivacy?: 'Everyone' | 'Connections' | 'Colleges only' | 'Private';
  groupAddPrivacy?: 'Everyone' | 'Connections only' | 'Same college only' | 'Nobody / request only';
  resumeFileUrl?: string;
  resumeFileType?: string;
  resumeOriginalName?: string;
  resumeUploadedAt?: string;
  resumeCoverUrl?: string;
  canAccessResume?: boolean;
  isPrivateRestricted?: boolean;
  isFollowing?: boolean;
  followersCount: number;
  followingCount: number;
  connectionsCount: number;
  certificatesCount?: number;
  eventsCount?: number;
  registeredCount?: number;
  attendedEventsCount?: number;
  organizedCount?: number;
}

export interface ICollege {
  _id: string;
  id?: string;
  name: string;
  username?: string;
  officialEmail: string;
  officialDomain: string;
  contactNumber: string;
  location: string;
  bio: string;
  website?: string;
  logo: string;
  coverPhoto: string;
  verificationStatus: 'Pending' | 'Verified' | 'Rejected';
  isVerified?: boolean;
  rejectionReason?: string;
  superAdminId: string;
  messagePrivacy?: 'Everyone' | 'Connected' | 'Nobody';
  connectionsCount: number;
  activeEventsCount?: number;
  placementsCount?: number;
  infrastructureCount?: number;
}

export interface IEventCustomField {
  id: string;
  label: string;
  type: string;
  value: string;
  description?: string;
}

export interface IParticipantQuestion {
  id: string;
  label: string;
  type: string;
  required: boolean;
  helperText?: string;
  options?: string[];
}

export interface IEvent {
  _id: string;
  id?: string;
  title: string;
  poster: string;
  hostCollegeId: string;
  hostCollegeName: string;
  hostCollegeLogo?: string;
  isCollegeVerified: boolean;
  category: string;
  eventType: string;
  tagline?: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  reportingTime?: string;
  registrationOpensOn?: string;
  eventMode: 'Offline' | 'Online' | 'Hybrid';
  venue?: string;
  hallRoom?: string;
  buildingBlock?: string;
  address?: string;
  googleMapsLink?: string;
  transportParkingNotes?: string;
  meetingPlatform?: string;
  meetingLink?: string;
  registrationType: 'Individual' | 'Team';
  minTeamSize?: number;
  maxTeamSize?: number;
  isFree: boolean;
  registrationFee: number;
  capacity: number;
  registeredCount: number;
  seatsLeft?: number;
  deadlineStatus?: 'Open' | 'Closing Soon' | 'Closed';
  isFull?: boolean;
  isClosed?: boolean;
  educationLevel: string[];
  departments: string[];
  eligibleYears: string[];
  genderRestriction?: string;
  institutionRestriction?: string;
  additionalEligibilityNotes?: string;
  rulesAndGuidelines: string;
  hasMultipleRounds: boolean;
  rounds?: Array<{
    name: string;
    description: string;
    duration?: string;
    qualificationCriteria?: string;
    judgingCriteria?: string;
  }>;
  requiredMaterials?: string;
  thingsToCarry?: string;
  softwareRequirements?: string;
  hardwareRequirements?: string;
  submissionRequirements?: string;
  dressCode?: string;
  prizeAvailable: boolean;
  totalPrizePool?: number;
  firstPrize?: string;
  secondPrize?: string;
  thirdPrize?: string;
  specialPrize?: string;
  prizeNotes?: string;
  certificateAvailable: boolean;
  participationCertificate: boolean;
  winnerCertificate: boolean;
  certificateType: 'Digital' | 'Physical' | 'Both';
  certificateEligibility?: string;
  deliveryMethod?: string;
  primaryCoordinator: {
    name: string;
    role: string;
    phone: string;
    email: string;
  };
  secondaryCoordinator?: {
    name: string;
    role: string;
    phone: string;
    email: string;
  };
  helpdeskContact?: string;
  facilities: {
    food: boolean;
    foodDetails?: string;
    accommodation: boolean;
    accommodationDetails?: string;
    transport: boolean;
    transportDetails?: string;
    parking: boolean;
    parkingDetails?: string;
  };
  importantNotes?: string;
  reportingInstructions?: string;
  idRequirement?: string;
  paymentConfig?: {
    payeeName?: string;
    upiId?: string;
    paymentQr?: string;
    paymentInstructions?: string;
    refundPolicy?: string;
  };
  customDetails: IEventCustomField[];
  registrationQuestions: IParticipantQuestion[];
  creatorRole: 'Student' | 'College';
  creatorUserId: string;
  targetCollegeId?: string;
  status: 'Draft' | 'Pending Approval' | 'Changes Requested' | 'Approved' | 'Published' | 'Rejected' | 'Completed' | 'Cancelled';
  rejectionReason?: string;
  viewsCount: number;
  attendanceCount: number;
  certificatesIssuedCount: number;
  attendanceFinalized?: boolean;
  attendanceFinalizedAt?: string;
  attendanceFinalizedBy?: string;
  certificateTemplateUrl?: string;
  certificateTemplateName?: string;
  certificateTemplate?: {
    fileUrl: string;
    fileName: string;
    version?: number;
    status?: 'Draft' | 'Active' | 'Archived';
    uploadedAt: string;
    uploadedBy: string;
    detectedPlaceholders: string[];
    mappings: Record<string, {
      sourceType: 'student_field' | 'event_field' | 'registration_question' | 'fixed_text' | 'auto';
      sourceField?: string;
      fixedValue?: string;
    }>;
    isActivated: boolean;
    history?: Array<{
      version: number;
      fileUrl: string;
      fileName: string;
      uploadedAt: string;
      uploadedBy: string;
      detectedPlaceholders: string[];
      mappings: any;
      status?: 'Draft' | 'Active' | 'Archived';
    }>;
  };
  createdAt: string;
}

export interface IEventRegistration {
  _id: string;
  id?: string;
  registrationId: string;
  eventId: string;
  studentId: string;
  studentUserId: string;
  collegeId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  studentCollege: string;
  studentDepartment: string;
  studentYear: string;
  registrationType: 'Individual' | 'Team';
  teamName?: string;
  teamMembers?: string[];
  customResponses: Record<string, any>;
  isFree: boolean;
  amount: number;
  paymentStatus: 'Pending' | 'Completed' | 'Failed' | 'Waived';
  paymentId?: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  attended: boolean;
  attendedAt?: string;
  attendanceMethod?: 'QR_SCAN' | 'MANUAL';
  certificateIssued: boolean;
  certificateId?: string;
  certificateStatus?: 'Not Eligible' | 'Pending' | 'Generated' | 'Sent' | 'Failed';
  certificateEmailSent?: boolean;
  certificateProfilePublished?: boolean;
  certificateFileUrl?: string;
  qrToken: string;
  qrCodeUrl?: string;
  createdAt: string;
  event?: IEvent;
  eventTitle?: string;
  eventDate?: string;
}

export interface IReminder {
  _id: string;
  id?: string;
  studentId: string;
  studentUserId?: string;
  eventId: string;
  registrationId?: string;
  reminderType: '1_day_before' | '3_hours_before' | '1_hour_before' | '30_mins_before' | 'custom';
  reminderDate?: string;
  reminderTime: string;
  status: 'Pending' | 'Triggered' | 'Cancelled';
  notified: boolean;
  createdAt: string;
  event?: IEvent;
}

export interface ICertificate {
  _id: string;
  id?: string;
  certificateId: string;
  title: string;
  eventId?: string;
  registrationId?: string;
  studentId: string;
  studentUserId?: string;
  collegeId?: string;
  issuingOrganization: string;
  collegeLogo?: string;
  isCollegeVerified?: boolean;
  achievementType: 'Winner' | 'Runner-up' | 'Participation' | 'Excellence' | 'Appreciation' | 'Completion';
  issueDate: string;
  location?: string;
  eventName?: string;
  description?: string;
  fileUrl: string;
  docxFileUrl?: string;
  coverUrl?: string;
  fileType?: string;
  originalFileName?: string;
  isSelfUploaded?: boolean;
  credentialUrl?: string;
  visibility: 'Public' | 'Connections Only' | 'Private';
  tags: string[];
  isDraft: boolean;
  emailStatus?: 'Pending' | 'Sent' | 'Failed';
  emailError?: string;
  profilePublished?: boolean;
  revoked?: boolean;
  revokedAt?: string;
  revokedReason?: string;
  createdAt: string;
}

export interface ICredentialPost {
  _id: string;
  id?: string;
  studentId: string;
  studentUserId: string;
  studentName: string;
  studentUsername: string;
  studentAvatar?: string;
  certificateId: string;
  certificateTitle: string;
  eventTitle: string;
  issuingOrganization: string;
  collegeLogo?: string;
  achievementType: string;
  issueDate: string;
  fileUrl: string;
  credentialUrl: string;
  caption?: string;
  likesCount: number;
  likedBy: string[];
  createdAt: string;
}

export interface IPlacementPost {
  _id: string;
  id?: string;
  collegeId: string;
  collegeName: string;
  collegeLogo: string;
  title: string;
  company: string;
  packageLPA?: string;
  placementStatistics?: string;
  message: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  date: string;
  likesCount: number;
  createdAt: string;
}

export interface IInfrastructurePost {
  _id: string;
  id?: string;
  collegeId: string;
  collegeName: string;
  facilityTitle: string;
  facilityType: 'Library' | 'Laboratory' | 'Hostel' | 'Sports' | 'Campus' | 'Classroom' | 'Other';
  description: string;
  googleMapsLink?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: string;
}

export interface INotification {
  _id: string;
  id?: string;
  recipientUserId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  eventId?: string;
  read: boolean;
  metadata?: any;
  createdAt: string;
}

export interface ICollegeAdmin {
  _id: string;
  id?: string;
  collegeId: string;
  userId: string;
  role: string;
  name: string;
  email: string;
  permissions: string[];
  addedBy: string;
  createdAt: string;
}

export interface IConversationParticipant {
  userId: string;
  role: string;
  name: string;
  username?: string;
  avatar?: string;
  collegeId?: string;
}

export interface IConversation {
  _id: string;
  id?: string;
  participants: string[];
  participantDetails: IConversationParticipant[];
  otherParticipant?: IConversationParticipant;
  unreadCount?: number;
  isMuted?: boolean;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IMessage {
  _id: string;
  id?: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'file';
  sharedEventId?: string;
  sharedStudentId?: string;
  sharedCollegeId?: string;
  sharedEvent?: {
    _id: string;
    title: string;
    poster?: string;
    hostCollegeName: string;
    eventDate: string;
    isFree: boolean;
    registrationFee?: number;
    category: string;
  } | null;
  sharedStudent?: {
    _id: string;
    userId: string;
    fullName: string;
    username?: string;
    profilePhoto?: string;
    collegeName: string;
  } | null;
  sharedCollege?: {
    _id: string;
    name: string;
    username?: string;
    logo?: string;
    location?: string;
    verificationStatus?: string;
  } | null;
  readBy: string[];
  seenAt?: string;
  deletedFor?: string[];
  deletedForEveryone?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IGlobalSearchStudent {
  _id: string;
  userId: string;
  fullName: string;
  username?: string;
  collegeName: string;
  department: string;
  profilePhoto?: string;
  profileVisibility?: string;
}

export interface IGlobalSearchCollege {
  _id: string;
  name: string;
  username?: string;
  location?: string;
  logo?: string;
  verificationStatus?: string;
  isVerified?: boolean;
}

export interface IGlobalSearchEvent {
  _id: string;
  title: string;
  poster?: string;
  hostCollegeId: string;
  hostCollegeName: string;
  category: string;
  eventDate: string;
  eventMode: string;
  isFree: boolean;
  registrationFee?: number;
}


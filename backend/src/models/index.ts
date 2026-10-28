import { CollectionModel } from '../config/db';

export interface IUser {
  _id: string;
  id?: string;
  email: string;
  passwordHash: string;
  role: 'Student' | 'College Super Admin' | 'College Admin' | 'Organizer';
  fullName: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  collegeId?: string; // If College Admin/Super Admin
  adminPinHash?: string; // Hashed 4-digit Admin Access PIN (never plain)
  themePreference?: string; // Stored theme preference ('classic-blue', 'neutral-slate', 'system')
  status?: 'Active' | 'Suspended' | 'Pending' | string;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOrganizerProfile {
  _id: string;
  id?: string;
  userId: string;
  organizationName: string;
  organizationType: 'Company' | 'Non-Profit' | 'Student Chapter' | 'Independent Team' | 'Community' | string;
  website?: string;
  officialEmail: string;
  phoneNumber: string;
  location?: string;
  bio?: string;
  logo?: string;
  coverPhoto?: string;
  verified: boolean;
  eventsOrganizedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IStudentProfile {
  _id: string;
  id?: string;
  userId: string;
  fullName: string;
  username: string; // Globally unique identifier e.g. @sureshm2006
  email: string;
  collegeName: string;
  targetCollegeId?: string;
  phoneNumber: string;
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
  groupPrivacy?: string;
  resumeUrl?: string;
  resumeFileUrl?: string;
  resumeFileType?: string; // 'pdf' | 'doc' | 'docx' | 'image'
  resumeOriginalName?: string;
  resumeUploadedAt?: string;
  resumeCoverUrl?: string;
  followersCount: number;
  followingCount: number;
  connectionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ICollege {
  _id: string;
  id?: string;
  name: string;
  username?: string; // e.g. @apextech
  officialEmail: string;
  officialDomain: string;
  domain?: string;
  status?: string;
  contactNumber: string;
  location: string;
  address?: string;
  city?: string;
  state?: string;
  bio: string;
  website?: string;
  logo: string;
  coverPhoto: string;
  verificationStatus: 'Pending' | 'Verified' | 'Rejected' | 'Changes Requested';
  rejectionReason?: string;
  approvedEmailDomains?: string[]; // Pre-approved alternate email domains (e.g. ['college.ac.in'])
  domainVerificationToken?: string; // DNS TXT token (eventhub-verification=<token>)
  isDomainVerified?: boolean; // Domain ownership verified via DNS TXT or web token
  domainVerifiedAt?: string;
  domainVerificationMethod?: 'DNS_TXT' | 'WEB_FILE' | 'MANUAL';
  superAdminId: string;
  superAdminEmail?: string;
  messagePrivacy?: 'Everyone' | 'Connected' | 'Nobody';
  connectionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ICollegeAdminRequest {
  _id: string;
  id?: string;
  collegeId: string;
  collegeName: string;
  collegeDomain: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  message?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
}

export interface ICollegeAdminMembership {
  _id: string;
  id?: string;
  collegeId: string;
  userId: string;
  role: 'College Super Admin' | 'College Admin';
  name: string;
  email: string;
  username?: string;
  permissions: string[];
  status?: 'Active' | 'Invited' | 'Rejected' | 'Disabled';
  invitedBy?: string;
  invitedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  addedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IAdminActivityLog {
  _id: string;
  id?: string;
  collegeId: string;
  adminUserId: string;
  adminName: string;
  adminUsername?: string;
  actionType: string;
  details: string;
  targetType?: string;
  targetId?: string;
  targetTitle?: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface IEventCustomField {
  id: string;
  label: string;
  type: 'Short Text' | 'Long Text' | 'Number' | 'Link' | 'Image' | 'File' | 'Date' | 'Time' | 'Yes/No' | 'Single Select' | 'Multi Select';
  value: string;
  description?: string;
}

export interface IParticipantQuestion {
  id: string;
  label: string;
  type: 'Short Answer' | 'Long Answer' | 'Number' | 'Email' | 'Phone' | 'Link' | 'Dropdown' | 'Multiple Choice' | 'Checkbox' | 'Date' | 'File Upload' | 'Image Upload';
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
  eventType: string; // e.g. Technical, Cultural, Workshop, Hackathon, Seminar, Sports
  tagline?: string;
  description: string;
  
  // Schedule
  eventDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  registrationDeadline: string; // YYYY-MM-DDTHH:mm
  reportingTime?: string;
  registrationOpensOn?: string;
  
  // Mode & Location
  eventMode: 'Offline' | 'Online' | 'Hybrid';
  venue?: string;
  hallRoom?: string;
  buildingBlock?: string;
  address?: string;
  googleMapsLink?: string;
  transportParkingNotes?: string;
  meetingPlatform?: string;
  meetingLink?: string;
  
  // Registration
  registrationType: 'Individual' | 'Team';
  minTeamSize?: number;
  maxTeamSize?: number;
  isFree: boolean;
  registrationFee: number;
  capacity: number;
  registeredCount: number;
  
  // Eligibility
  educationLevel: string[];
  departments: string[];
  eligibleYears: string[];
  genderRestriction?: string;
  institutionRestriction?: string;
  additionalEligibilityNotes?: string;
  
  // Format
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
  
  // Prizes
  prizeAvailable: boolean;
  totalPrizePool?: number;
  firstPrize?: string;
  secondPrize?: string;
  thirdPrize?: string;
  specialPrize?: string;
  prizeNotes?: string;
  
  // Certificates
  certificateAvailable: boolean;
  participationCertificate: boolean;
  winnerCertificate: boolean;
  certificateType: 'Digital' | 'Physical' | 'Both';
  certificateEligibility?: string;
  deliveryMethod?: string;
  
  // Coordinators
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
  
  // Support & Facilities
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
  
  // Payment config
  paymentConfig?: {
    payeeName?: string;
    upiId?: string;
    paymentQr?: string;
    paymentInstructions?: string;
    refundPolicy?: string;
  };
  
  // Custom information & Questions
  customDetails: IEventCustomField[];
  registrationQuestions: IParticipantQuestion[];
  
  // Creation & Approval status
  creatorRole: 'Student' | 'College' | 'Organizer';
  creatorUserId: string;
  organizerOrganization?: string;
  targetCollegeId?: string;
  status: 'Draft' | 'Pending Approval' | 'Published' | 'Rejected' | 'Completed' | 'Cancelled' | 'Changes Requested' | 'Closed' | string;
  rejectionReason?: string;
  changesRequestedComment?: string;
  viewsCount: number;
  attendanceCount: number;
  certificatesIssuedCount: number;
  
  // Attendance Finalization & Certificate Template
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
  updatedAt: string;
}

export interface IEventRegistration {
  _id: string;
  id?: string;
  registrationId: string; // e.g. EH-2026-XXXXX
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
  updatedAt: string;
}

export interface IPayment {
  _id: string;
  id?: string;
  orderId: string;
  paymentId: string;
  registrationId: string;
  eventId: string;
  studentId: string;
  amount: number;
  currency: string;
  gatewayStatus: 'Created' | 'Authorized' | 'Captured' | 'Failed';
  verificationStatus: 'Pending' | 'Verified' | 'Failed';
  paymentMethod: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IRegistrationQR {
  _id: string;
  id?: string;
  registrationId: string;
  eventId: string;
  studentId: string;
  secureToken: string;
  qrPayload: string; // JSON with non-sensitive identifiers
  qrCodeDataUrl: string;
  isUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IAttendance {
  _id: string;
  id?: string;
  eventId: string;
  registrationId: string;
  studentId: string;
  studentUserId?: string;
  studentName: string;
  studentCollege: string;
  method: 'QR_SCAN' | 'MANUAL';
  markedByUserId: string;
  status: 'Present' | 'Absent';
  isFinalized?: boolean;
  markedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICertificate {
  _id: string;
  id?: string;
  certificateId: string; // Unique Credential ID
  title: string;
  eventTitle?: string;
  eventId?: string;
  registrationId?: string;
  studentId: string;
  studentUserId?: string;
  studentName?: string;
  collegeId?: string;
  issuingOrganization: string;
  collegeLogo?: string;
  isCollegeVerified?: boolean;
  isVerifiedCollegeCertificate?: boolean;
  achievementType: 'Winner' | 'Runner-up' | 'Participation' | 'Excellence' | 'Appreciation' | 'Completion';
  status?: string;
  issueDate: string;
  location?: string;
  eventName?: string;
  description?: string;
  fileUrl: string; // Cloudinary or local PDF/Image URL
  pdfUrl?: string;
  docxFileUrl?: string; // DOCX personalized certificate URL
  coverUrl?: string; // Cover image URL for PDF/DOC/DOCX certificates
  fileType?: string; // 'pdf' | 'doc' | 'docx' | 'image'
  originalFileName?: string;
  isSelfUploaded?: boolean;
  cloudinaryPublicId?: string;
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
  updatedAt: string;
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
  visibility?: 'Public' | 'Connections' | 'Private';
  likesCount: number;
  likedBy: string[];
  createdAt: string;
  updatedAt: string;
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
  updatedAt: string;
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
  updatedAt: string;
}

export interface IConnection {
  _id: string;
  id?: string;
  studentId: string;
  collegeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface IFollow {
  _id: string;
  id?: string;
  followerStudentId: string;
  followingStudentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface INotification {
  _id: string;
  id?: string;
  recipientUserId: string;
  userId?: string;
  recipientRole?: 'Student' | 'College Super Admin' | 'College Admin';
  collegeId?: string;
  category?: string;
  type: 'REGISTRATION' | 'PAYMENT' | 'REMINDER' | 'EVENT_APPROVAL' | 'EVENT_REJECTION' | 'EVENT_UPDATE' | 'CERTIFICATE' | 'ATTENDANCE' | 'ADMIN_ACTION' | 'ADMIN_INVITE' | string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  isRead?: boolean;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
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
  updatedAt: string;
}

export interface IOtpVerification {
  _id: string;
  id?: string;
  email: string;
  otpHash: string;
  purpose: 'STUDENT_REGISTRATION' | 'COLLEGE_REGISTRATION' | 'RESET_ADMIN_PIN' | 'PASSWORD_RESET' | 'MFA_LOGIN' | 'MFA_SETUP' | string;
  payload?: any;
  expiresAt: string;
  resendAvailableAt: string;
  attempts: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IConversationParticipant {
  userId: string;
  role: 'Student' | 'College Super Admin' | 'College Admin' | 'Organizer';
  name: string;
  username?: string;
  avatar?: string;
  collegeId?: string;
}

export interface IConversation {
  _id: string;
  id?: string;
  collegeId?: string; // If this conversation is in a College Workspace Inbox
  participants: string[]; // user IDs
  participantIds?: string[];
  participantDetails: IConversationParticipant[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: string;
  };
  lastMessageText?: string;
  lastMessageAt?: string;
  context?: any;
  createdAt: string;
  updatedAt: string;
}

export interface IMessage {
  _id: string;
  id?: string;
  conversationId: string;
  groupId?: string;
  isAnnouncement?: boolean;
  isPinned?: boolean;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  collegeId?: string;
  sentByAdminId?: string;
  text: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'file';
  sharedEventId?: string;
  sharedStudentId?: string;
  sharedCollegeId?: string;
  readBy: string[]; // user IDs
  seenAt?: string;
  deletedFor: string[]; // user IDs
  deletedForUserIds?: string[]; // user IDs
  deletedForEveryone?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IConversationPreference {
  _id: string;
  id?: string;
  userId: string;
  conversationId: string;
  muted: boolean;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IGroup {
  _id: string;
  id?: string;
  name: string;
  description: string;
  category?: string;
  type?: 'Custom' | 'Event' | string;
  imageUrl?: string;
  coverUrl?: string;
  collegeId?: string;
  eventId?: string;
  hostCollegeId?: string;
  visibility?: 'Public' | 'Private' | 'Invite Only' | 'Event Participants Only' | string;
  groupPrivacy?: 'Everyone' | 'Connections only' | 'Same College only' | 'Nobody' | 'Private' | string;
  approvalRequired?: boolean;
  verifiedOnly?: boolean;
  maxMembers?: number;
  permissions?: any;
  rules?: string[];
  moderation?: any;
  notifications?: any;
  ownerId: string;
  membersCount: number;
  chatPermissions?: 'Everyone' | 'Admins Only' | string;
  editPermissions?: 'All Members' | 'Admins Only' | string;
  lifecycleStatus?: 'Active' | 'Completed' | 'Cancelled' | 'Archived' | string;
  isReadOnly?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IGroupMembership {
  _id: string;
  id?: string;
  groupId: string;
  userId: string;
  role: 'Owner' | 'Admin' | 'Moderator' | 'Member';
  status: 'Active' | 'Banned' | 'Muted' | 'Left' | 'Removed';
  mutedUntil?: string;
  invitedBy?: string;
  addedBy?: string;
  joinedAt: string;
  clearedAt?: string;
  notificationsMuted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IGroupJoinRequest {
  _id: string;
  id?: string;
  groupId: string;
  userId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Instantiate Models connected to our persistent database collections
export const User = new CollectionModel<IUser>('users');
export const StudentProfile = new CollectionModel<IStudentProfile>('studentProfiles');
export const College = new CollectionModel<ICollege>('colleges');
export const CollegeAdminMembership = new CollectionModel<ICollegeAdminMembership>('collegeAdminMemberships');
export const Event = new CollectionModel<IEvent>('events');
export const EventRegistration = new CollectionModel<IEventRegistration>('eventRegistrations');
export const Payment = new CollectionModel<IPayment>('payments');
export const RegistrationQR = new CollectionModel<IRegistrationQR>('registrationQRs');
export const Attendance = new CollectionModel<IAttendance>('attendances');
export const Certificate = new CollectionModel<ICertificate>('certificates');
export const PlacementPost = new CollectionModel<IPlacementPost>('placementPosts');
export const InfrastructurePost = new CollectionModel<IInfrastructurePost>('infrastructurePosts');
export const Connection = new CollectionModel<IConnection>('connections');
export const Follow = new CollectionModel<IFollow>('follows');
export const Notification = new CollectionModel<INotification>('notifications');
export const Reminder = new CollectionModel<IReminder>('reminders');
export const OtpVerification = new CollectionModel<IOtpVerification>('otpVerifications');
export const Conversation = new CollectionModel<IConversation>('conversations');
export const Message = new CollectionModel<IMessage>('messages');
export const ConversationPreference = new CollectionModel<IConversationPreference>('conversationPreferences');
export const AdminActivityLog = new CollectionModel<IAdminActivityLog>('adminActivityLogs');
export const CredentialPost = new CollectionModel<ICredentialPost>('credentialPosts');
export const Group = new CollectionModel<IGroup>('groups');
export const GroupMembership = new CollectionModel<IGroupMembership>('groupMemberships');
export const GroupJoinRequest = new CollectionModel<IGroupJoinRequest>('groupJoinRequests');
export const CollegeAdminRequest = new CollectionModel<ICollegeAdminRequest>('collegeAdminRequests');
export const OrganizerProfile = new CollectionModel<IOrganizerProfile>('organizerProfiles');

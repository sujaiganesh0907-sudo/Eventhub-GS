export type ThemeMode =
  | 'light'
  | 'dark'
  | 'system'
  | 'classic-blue'
  | 'midnight'
  | 'ocean'
  | 'emerald'
  | 'violet'
  | 'neutral';

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
  followersCount: number;
  followingCount: number;
  connectionsCount: number;
  certificatesCount?: number;
  eventsCount?: number;
  registeredCount?: number;
  organizedCount?: number;
}

export interface ICollege {
  _id: string;
  id?: string;
  name: string;
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
  certificateIssued: boolean;
  certificateId?: string;
  qrToken: string;
  qrCodeUrl?: string;
  createdAt: string;
  event?: IEvent;
  eventTitle?: string;
  eventDate?: string;
}

export interface ICertificate {
  _id: string;
  id?: string;
  certificateId: string;
  title: string;
  eventId?: string;
  registrationId?: string;
  studentId: string;
  collegeId?: string;
  issuingOrganization: string;
  achievementType: 'Winner' | 'Runner-up' | 'Participation' | 'Excellence' | 'Appreciation' | 'Completion';
  issueDate: string;
  location?: string;
  eventName?: string;
  description?: string;
  fileUrl: string;
  credentialUrl?: string;
  visibility: 'Public' | 'Connections Only' | 'Private';
  tags: string[];
  isDraft: boolean;
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

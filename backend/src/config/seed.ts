import bcrypt from 'bcryptjs';
import {
  User,
  StudentProfile,
  College,
  Event,
  PlacementPost,
  InfrastructurePost,
  Certificate,
  Connection,
  Follow,
  Notification
} from '../models/index';
import { syncPersistDBNow, dbState } from './db';

/**
 * Migration helper to ensure all existing records have unique usernames, privacy defaults, and initialized collections
 */
async function ensureUsernamesAndCollections() {
  if (!dbState.conversations) dbState.conversations = [];
  if (!dbState.messages) dbState.messages = [];
  if (!dbState.conversationPreferences) dbState.conversationPreferences = [];

  // 1. Ensure student usernames & privacy
  const students = await StudentProfile.find().exec();
  const takenUsernames = new Set<string>();

  for (const s of students) {
    let username = s.username ? s.username.toLowerCase().replace(/^@/, '') : '';
    if (username && !takenUsernames.has(username)) {
      takenUsernames.add(username);
    }
  }

  for (const s of students) {
    let changed = false;
    let username = s.username ? s.username.toLowerCase().replace(/^@/, '') : '';

    if (!username || takenUsernames.has(username) && s.username !== username) {
      // Auto-generate safe clean unique username
      let base = (s.fullName || s.email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 15);
      if (!base || base.length < 3) base = 'student';

      let candidate = base;
      let counter = 1;
      while (takenUsernames.has(candidate)) {
        candidate = `${base}${counter++}`;
      }

      username = candidate;
      takenUsernames.add(username);
      changed = true;
    }

    const profileVisibility = s.profileVisibility || 'Public';
    const messagePrivacy = s.messagePrivacy || 'Everyone';

    if (changed || !s.profileVisibility || !s.messagePrivacy || s.username !== username) {
      await StudentProfile.findByIdAndUpdate(s._id, {
        username,
        profileVisibility,
        messagePrivacy,
      });
    }
  }

  // 2. Ensure college usernames, privacy & exact connection counts from real Connection records
  const colleges = await College.find().exec();
  const collegeUsernameMap: Record<string, string> = {
    col_apex_tech_01: 'apextech',
    col_horizon_univ_02: 'horizonuniv',
    col_nexus_eng_03: 'nexuseng',
  };

  for (const col of colleges) {
    let colUser = col.username ? col.username.toLowerCase().replace(/^@/, '') : '';
    if (!colUser) {
      colUser = collegeUsernameMap[col._id] || col.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    }
    const messagePrivacy = col.messagePrivacy || 'Everyone';
    const realConns = await Connection.countDocuments({ collegeId: col._id });

    if (col.username !== colUser || !col.messagePrivacy || col.connectionsCount !== realConns) {
      await College.findByIdAndUpdate(col._id, {
        username: colUser,
        messagePrivacy,
        connectionsCount: realConns,
      });
    }
  }

  syncPersistDBNow();
}

export async function seedDatabaseIfEmpty() {
  // Always ensure existing data has usernames, privacy settings, and collections initialized
  await ensureUsernamesAndCollections();

  const userCount = await User.countDocuments();
  if (userCount > 0) {
    return;
  }

  console.log('Seeding initial EVENTHUB database...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Seed Colleges
  const apexCollege = await College.create({
    _id: 'col_apex_tech_01',
    name: 'Apex Institute of Technology',
    officialEmail: 'admin@apextech.edu',
    officialDomain: 'apextech.edu',
    contactNumber: '+1 (555) 234-5678',
    location: 'Silicon Metro, Tech Corridor',
    bio: 'Premier institution dedicated to excellence in computing, engineering research, and entrepreneurial student ventures. Accredited Tier-1 institute.',
    website: 'https://apextech.edu',
    logo: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=300&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80',
    verificationStatus: 'Verified',
    superAdminId: 'usr_col_apex_admin',
    connectionsCount: 142,
  });

  const horizonCollege = await College.create({
    _id: 'col_horizon_univ_02',
    name: 'Horizon State University',
    officialEmail: 'registrar@horizonuniv.edu',
    officialDomain: 'horizonuniv.edu',
    contactNumber: '+1 (555) 876-5432',
    location: 'Grandview Heights, North Campus',
    bio: 'Fostering interdisciplinary innovation, cultural arts, and aerospace engineering. Home to 25,000 students across 12 faculties.',
    website: 'https://horizonuniv.edu',
    logo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=300&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&auto=format&fit=crop&q=80',
    verificationStatus: 'Verified',
    superAdminId: 'usr_col_horizon_admin',
    connectionsCount: 98,
  });

  const nexusCollege = await College.create({
    _id: 'col_nexus_eng_03',
    name: 'Nexus Engineering College',
    officialEmail: 'contact@nexuseng.edu',
    officialDomain: 'nexuseng.edu',
    contactNumber: '+1 (555) 345-9876',
    location: 'Metro Science Park',
    bio: 'Specializing in Robotics, Artificial Intelligence, and Smart Mobility Systems. Industry-connected modern campus.',
    website: 'https://nexuseng.edu',
    logo: 'https://images.unsplash.com/photo-1568792923760-d70635a89fa1?w=300&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?w=1200&auto=format&fit=crop&q=80',
    verificationStatus: 'Verified',
    superAdminId: 'usr_col_nexus_admin',
    connectionsCount: 64,
  });

  // 2. Seed Users
  // Apex Super Admin
  await User.create({
    _id: 'usr_col_apex_admin',
    email: 'admin@apextech.edu',
    passwordHash,
    role: 'College Super Admin',
    fullName: 'Dr. Eleanor Vance',
    isEmailVerified: true,
    collegeId: apexCollege._id,
  });

  // Apex Operational Admin
  await User.create({
    _id: 'usr_col_apex_staff',
    email: 'events@apextech.edu',
    passwordHash,
    role: 'College Admin',
    fullName: 'Marcus Sterling',
    isEmailVerified: true,
    collegeId: apexCollege._id,
  });

  // Horizon Super Admin
  await User.create({
    _id: 'usr_col_horizon_admin',
    email: 'registrar@horizonuniv.edu',
    passwordHash,
    role: 'College Super Admin',
    fullName: 'Prof. Arthur Pendelton',
    isEmailVerified: true,
    collegeId: horizonCollege._id,
  });

  // Student User
  const studentUser = await User.create({
    _id: 'usr_student_alex',
    email: 'alex.chen@student.edu',
    passwordHash,
    role: 'Student',
    fullName: 'Alexander Chen',
    isEmailVerified: true,
  });

  // Student Profile
  const studentProfile = await StudentProfile.create({
    _id: 'prof_student_alex',
    userId: studentUser._id,
    fullName: 'Alexander Chen',
    email: 'alex.chen@student.edu',
    collegeName: 'Apex Institute of Technology',
    targetCollegeId: apexCollege._id,
    phoneNumber: '+1 (555) 432-8890',
    department: 'Computer Science & Engineering',
    yearOfStudy: '3rd Year',
    bio: 'Full-stack builder & algorithm enthusiast. Lead organizer at Apex Coding Club. Passionate about distributed systems, UI design, and hackathons.',
    location: 'Silicon Metro',
    profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    coverPhoto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    skills: ['TypeScript', 'React', 'Node.js', 'System Design', 'Python', 'Docker'],
    achievements: [
      '1st Place - Apex Annual Code Sprint 2025',
      'Finalist - State Autonomous Robotics Challenge',
      'Published Technical Paper on Real-Time Graph Analysis'
    ],
    followersCount: 84,
    followingCount: 39,
    connectionsCount: 2,
  });

  // 3. Connect student to Apex & Horizon
  await Connection.create([
    { studentId: studentProfile._id, collegeId: apexCollege._id },
    { studentId: studentProfile._id, collegeId: horizonCollege._id },
  ]);

  // 4. Seed Events
  const hackathonEvent = await Event.create({
    _id: 'ev_hacktech_2026',
    title: 'HackTech 2026: Inter-College Hackathon',
    poster: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80',
    hostCollegeId: apexCollege._id,
    hostCollegeName: apexCollege.name,
    hostCollegeLogo: apexCollege.logo,
    isCollegeVerified: true,
    category: 'Hackathon',
    eventType: 'Technical',
    tagline: '36 Hours of Collaborative Engineering & Rapid Prototyping',
    description: 'HackTech 2026 is our flagship inter-college hackathon bringing together over 300 passionate student developers, designers, and innovators. Tackle real challenges in AI Systems, Clean Energy, Healthcare Tech, and Open Finance. Mentorship from top engineers, fully sponsored food and accommodation, and huge industry recognition.',
    eventDate: '2026-10-15',
    startTime: '09:00',
    endTime: '21:00',
    registrationDeadline: '2026-10-10T23:59',
    reportingTime: '08:30 AM',
    registrationOpensOn: '2026-09-01',
    eventMode: 'Hybrid',
    venue: 'Apex Innovation Center, Main Auditorium',
    hallRoom: 'Hall A & Project Labs',
    buildingBlock: 'Turing Block',
    address: '400 Innovation Way, Silicon Metro',
    googleMapsLink: 'https://maps.google.com/?q=Innovation+Way',
    transportParkingNotes: 'Visitor parking is accessible via Gate 3. Free shuttle from Metro Station every 15 mins.',
    meetingPlatform: 'Zoom / Discord',
    meetingLink: 'https://eventhub.apextech.edu/live-hacktech',
    registrationType: 'Team',
    minTeamSize: 2,
    maxTeamSize: 4,
    isFree: true,
    registrationFee: 0,
    capacity: 250,
    registeredCount: 88,
    educationLevel: ['UG', 'PG'],
    departments: ['Computer Science', 'Information Tech', 'Electronics', 'Data Science', 'Any Technical Branch'],
    eligibleYears: ['2nd Year', '3rd Year', '4th Year'],
    rulesAndGuidelines: '1. All code must be written during the hackathon.\n2. Pre-existing open source libraries are permitted.\n3. Every team must present a working demo in Round 2.\n4. Professional code of conduct is strictly enforced.',
    hasMultipleRounds: true,
    rounds: [
      {
        name: 'Round 1: Abstract & Architecture Review',
        description: 'Submission of project problem statement, proposed architecture, and tech stack.',
        duration: '2 Hours',
        qualificationCriteria: 'Top 40 teams qualify for final build',
        judgingCriteria: 'Originality, Feasibility, Technical Depth'
      },
      {
        name: 'Round 2: Live Prototype Demonstration & Pitch',
        description: '5-minute live demo before a jury panel of technical directors.',
        duration: '10 Mins per team',
        qualificationCriteria: 'Podium awards selection',
        judgingCriteria: 'Implementation, UX, Scalability, Presentation'
      }
    ],
    prizeAvailable: true,
    totalPrizePool: 5000,
    firstPrize: '$2,500 + Direct Incubation Interviews',
    secondPrize: '$1,500 + Cloud Credits',
    thirdPrize: '$1,000 + Hardware Kits',
    specialPrize: 'Best AI Architecture Award ($500)',
    certificateAvailable: true,
    participationCertificate: true,
    winnerCertificate: true,
    certificateType: 'Both',
    certificateEligibility: 'Teams completing Round 1 & Round 2 evaluations.',
    deliveryMethod: 'Digital download on EVENTHUB + Printed foil certificate at closing ceremony.',
    primaryCoordinator: {
      name: 'Sarah Jenkins',
      role: 'Student Tech Lead',
      phone: '+1 (555) 789-0123',
      email: 's.jenkins@apextech.edu'
    },
    secondaryCoordinator: {
      name: 'Dr. Ramesh Kumar',
      role: 'Faculty Advisor',
      phone: '+1 (555) 789-0124',
      email: 'r.kumar@apextech.edu'
    },
    facilities: {
      food: true,
      foodDetails: 'Complimentary breakfast, buffet lunch, dinner, midnight energy snacks & coffee.',
      accommodation: true,
      accommodationDetails: 'Separate resting dorms inside Campus Guest House with security.',
      transport: true,
      transportDetails: 'Continuous campus shuttles between station and hall.',
      parking: true,
      parkingDetails: 'Designated parking zone near South Gate.'
    },
    customDetails: [
      { id: 'cd_1', label: 'Discord Server', type: 'Link', value: 'https://discord.gg/hacktech2026', description: 'Official communication channel for participants' },
      { id: 'cd_2', label: 'Wi-Fi Access', type: 'Short Text', value: 'High-speed 1Gbps dedicated SSID: HackTech_5G', description: 'Credentials provided at check-in' }
    ],
    registrationQuestions: [
      { id: 'q_github', label: 'Team GitHub / Portfolio URL', type: 'Link', required: true, helperText: 'Provide a link to your repositories or projects' },
      { id: 'q_track', label: 'Preferred Hackathon Track', type: 'Dropdown', required: true, options: ['AI & Intelligent Systems', 'Web3 & Fintech', 'Healthcare Tech', 'Smart Campus & IoT'] },
      { id: 'q_dietary', label: 'Dietary Preferences', type: 'Dropdown', required: false, options: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Halal'] }
    ],
    creatorRole: 'College',
    creatorUserId: 'usr_col_apex_admin',
    status: 'Published',
    viewsCount: 1420,
    attendanceCount: 0,
    certificatesIssuedCount: 0,
  });

  const roboWarsEvent = await Event.create({
    _id: 'ev_robowars_2026',
    title: 'National RoboWars & Combat Drone Derby',
    poster: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&auto=format&fit=crop&q=80',
    hostCollegeId: horizonCollege._id,
    hostCollegeName: horizonCollege.name,
    hostCollegeLogo: horizonCollege.logo,
    isCollegeVerified: true,
    category: 'Robotics',
    eventType: 'Technical',
    tagline: 'High-Torque Combat Arenas & Autonomous Aerial Navigation',
    description: 'The premier national collegiate robotics showdown! Watch custom-engineered combat robots clash in a battle-hardened steel cage, alongside autonomous drone agility trials through obstacle tunnels.',
    eventDate: '2026-11-05',
    startTime: '10:00',
    endTime: '18:00',
    registrationDeadline: '2026-11-01T18:00',
    reportingTime: '09:00 AM',
    eventMode: 'Offline',
    venue: 'Horizon Indoor Arena',
    hallRoom: 'Combat Zone A',
    buildingBlock: 'Robotics Engineering Complex',
    address: '100 Horizon Drive, Grandview Heights',
    registrationType: 'Team',
    minTeamSize: 2,
    maxTeamSize: 5,
    isFree: false,
    registrationFee: 25,
    capacity: 60,
    registeredCount: 22,
    educationLevel: ['Diploma', 'UG', 'PG'],
    departments: ['Mechanical', 'Electrical', 'Mechatronics', 'Robotics', 'Aeronautical'],
    eligibleYears: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    rulesAndGuidelines: 'Bots must strictly adhere to weight categories (15kg and 30kg class). Weapon safety switches mandatory.',
    hasMultipleRounds: true,
    prizeAvailable: true,
    totalPrizePool: 3500,
    firstPrize: '$2,000 Trophy',
    secondPrize: '$1,000 Trophy',
    thirdPrize: '$500',
    certificateAvailable: true,
    participationCertificate: true,
    winnerCertificate: true,
    certificateType: 'Digital',
    primaryCoordinator: {
      name: 'David Reynolds',
      role: 'Arena Director',
      phone: '+1 (555) 654-3210',
      email: 'd.reynolds@horizonuniv.edu'
    },
    facilities: {
      food: true,
      foodDetails: 'Participant meal vouchers provided.',
      accommodation: false,
      transport: false,
      parking: true,
      parkingDetails: 'Campus West Lot'
    },
    paymentConfig: {
      payeeName: 'Horizon Collegiate Robotics Fund',
      upiId: 'horizon.robotics@bank',
      paymentInstructions: 'Standard gateway payment or UPI reference.',
      refundPolicy: 'Cancellations before deadline receive 80% refund.'
    },
    customDetails: [
      { id: 'cd_rw_1', label: 'Arena Spec Sheet', type: 'Link', value: 'https://horizonuniv.edu/robowars-specs.pdf', description: 'Download cage dimensions and safety hazards' }
    ],
    registrationQuestions: [
      { id: 'q_bot_name', label: 'Robot / Drone Model Name', type: 'Short Answer', required: true },
      { id: 'q_weight', label: 'Weight Category', type: 'Dropdown', required: true, options: ['15kg Featherweight', '30kg Middleweight', 'Autonomous Quadcopter'] }
    ],
    creatorRole: 'College',
    creatorUserId: 'usr_col_horizon_admin',
    status: 'Published',
    viewsCount: 890,
    attendanceCount: 0,
    certificatesIssuedCount: 0,
  });

  const designathonEvent = await Event.create({
    _id: 'ev_designverse_2026',
    title: 'DesignVerse: UI/UX & Design Systems Championship',
    poster: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=1200&auto=format&fit=crop&q=80',
    hostCollegeId: apexCollege._id,
    hostCollegeName: apexCollege.name,
    hostCollegeLogo: apexCollege.logo,
    isCollegeVerified: true,
    category: 'Design',
    eventType: 'Workshop',
    tagline: 'Design for the Next Billion Users in Figma & Protopie',
    description: 'A 24-hour virtual design sprint where product designers compete to craft responsive design systems, accessible interfaces, and interactive micro-interactions.',
    eventDate: '2026-10-28',
    startTime: '11:00',
    endTime: '19:00',
    registrationDeadline: '2026-10-25T23:59',
    eventMode: 'Online',
    meetingPlatform: 'Google Meet',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    registrationType: 'Individual',
    isFree: true,
    registrationFee: 0,
    capacity: 150,
    registeredCount: 45,
    educationLevel: ['School', 'Diploma', 'UG', 'PG'],
    departments: ['All Branches Welcome'],
    eligibleYears: ['All Years'],
    rulesAndGuidelines: 'Figma files must have clean autolayout, components, and design tokens.',
    hasMultipleRounds: false,
    prizeAvailable: true,
    totalPrizePool: 1200,
    firstPrize: '$800 + 1-Year Figma Enterprise & Protopie Licenses',
    secondPrize: '$400',
    certificateAvailable: true,
    participationCertificate: true,
    winnerCertificate: true,
    certificateType: 'Digital',
    primaryCoordinator: {
      name: 'Aisha Patel',
      role: 'Design Chapter Lead',
      phone: '+1 (555) 321-7654',
      email: 'aisha.design@apextech.edu'
    },
    facilities: {
      food: false,
      accommodation: false,
      transport: false,
      parking: false
    },
    customDetails: [],
    registrationQuestions: [
      { id: 'q_portfolio', label: 'Behance / Dribbble / Portfolio URL', type: 'Link', required: true }
    ],
    creatorRole: 'College',
    creatorUserId: 'usr_col_apex_admin',
    status: 'Published',
    viewsCount: 620,
    attendanceCount: 0,
    certificatesIssuedCount: 0,
  });

  // 5. Seed Placements
  await PlacementPost.create([
    {
      _id: 'post_pl_01',
      collegeId: apexCollege._id,
      collegeName: apexCollege.name,
      collegeLogo: apexCollege.logo,
      title: 'Google Cloud Campus Placement Drive 2026',
      company: 'Google',
      packageLPA: '48.5 LPA',
      placementStatistics: '14 Students Selected for Systems Engineering & Cloud Architecture',
      message: 'Proud to announce that 14 of our graduating seniors from Computer Science and Electronics have secured high-impact roles at Google Cloud. Hearty congratulations to the students and faculty mentors!',
      mediaUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80',
      mediaType: 'image',
      date: '2026-09-18',
      likesCount: 230,
    },
    {
      _id: 'post_pl_02',
      collegeId: horizonCollege._id,
      collegeName: horizonCollege.name,
      collegeLogo: horizonCollege.logo,
      title: 'Microsoft R&D Software Engineering Offers',
      company: 'Microsoft',
      packageLPA: '45.0 LPA',
      placementStatistics: '22 Offers Made in Core Systems & Security',
      message: 'Exceptional milestone! Microsoft Campus recruitment culminated today with 22 stellar offers. We celebrate our students relentless preparation and competitive excellence.',
      mediaUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1000&auto=format&fit=crop&q=80',
      mediaType: 'image',
      date: '2026-09-12',
      likesCount: 185,
    },
  ]);

  // 6. Seed Infrastructure Posts
  await InfrastructurePost.create([
    {
      _id: 'post_inf_01',
      collegeId: apexCollege._id,
      collegeName: apexCollege.name,
      facilityTitle: 'Advanced Robotics & Supercomputing Cluster Lab',
      facilityType: 'Laboratory',
      description: 'Equipped with 32 NVIDIA H100 GPU compute nodes, industrial robotic arms, motion tracking optical rigs, and high-frequency testing benches for interdisciplinary student projects.',
      googleMapsLink: 'https://maps.google.com/?q=Apex+Robotics+Lab',
      mediaUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80',
      mediaType: 'image',
    },
    {
      _id: 'post_inf_02',
      collegeId: apexCollege._id,
      collegeName: apexCollege.name,
      facilityTitle: 'Dr. Vikram Sarabhai Digital Central Library',
      facilityType: 'Library',
      description: '24/7 research library spanning 3 floors, featuring quiet cubicles, access to IEEE and ACM digital libraries, 80,000 physical volumes, and collaborative ideation pods.',
      googleMapsLink: 'https://maps.google.com/?q=Apex+Central+Library',
      mediaUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000&auto=format&fit=crop&q=80',
      mediaType: 'image',
    },
    {
      _id: 'post_inf_03',
      collegeId: horizonCollege._id,
      collegeName: horizonCollege.name,
      facilityTitle: 'Olympic Standard Indoor Sports Arena',
      facilityType: 'Sports',
      description: 'Air-conditioned multi-sport pavilion featuring 4 badminton courts, Olympic basketball arena, automated squash enclosures, and conditioning gym for collegiate athletics.',
      mediaUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1000&auto=format&fit=crop&q=80',
      mediaType: 'image',
    }
  ]);

  // 7. Seed sample certificate for Alex
  await Certificate.create({
    _id: 'cert_alex_01',
    certificateId: 'EH-CERT-2025-APEX-892',
    title: '1st Prize - Apex CodeSprint Hackathon',
    studentId: studentProfile._id,
    issuingOrganization: 'Apex Institute of Technology',
    achievementType: 'Winner',
    issueDate: '2025-11-20',
    location: 'Silicon Metro',
    eventName: 'Apex Annual CodeSprint',
    description: 'Awarded for developing an autonomous peer-to-peer resource sharing system during the 24-hour sprint.',
    fileUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=800&auto=format&fit=crop&q=80',
    credentialUrl: 'https://eventhub.apextech.edu/verify/EH-CERT-2025-APEX-892',
    visibility: 'Public',
    tags: ['Hackathon', 'Algorithms', 'Winner', 'TypeScript'],
    isDraft: false,
  });

  syncPersistDBNow();
  console.log('Database seeded successfully with colleges, events, student profile, and posts.');
}

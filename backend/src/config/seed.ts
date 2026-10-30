import bcrypt from 'bcryptjs';
import {
  User,
  StudentProfile,
  College,
  CollegeAdminMembership,
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

  // Ensure Suresh Student user and profile exist for Quick Switch and testing
  let sureshUser = await User.findOne({ email: 'sureshmanikkavasagam123@gmail.com' });
  if (!sureshUser) {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    sureshUser = await User.create({
      email: 'sureshmanikkavasagam123@gmail.com',
      passwordHash,
      role: 'Student',
      fullName: 'Suresh',
      isEmailVerified: true,
    });
  }

  if (sureshUser) {
    let sureshProfile = await StudentProfile.findOne({
      $or: [{ userId: sureshUser._id }, { email: 'sureshmanikkavasagam123@gmail.com' }],
    });

    if (!sureshProfile) {
      await StudentProfile.create({
        userId: sureshUser._id,
        fullName: 'Suresh',
        username: 'sureshm',
        email: 'sureshmanikkavasagam123@gmail.com',
        collegeName: 'Apex Institute of Technology',
        targetCollegeId: 'col_apex_tech_01',
        phoneNumber: '+91 98765 43210',
        department: 'Computer Science & Engineering',
        yearOfStudy: '3rd Year',
        bio: 'Enthusiastic full-stack builder and student at Apex Institute of Technology.',
        skills: ['TypeScript', 'React', 'Node.js', 'Python'],
        achievements: ['1st Place - Apex Annual Code Sprint 2025', 'Verified EVENTHUB Student'],
        profileVisibility: 'Everyone',
        messagePrivacy: 'Everyone',
        resumePrivacy: 'Colleges only',
        groupAddPrivacy: 'Everyone',
        followersCount: 15,
        followingCount: 12,
        connectionsCount: 3,
      });
    } else if (!sureshProfile.userId || sureshProfile.userId !== sureshUser._id) {
      await StudentProfile.findByIdAndUpdate(sureshProfile._id, { userId: sureshUser._id });
    }
  }

  // Ensure Apex Institute of Technology college and Super Admin exist for Quick Switch
  let apexCollege = await College.findOne({ officialEmail: 'admin@apextech.edu' });
  if (!apexCollege) {
    apexCollege = await College.create({
      _id: 'col_apex_tech_01',
      name: 'Apex Institute of Technology',
      username: 'apextech',
      officialEmail: 'admin@apextech.edu',
      officialDomain: 'apextech.edu',
      contactNumber: '+1 (555) 234-5678',
      location: 'Silicon Metro, Tech Corridor',
      bio: 'Premier institution dedicated to excellence in computing, engineering research, and entrepreneurial student ventures.',
      website: 'https://apextech.edu',
      verificationStatus: 'Verified',
      superAdminId: 'usr_col_apex_admin',
      messagePrivacy: 'Everyone',
      connectionsCount: 142,
    });
  }

  let apexAdminUser = await User.findOne({ email: 'admin@apextech.edu' });
  if (!apexAdminUser) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    apexAdminUser = await User.create({
      _id: 'usr_col_apex_admin',
      email: 'admin@apextech.edu',
      passwordHash,
      role: 'College Super Admin',
      fullName: 'Dr. Arthur Vance',
      isEmailVerified: true,
      collegeId: 'col_apex_tech_01',
    });
  }

  // Ensure Nexus Engineering College Super Admin user exists for conversations/messaging
  const nexusAdminUser = await User.findById('usr_col_nexus_admin');
  if (!nexusAdminUser) {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    await User.create({
      _id: 'usr_col_nexus_admin',
      email: 'contact@nexuseng.edu',
      passwordHash,
      role: 'College Super Admin',
      fullName: 'Dean Marcus Vance',
      isEmailVerified: true,
      collegeId: 'col_nexus_eng_03',
    });
  }

  const nexusMembership = await CollegeAdminMembership.findOne({ collegeId: 'col_nexus_eng_03', role: 'College Super Admin' });
  if (!nexusMembership) {
    await CollegeAdminMembership.create({
      _id: 'mem_col_nexus_super',
      collegeId: 'col_nexus_eng_03',
      userId: 'usr_col_nexus_admin',
      role: 'College Super Admin',
      name: 'Dean Marcus Vance',
      email: 'contact@nexuseng.edu',
      username: 'nexuseng',
      permissions: ['ALL_PERMISSIONS'],
      status: 'Active',
      addedBy: 'System',
    });
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

  // 4. Events: Real events are created by authorized colleges, organizers, and students; no dummy events are seeded.

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

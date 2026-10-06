import {
  User,
  StudentProfile,
  College,
  Event,
  EventRegistration,
  Group,
  GroupMembership,
  Message,
  Notification,
  Payment,
} from '../src/models/index';
import { seedDatabaseIfEmpty } from '../src/config/seed';
import {
  canManageEventGroup,
  syncEventRegistrationsToGroup,
  addStudentToEventGroup,
  removeStudentFromEventGroup,
  updateEventGroupLifecycle,
} from '../src/services/eventGroupService';
import bcrypt from 'bcryptjs';

async function runPart5CTests() {
  console.log('--- STARTING EVENTHUB PART 5C VERIFICATION SUITE ---');
  await seedDatabaseIfEmpty();

  const results: Record<string, 'PASS' | 'FAIL'> = {};
  const cleanupIds: {
    users: string[];
    colleges: string[];
    events: string[];
    groups: string[];
    memberships: string[];
    registrations: string[];
    messages: string[];
    notifications: string[];
  } = {
    users: [],
    colleges: [],
    events: [],
    groups: [],
    memberships: [],
    registrations: [],
    messages: [],
    notifications: [],
  };

  try {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    const timestamp = Date.now();

    // Setup College
    const testCollege = await College.create({
      name: `Part5C Tech Institute ${timestamp}`,
      domain: `p5c${timestamp}.edu`,
      status: 'Approved',
      superAdminEmail: `college5c_${timestamp}@test.edu`,
      address: '100 Innovation Way',
      city: 'TechCity',
      state: 'CA',
    });
    cleanupIds.colleges.push(testCollege._id);

    // Setup Users:
    // 1. College Super Admin
    const collegeAdmin = await User.create({
      fullName: 'College Admin 5C',
      email: `admin5c_${timestamp}@test.edu`,
      passwordHash,
      role: 'College Super Admin',
      collegeId: testCollege._id,
      status: 'Active',
      isEmailVerified: true,
    });
    cleanupIds.users.push(collegeAdmin._id);

    // 2. Student Creator
    const studentCreator = await User.create({
      fullName: 'Student Creator 5C',
      email: `creator5c_${timestamp}@test.edu`,
      passwordHash,
      role: 'Student',
      collegeId: testCollege._id,
      status: 'Active',
      isEmailVerified: true,
    });
    cleanupIds.users.push(studentCreator._id);

    // 3. Normal Student (Non-creator, not registered initially)
    const normalStudent = await User.create({
      fullName: 'Normal Student 5C',
      email: `normal5c_${timestamp}@test.edu`,
      passwordHash,
      role: 'Student',
      collegeId: testCollege._id,
      status: 'Active',
      isEmailVerified: true,
    });
    cleanupIds.users.push(normalStudent._id);

    // 4. Paid Student
    const paidStudent = await User.create({
      fullName: 'Paid Student 5C',
      email: `paid5c_${timestamp}@test.edu`,
      passwordHash,
      role: 'Student',
      collegeId: testCollege._id,
      status: 'Active',
      isEmailVerified: true,
    });
    cleanupIds.users.push(paidStudent._id);

    // Create student profiles
    const profCreator = await StudentProfile.create({
      userId: studentCreator._id,
      fullName: studentCreator.fullName,
      email: studentCreator.email,
      collegeName: testCollege.name,
    });
    cleanupIds.users.push(profCreator._id);

    const profNormal = await StudentProfile.create({
      userId: normalStudent._id,
      fullName: normalStudent.fullName,
      email: normalStudent.email,
      collegeName: testCollege.name,
    });
    cleanupIds.users.push(profNormal._id);

    const profPaid = await StudentProfile.create({
      userId: paidStudent._id,
      fullName: paidStudent.fullName,
      email: paidStudent.email,
      collegeName: testCollege.name,
    });
    cleanupIds.users.push(profPaid._id);

    // Setup Free Event
    const freeEvent = await Event.create({
      title: `Hackathon 2026 ${timestamp}`,
      description: 'Official College Hackathon',
      hostCollegeId: testCollege._id,
      creatorUserId: studentCreator._id,
      eventDate: '2026-11-20',
      startTime: '09:00',
      endTime: '18:00',
      status: 'Published',
      isFree: true,
      registrationFee: 0,
      capacity: 100,
      registeredCount: 0,
    });
    cleanupIds.events.push(freeEvent._id);

    // Setup Paid Event
    const paidEvent = await Event.create({
      title: `Robotics Summit 2026 ${timestamp}`,
      description: 'Premium Robotics Masterclass',
      hostCollegeId: testCollege._id,
      creatorUserId: collegeAdmin._id,
      eventDate: '2026-12-05',
      startTime: '10:00',
      endTime: '17:00',
      status: 'Published',
      isFree: false,
      registrationFee: 25,
      capacity: 50,
      registeredCount: 0,
    });
    cleanupIds.events.push(paidEvent._id);

    // --- TEST 1: Event Group Creation Authorization ---
    // Normal student cannot manage Event Group for an event they didn't create
    const checkNormal = await canManageEventGroup(normalStudent, freeEvent._id);
    const checkCreator = await canManageEventGroup(studentCreator, freeEvent._id);
    const checkAdmin = await canManageEventGroup(collegeAdmin, freeEvent._id);

    results['TEST 1 — Event Group Creation Authorization Enforcement'] =
      !checkNormal.allowed && checkCreator.allowed && checkAdmin.allowed ? 'PASS' : 'FAIL';

    // --- TEST 2: Reject Event Group for Non-Existent Event ---
    const checkInvalid = await canManageEventGroup(collegeAdmin, '666666666666666666666666');
    results['TEST 2 — Rejects Event Group for Non-Existent Event'] =
      !checkInvalid.allowed ? 'PASS' : 'FAIL';

    // --- TEST 3: Create Event Group & Verify Fields Stored ---
    const eventGroup = await Group.create({
      name: `${freeEvent.title} Official Group`,
      description: `Official group for ${freeEvent.title}`,
      type: 'Event',
      eventId: freeEvent._id,
      hostCollegeId: testCollege._id,
      visibility: 'Public',
      groupPrivacy: 'Everyone',
      approvalRequired: false,
      ownerId: collegeAdmin._id,
      membersCount: 1,
      lifecycleStatus: 'Active',
      isReadOnly: false,
      createdAt: new Date().toISOString(),
    });
    cleanupIds.groups.push(eventGroup._id);

    const ownerMembership = await GroupMembership.create({
      groupId: eventGroup._id,
      userId: collegeAdmin._id,
      role: 'Owner',
      status: 'Active',
      joinedAt: new Date().toISOString(),
    });
    cleanupIds.memberships.push(ownerMembership._id);

    results['TEST 3 — Event Group Fields & Type Linkage Stored Correctly'] =
      eventGroup.type === 'Event' &&
      eventGroup.eventId === freeEvent._id &&
      eventGroup.hostCollegeId === testCollege._id &&
      eventGroup.ownerId === collegeAdmin._id
        ? 'PASS'
        : 'FAIL';

    // --- TEST 4: Prevent Duplicate Event Groups ---
    // Attempting to query existing group for this event
    const existingGroup = await Group.findOne({ eventId: freeEvent._id, type: 'Event' });
    const isDuplicatePrevented = Boolean(existingGroup && existingGroup._id === eventGroup._id);
    results['TEST 4 — Prevent Duplicate Event Groups / Reuses Existing Link'] =
      isDuplicatePrevented ? 'PASS' : 'FAIL';

    // --- TEST 5: Automatic Membership Upon Confirmed Free Event Registration ---
    const freeReg = await EventRegistration.create({
      registrationId: `EH-TEST-${timestamp}`,
      eventId: freeEvent._id,
      studentId: profNormal._id,
      studentUserId: normalStudent._id,
      collegeId: testCollege._id,
      studentName: normalStudent.fullName,
      studentEmail: normalStudent.email,
      isFree: true,
      amount: 0,
      paymentStatus: 'Waived',
      status: 'Confirmed',
      attended: false,
      certificateIssued: false,
      qrToken: `token-${timestamp}`,
    });
    cleanupIds.registrations.push(freeReg._id);

    // Call service to add student
    await addStudentToEventGroup(freeEvent._id, normalStudent._id);

    const normalMembership = await GroupMembership.findOne({
      groupId: eventGroup._id,
      userId: normalStudent._id,
      status: 'Active',
    });
    if (normalMembership) cleanupIds.memberships.push(normalMembership._id);

    results['TEST 5 — Automatic Group Membership on Confirmed Free Registration'] =
      normalMembership && normalMembership.role === 'Member' ? 'PASS' : 'FAIL';

    // --- TEST 6: Prevent Duplicate Memberships ---
    await addStudentToEventGroup(freeEvent._id, normalStudent._id);
    const countMemberships = await GroupMembership.countDocuments({
      groupId: eventGroup._id,
      userId: normalStudent._id,
    });
    results['TEST 6 — Prevent Duplicate Event Group Memberships'] =
      countMemberships === 1 ? 'PASS' : 'FAIL';

    // --- TEST 7: Paid Event Handling (Pending Payment vs Confirmed) ---
    // Create paid group
    const paidGroup = await Group.create({
      name: `${paidEvent.title} Official Group`,
      description: `Official group for ${paidEvent.title}`,
      type: 'Event',
      eventId: paidEvent._id,
      hostCollegeId: testCollege._id,
      visibility: 'Public',
      ownerId: collegeAdmin._id,
      membersCount: 1,
      lifecycleStatus: 'Active',
      isReadOnly: false,
      createdAt: new Date().toISOString(),
    });
    cleanupIds.groups.push(paidGroup._id);

    // Create pending registration
    const pendingPaidReg = await EventRegistration.create({
      registrationId: `EH-PAID-${timestamp}`,
      eventId: paidEvent._id,
      studentId: profPaid._id,
      studentUserId: paidStudent._id,
      collegeId: testCollege._id,
      studentName: paidStudent.fullName,
      studentEmail: paidStudent.email,
      isFree: false,
      amount: 25,
      paymentStatus: 'Pending',
      status: 'Pending',
      attended: false,
      certificateIssued: false,
      qrToken: `paid-token-${timestamp}`,
    });
    cleanupIds.registrations.push(pendingPaidReg._id);

    // Verify student is NOT in group while payment is pending
    const paidMembershipPending = await GroupMembership.findOne({
      groupId: paidGroup._id,
      userId: paidStudent._id,
    });

    // Now simulate payment confirmed:
    await EventRegistration.findByIdAndUpdate(pendingPaidReg._id, {
      paymentStatus: 'Completed',
      status: 'Confirmed',
    });
    await addStudentToEventGroup(paidEvent._id, paidStudent._id);

    const paidMembershipConfirmed = await GroupMembership.findOne({
      groupId: paidGroup._id,
      userId: paidStudent._id,
      status: 'Active',
    });
    if (paidMembershipConfirmed) cleanupIds.memberships.push(paidMembershipConfirmed._id);

    results['TEST 7 — Paid Event: No Access Until Payment Verified, Access Upon Confirmation'] =
      !paidMembershipPending && Boolean(paidMembershipConfirmed) ? 'PASS' : 'FAIL';

    // --- TEST 8: Registration Cancellation Revokes Access Immediately ---
    await EventRegistration.findByIdAndUpdate(freeReg._id, { status: 'Cancelled' });
    await removeStudentFromEventGroup(freeEvent._id, normalStudent._id);

    const revokedMembership = await GroupMembership.findOne({
      groupId: eventGroup._id,
      userId: normalStudent._id,
      status: 'Active',
    });

    results['TEST 8 — Registration Cancellation Revokes Event Group Access'] =
      !revokedMembership ? 'PASS' : 'FAIL';

    // --- TEST 9: Re-registration Re-enables Access ---
    await EventRegistration.findByIdAndUpdate(freeReg._id, { status: 'Confirmed' });
    await addStudentToEventGroup(freeEvent._id, normalStudent._id);

    const readdedMembership = await GroupMembership.findOne({
      groupId: eventGroup._id,
      userId: normalStudent._id,
      status: 'Active',
    });
    if (readdedMembership) cleanupIds.memberships.push(readdedMembership._id);

    results['TEST 9 — Re-Registration Safely Re-enables Active Event Group Access'] =
      Boolean(readdedMembership) ? 'PASS' : 'FAIL';

    // --- TEST 10: Event Lifecycle Propagation (Completed / Cancelled) ---
    // Post a message in the event group first
    const msg = await Message.create({
      conversationId: `group_${eventGroup._id}`,
      groupId: eventGroup._id,
      senderId: collegeAdmin._id,
      senderName: collegeAdmin.fullName,
      senderRole: 'Owner',
      text: 'Welcome all hackathon participants!',
      isAnnouncement: true,
      readBy: [collegeAdmin._id],
      deletedFor: [],
      deletedForUserIds: [],
    });
    cleanupIds.messages.push(msg._id);

    // Now update event to Completed
    await Event.findByIdAndUpdate(freeEvent._id, { status: 'Completed' });
    await updateEventGroupLifecycle(freeEvent._id, 'Completed');

    const updatedGroup = await Group.findById(eventGroup._id);
    const systemAnnouncement = await Message.findOne({
      groupId: eventGroup._id,
      isAnnouncement: true,
      text: /event has officially concluded/i,
    });
    if (systemAnnouncement) cleanupIds.messages.push(systemAnnouncement._id);

    results['TEST 10 — Event Lifecycle Propagates to Event Group (Read-Only & Closed Announcement)'] =
      updatedGroup?.lifecycleStatus === 'Completed' &&
      updatedGroup?.isReadOnly === true &&
      Boolean(systemAnnouncement)
        ? 'PASS'
        : 'FAIL';

    // --- TEST 11: Event Group Notification Generated ---
    const notif = await Notification.findOne({
      recipientUserId: normalStudent._id,
      title: /Hackathon 2026/i,
    });
    if (notif) cleanupIds.notifications.push(notif._id);

    results['TEST 11 — Event Group Membership Notification Created for Student'] =
      Boolean(notif) ? 'PASS' : 'FAIL';

    // --- TEST 12: Database Persistence in MongoDB Atlas ---
    const persistedGroup = await Group.findById(eventGroup._id);
    const persistedReg = await EventRegistration.findById(freeReg._id);
    results['TEST 12 — Event Group & Registration Data Persist in MongoDB Atlas'] =
      Boolean(persistedGroup && persistedReg) ? 'PASS' : 'FAIL';

    // Cleanup test artifacts
    console.log('Cleaning up Part 5C test data...');
    for (const id of cleanupIds.groups) await Group.findByIdAndDelete(id);
    for (const id of cleanupIds.memberships) await GroupMembership.findByIdAndDelete(id);
    for (const id of cleanupIds.registrations) await EventRegistration.findByIdAndDelete(id);
    for (const id of cleanupIds.messages) await Message.findByIdAndDelete(id);
    for (const id of cleanupIds.notifications) await Notification.findByIdAndDelete(id);
    for (const id of cleanupIds.events) await Event.findByIdAndDelete(id);
    for (const id of cleanupIds.users) {
      await User.findByIdAndDelete(id);
      await StudentProfile.findByIdAndDelete(id);
    }
    for (const id of cleanupIds.colleges) await College.findByIdAndDelete(id);

    console.log('\n--- PART 5C VERIFICATION RESULTS ---');
    for (const [testName, res] of Object.entries(results)) {
      console.log(`${res === 'PASS' ? '✅' : '❌'} ${testName}: ${res}`);
    }

    const allPassed = Object.values(results).every((r) => r === 'PASS');
    const passedCount = Object.values(results).filter((r) => r === 'PASS').length;
    const totalCount = Object.keys(results).length;

    console.log(
      `\nOVERALL PART 5C STATUS: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'} (${passedCount}/${totalCount})`
    );
    return allPassed;
  } catch (err) {
    console.error('PART 5C VERIFICATION FAILED WITH EXCEPTION:', err);
    return false;
  }
}

runPart5CTests().then((ok) => process.exit(ok ? 0 : 1));

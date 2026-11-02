import dotenv from 'dotenv';
import path from 'path';
import assert from 'assert';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
process.env.SIMULATE_EMAIL = 'true';

function createMockReqRes(options: {
  body?: any;
  query?: any;
  params?: any;
  headers?: any;
  user?: any;
  college?: any;
}) {
  let statusCode = 200;
  let responseData: any = null;

  const req: any = {
    body: options.body || {},
    query: options.query || {},
    params: options.params || {},
    headers: options.headers || {},
    user: options.user,
    college: options.college,
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    send(data: any) {
      responseData = data;
      return res;
    },
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getData: () => responseData,
  };
}

async function runVerification() {
  console.log('====================================================');
  console.log('   EVENTHUB CONTINUATION VERIFICATION TEST SUITE    ');
  console.log('====================================================\n');

  const { connectToMongo } = await import('./backend/src/config/db');
  const { seedDatabaseIfEmpty } = await import('./backend/src/config/seed');
  const { Event, Group, EventRegistration, User, College } = await import('./backend/src/models/index');
  const { quickSwitch, login } = await import('./backend/src/controllers/authController');
  const { createEvent, updateEvent, approveStudentEvent, deleteEvent } = await import('./backend/src/controllers/eventController');
  const { registerForEvent, getCollegeRegistrations } = await import('./backend/src/controllers/registrationController');
  const { markAttendance } = await import('./backend/src/controllers/attendanceController');

  await connectToMongo();
  await seedDatabaseIfEmpty();

  console.log('✓ Connected to MongoDB Atlas & initialized database seeds.\n');

  // -------------------------------------------------------------
  // TEST 1: Preserve and verify all 4 roles authentication
  // -------------------------------------------------------------
  console.log('[TEST 1] Verifying all four roles can authenticate...');
  
  // 1A. Participant / Student
  const sCtx = createMockReqRes({ body: { target: 'student' } });
  await quickSwitch(sCtx.req, sCtx.res);
  assert.strictEqual(sCtx.getStatus(), 200);
  const studentData = sCtx.getData();
  assert.strictEqual(studentData.success, true);
  assert.strictEqual(studentData.user.role, 'Student');
  const studentUser = studentData.user;
  console.log(`  ✓ Participant (Student) authenticated: ${studentUser.fullName} (${studentUser.email})`);

  // 1B. Organizer
  const oCtx = createMockReqRes({ body: { target: 'organizer' } });
  await quickSwitch(oCtx.req, oCtx.res);
  assert.strictEqual(oCtx.getStatus(), 200);
  const orgData = oCtx.getData();
  assert.strictEqual(orgData.success, true);
  assert.strictEqual(orgData.user.role, 'Organizer');
  const orgUser = orgData.user;
  console.log(`  ✓ Organizer authenticated: ${orgData.organizerProfile?.organizationName || orgUser.fullName}`);

  // 1C. College Super Admin (Approver)
  const cCtx = createMockReqRes({ body: { target: 'college-super' } });
  await quickSwitch(cCtx.req, cCtx.res);
  assert.strictEqual(cCtx.getStatus(), 200);
  const collegeData = cCtx.getData();
  assert.strictEqual(collegeData.success, true);
  assert.strictEqual(collegeData.user.role, 'College Super Admin');
  const collegeUser = collegeData.user;
  const approverCollegeId = collegeUser.collegeId || collegeData.college?._id;
  console.log(`  ✓ Approver (College Super Admin) authenticated: ${collegeData.college?.name} (${approverCollegeId})`);

  // 1D. College Admin with active memberships
  const { CollegeAdminMembership } = await import('./backend/src/models/index');
  const adminMembership = await CollegeAdminMembership.findOne({ status: 'Active' });
  assert.ok(adminMembership, 'Active college admin membership must exist');
  console.log(`  ✓ College Admin membership verified: ${adminMembership.name} (${adminMembership.role}) for College ID: ${adminMembership.collegeId}`);
  const eventPayload = {
    title: 'DevHack 2026',
    poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
    tagline: 'Build next-gen collegiate tools',
    description: 'Comprehensive 48h hackathon focusing on AI and developer tools.',
    targetCollegeId: approverCollegeId,
    category: 'Technical',
    eventType: 'Hackathon',
    eventMode: 'Offline',
    venue: 'Main Tech Auditorium',
    eventDate: '2026-11-20',
    startTime: '09:00',
    endTime: '18:00',
    registrationDeadline: '2026-11-19T23:59:59.000Z',
    capacity: 100,
    isFree: true,
    registrationFee: 0,
    registrationType: 'Individual',
    saveAsDraft: true,
    createEventGroup: true,
    groupDetails: {
      groupName: 'DevHack 2026 Official Group',
      groupDescription: 'Collaborate with fellow hackers, find team members, and get announcements.',
      groupVisibility: 'Event Participants Only',
      minMembers: 1,
      maxMembers: 100,
      teamLeaderRequired: false,
      rules: '1. Be respectful to all participants.\n2. No harassment or discriminatory comments.\n3. Keep discussions related to hackathon topics.',
    },
    rulesAndGuidelines: '1. Follow standard hackathon code of conduct.\n2. Projects must be built during event.',
    primaryCoordinator: {
      name: 'Sarah Connor',
      phone: '9876543210',
      email: 'coordinator@eventhub.org',
    },
    registrationQuestions: [
      { id: 'q_tshirt', label: 'T-Shirt Size', type: 'Dropdown', required: true, options: ['S', 'M', 'L', 'XL'] },
      { id: 'q_github', label: 'GitHub Profile Link', type: 'Short Text', required: true },
      { id: 'q_experience', label: 'Years of Coding Experience', type: 'Number', required: false },
    ],
  };

  const createCtx = createMockReqRes({
    body: eventPayload,
    user: orgUser,
  });
  await createEvent(createCtx.req, createCtx.res);
  assert.strictEqual(createCtx.getStatus(), 201, `Event creation should return 201: ${JSON.stringify(createCtx.getData())}`);
  const createdEvent = createCtx.getData().event;
  console.log(`  ✓ Event proposed by Organizer: "${createdEvent.title}" (Status: ${createdEvent.status})`);
  assert.ok(createdEvent.hasGroup, 'Event must have hasGroup set to true');
  assert.ok(createdEvent.groupId, 'Event must have associated groupId');
  assert.ok(createdEvent.groupDetails, 'Event must have groupDetails stored');
  assert.strictEqual(createdEvent.groupDetails.groupName, 'DevHack 2026 Official Group');
  assert.strictEqual(createdEvent.groupDetails.rules.length, 3, 'Group rules must be normalized to 3 items');

  // Verify associated Group in DB
  const dbGroup = await Group.findById(createdEvent.groupId);
  assert.ok(dbGroup, 'Associated Group record must exist in database');
  assert.strictEqual(dbGroup!.name, 'DevHack 2026 Official Group');
  assert.strictEqual(dbGroup!.visibility, 'Event Participants Only');
  assert.strictEqual(dbGroup!.rules?.length, 3);
  console.log(`  ✓ Associated Event Group provisioned with 3 rules: ${dbGroup!.name} (ID: ${dbGroup!._id})`);

  // -------------------------------------------------------------
  // TEST 3: Edit event group details and verify sync
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Testing Event Edit & Group Details Synchronization...');
  const updateCtx = createMockReqRes({
    params: { id: createdEvent._id },
    body: {
      ...eventPayload,
      submitForReview: true,
      tagline: 'Updated: Build scalable solutions',
      groupDetails: {
        groupName: 'DevHack 2026 Innovation Lounge',
        groupDescription: 'Updated description for hackathon attendees.',
        groupVisibility: 'Event Participants Only',
        minMembers: 1,
        maxMembers: 120,
        rules: '1. High collaboration and support.\n2. Respect guidelines.\n3. Submit by deadline.\n4. Keep code open source.',
      },
    },
    user: orgUser,
  });
  await updateEvent(updateCtx.req, updateCtx.res);
  assert.strictEqual(updateCtx.getStatus(), 200, `Event update should return 200: ${JSON.stringify(updateCtx.getData())}`);
  
  const updatedDbGroup = await Group.findById(createdEvent.groupId);
  assert.ok(updatedDbGroup);
  assert.strictEqual(updatedDbGroup!.name, 'DevHack 2026 Innovation Lounge');
  assert.strictEqual(updatedDbGroup!.rules?.length, 4);
  console.log(`  ✓ Group successfully synced: "${updatedDbGroup!.name}" now has 4 rules`);

  // -------------------------------------------------------------
  // TEST 4: Approver / College Admin reviews and approves proposal
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Testing Approver reviewing and approving proposal...');
  const approveCtx = createMockReqRes({
    params: { id: createdEvent._id },
    body: {},
    user: collegeUser,
    college: collegeData.college,
  });
  await approveStudentEvent(approveCtx.req, approveCtx.res);
  assert.strictEqual(approveCtx.getStatus(), 200, `Proposal approval failed: ${JSON.stringify(approveCtx.getData())}`);
  console.log(`  ✓ Proposal approved by College Super Admin. Event is now Published.`);

  // -------------------------------------------------------------
  // TEST 5: Participant registers with Custom Answers
  // -------------------------------------------------------------
  console.log('\n[TEST 5] Testing Participant registration & data persistence...');
  const regPayload = {
    eventId: createdEvent._id,
    registrationType: 'Individual',
    studentPhone: '9876543210',
    studentName: studentUser.fullName,
    customResponses: {
      q_tshirt: 'L',
      q_github: 'https://github.com/alexchen',
      q_experience: '3',
    },
  };

  const regCtx = createMockReqRes({
    body: regPayload,
    user: studentUser,
  });
  await registerForEvent(regCtx.req, regCtx.res);
  assert.strictEqual(regCtx.getStatus(), 201, `Registration should return 201: ${JSON.stringify(regCtx.getData())}`);
  const createdReg = regCtx.getData().registration;
  console.log(`  ✓ Participant registered successfully! Registration ID: ${createdReg.registrationId}`);
  
  // Check persistence of custom answers snapshot in database
  const dbReg = await EventRegistration.findById(createdReg._id);
  assert.ok(dbReg, 'Registration record must exist in DB');
  assert.ok(dbReg.answersList && Array.isArray(dbReg.answersList), 'Registration must have answersList snapshot');
  assert.strictEqual(dbReg.answersList.length, 3, 'Must have 3 answers in answersList');
  assert.strictEqual(dbReg.answersList[0].label, 'T-Shirt Size');
  assert.strictEqual(dbReg.answersList[0].answer, 'L');
  assert.strictEqual(dbReg.answersList[1].label, 'GitHub Profile Link');
  assert.strictEqual(dbReg.answersList[1].answer, 'https://github.com/alexchen');
  assert.ok(dbReg.registrationDate, 'registrationDate must be persisted');
  console.log(`  ✓ Answers permanently persisted in answersList snapshot:`);
  dbReg.answersList.forEach((a: any) => console.log(`     - [${a.label}]: ${a.answer}`));

  // -------------------------------------------------------------
  // TEST 6: College Admin queries Registrations List
  // -------------------------------------------------------------
  console.log('\n[TEST 6] Testing College Admin querying registration list with custom answers...');
  const collegeRegsCtx = createMockReqRes({
    query: { eventId: createdEvent._id },
    user: collegeUser,
    college: collegeData.college,
  });
  await getCollegeRegistrations(collegeRegsCtx.req, collegeRegsCtx.res);
  assert.strictEqual(collegeRegsCtx.getStatus(), 200);
  const collegeRegsData = collegeRegsCtx.getData();
  assert.strictEqual(collegeRegsData.success, true);
  assert.strictEqual(collegeRegsData.registrations.length, 1);
  const regItem = collegeRegsData.registrations[0];
  assert.strictEqual(regItem.studentName, studentUser.fullName);
  assert.ok(regItem.answersList && regItem.answersList.length === 3);
  console.log(`  ✓ College Admin retrieved participant registration with all 3 custom answers!`);

  // -------------------------------------------------------------
  // TEST 7: Organizer queries Registrations List for their own event
  // -------------------------------------------------------------
  console.log('\n[TEST 7] Testing Organizer querying registration list for their own event...');
  const orgRegsCtx = createMockReqRes({
    query: { eventId: createdEvent._id },
    user: orgUser,
  });
  await getCollegeRegistrations(orgRegsCtx.req, orgRegsCtx.res);
  assert.strictEqual(orgRegsCtx.getStatus(), 200);
  const orgRegsData = orgRegsCtx.getData();
  assert.strictEqual(orgRegsData.success, true);
  assert.strictEqual(orgRegsData.registrations.length, 1);
  console.log(`  ✓ Organizer retrieved registrations list for their organized event!`);

  // -------------------------------------------------------------
  // TEST 8: Cross-institution authorization boundary check
  // -------------------------------------------------------------
  console.log('\n[TEST 8] Testing Cross-institution authorization boundary security...');
  const unauthCtx = createMockReqRes({
    query: { eventId: createdEvent._id },
    user: studentUser,
  });
  await getCollegeRegistrations(unauthCtx.req, unauthCtx.res);
  assert.strictEqual(unauthCtx.getStatus(), 403, 'Normal student must be blocked (403 Forbidden) from college registration roster');
  console.log(`  ✓ Unauthorized participant correctly blocked with 403 Forbidden!`);

  // -------------------------------------------------------------
  // TEST 9: Attendance Check-In Desk Action
  // -------------------------------------------------------------
  console.log('\n[TEST 9] Testing Organizer Attendance Check-In Desk marking attendance...');
  const markAttCtx = createMockReqRes({
    body: {
      eventId: createdEvent._id,
      registrationId: createdReg.registrationId,
      status: 'Present',
    },
    user: orgUser,
  });
  await markAttendance(markAttCtx.req, markAttCtx.res);
  assert.strictEqual(markAttCtx.getStatus(), 200, `Attendance mark should succeed: ${JSON.stringify(markAttCtx.getData())}`);
  
  // Verify attendance in DB
  const verifiedDbReg = await EventRegistration.findById(createdReg._id);
  assert.ok(verifiedDbReg);
  assert.strictEqual(verifiedDbReg!.attended, true);
  console.log(`  ✓ Attendee marked Present at Check-In Desk (Attended: ${verifiedDbReg!.attended})`);

  // -------------------------------------------------------------
  // TEST 10: Event Deletion protection before attendance finalized
  // -------------------------------------------------------------
  console.log('\n[TEST 10] Testing Event Deletion safety check before attendance finalization...');
  const delCtx = createMockReqRes({
    params: { id: createdEvent._id },
    user: orgUser,
  });
  await deleteEvent(delCtx.req, delCtx.res);
  assert.strictEqual(delCtx.getStatus(), 400, 'Published event with attendees must not be deleted before attendance finalization');
  console.log(`  ✓ Event deletion safely blocked with 400: "${delCtx.getData().message}"`);

  // -------------------------------------------------------------
  // ALL TESTS COMPLETED SUCCESSFULLY
  // -------------------------------------------------------------
  console.log('\n====================================================');
  console.log('   ALL 10 VERIFICATION SUITE TESTS PASSED (10/10)   ');
  console.log('====================================================\n');
}

runVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
  });

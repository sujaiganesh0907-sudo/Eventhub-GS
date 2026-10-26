import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

async function run() {
  console.log('====================================================');
  console.log('EVENTHUB COMPREHENSIVE AUTOMATED VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Authenticate as College Admin
  console.log('--- Step 1: College Admin Authentication ---');
  const collegeLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@apextech.edu',
      password: 'Admin@123',
    }),
  });
  const collegeLoginData: any = await collegeLoginRes.json();
  assert(collegeLoginData.success === true, 'College admin logged in successfully');
  const collegeToken = collegeLoginData.tokens?.accessToken;
  const collegeId = collegeLoginData.user?.collegeId;
  assert(Boolean(collegeToken), 'Access token received for college admin');

  // 2. Authenticate as Student
  console.log('\n--- Step 2: Student Authentication ---');
  const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sureshmanikkavasagam123@gmail.com',
      password: 'Password123!',
    }),
  });
  const studentLoginData: any = await studentLoginRes.json();
  assert(studentLoginData.success === true, 'Student logged in successfully');
  const studentToken = studentLoginData.tokens?.accessToken;
  const studentUser = studentLoginData.user;
  assert(Boolean(studentToken), 'Access token received for student');

  // 3. Test Event Creation with ONLY Required Fields
  console.log('\n--- Step 3: Event Creation (Only Required Fields) ---');
  const suffix = Math.floor(Math.random() * 100000);
  const requiredOnlyPayload = {
    title: `Minimal Tech Challenge ${suffix}`,
    poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
    category: 'Technical',
    description: 'This is a clean technical challenge with only required fields entered.',
    eventDate: '2026-11-20',
    startTime: '10:00',
    endTime: '16:00',
    registrationDeadline: '2026-11-19T18:00',
    eventMode: 'Offline',
    venue: 'Hall A',
    registrationType: 'Individual',
    capacity: 50,
    rulesAndGuidelines: 'Standard collegiate fair rules apply.',
    primaryCoordinator: {
      name: 'John Organizer',
      phone: '+1 555-0100',
      email: 'john@apex.edu',
    },
  };

  const createReqRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collegeToken}`,
    },
    body: JSON.stringify(requiredOnlyPayload),
  });
  const createReqData: any = await createReqRes.json();
  assert(createReqData.success === true, 'Created event with only required fields');
  const event1 = createReqData.event;
  assert(Boolean(event1?._id), 'Event 1 has valid ID');
  assert(!event1.secondaryCoordinator?.name, 'Optional secondaryCoordinator is not saved');
  assert(!event1.hallRoom, 'Optional hallRoom is empty (no fake "Seminar Hall 1")');
  assert(!event1.buildingBlock, 'Optional buildingBlock is empty (no fake "Computing Complex")');
  assert(!event1.address, 'Optional address is empty (no fake "Campus Plaza")');
  assert(!event1.tagline, 'Optional tagline is empty');
  assert(!event1.reportingTime, 'Optional reportingTime is empty (no fake "08:45 AM")');
  assert(!event1.transportParkingNotes, 'Optional transportParkingNotes is empty (no fake parking notes)');
  assert(!event1.meetingLink, 'Optional meetingLink is empty (no fake google meet link)');
  assert(event1.hasMultipleRounds === false, 'hasMultipleRounds is false');
  assert(Array.isArray(event1.rounds) && event1.rounds.length === 0, 'rounds array is empty (no fake rounds)');
  assert(event1.prizeAvailable === false, 'prizeAvailable is false');
  assert(!event1.firstPrize, 'firstPrize is empty (no fake "$1,000 + Trophy")');
  assert(event1.totalPrizePool === 0, 'totalPrizePool is 0');
  assert(event1.certificateAvailable === false, 'certificateAvailable is false');
  assert(Array.isArray(event1.customDetails) && event1.customDetails.length === 0, 'customDetails is empty (no fake Wi-Fi)');

  // Direct persistence check via GET /events/:id
  const getEvent1Res = await fetch(`${BASE_URL}/events/${event1._id}`);
  const getEvent1Data: any = await getEvent1Res.json();
  assert(getEvent1Data.success === true, 'Re-fetched event from database');
  assert(getEvent1Data.event.title === requiredOnlyPayload.title, 'Title preserved');
  assert(!getEvent1Data.event.secondaryCoordinator, 'secondaryCoordinator remains absent in DB');
  assert(!getEvent1Data.event.hallRoom, 'hallRoom remains absent in DB');

  // 4. Test Event Creation with SOME Optional Fields
  console.log('\n--- Step 4: Event Creation (With Some Optional Fields) ---');
  const someOptionalPayload = {
    title: `Robotics Expo ${suffix}`,
    poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
    category: 'Robotics',
    description: 'Robotics exhibition with custom prize pool and Wi-Fi credentials.',
    eventDate: '2026-11-25',
    startTime: '09:00',
    endTime: '17:00',
    registrationDeadline: '2026-11-24T12:00',
    eventMode: 'Offline',
    venue: 'Robotics Lab',
    tagline: 'Designing tomorrow today',
    reportingTime: '08:30 AM',
    registrationType: 'Individual',
    capacity: 75,
    rulesAndGuidelines: 'Safety goggles required inside the robotics lab.',
    prizeAvailable: true,
    totalPrizePool: 500,
    firstPrize: '$500 Gold Trophy',
    customDetails: [
      { id: 'wifi', label: 'Guest Network', type: 'Short Text', value: 'ROBOTICS_CONF' }
    ],
    primaryCoordinator: {
      name: 'Sarah Lead',
      phone: '+1 555-0200',
      email: 'sarah@apex.edu',
    },
  };

  const createOptRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collegeToken}`,
    },
    body: JSON.stringify(someOptionalPayload),
  });
  const createOptData: any = await createOptRes.json();
  assert(createOptData.success === true, 'Created event with some optional fields');
  const event2 = createOptData.event;
  assert(event2.tagline === 'Designing tomorrow today', 'Specified tagline was saved');
  assert(event2.reportingTime === '08:30 AM', 'Specified reportingTime was saved');
  assert(event2.prizeAvailable === true, 'prizeAvailable is true');
  assert(event2.firstPrize === '$500 Gold Trophy', 'Specified firstPrize was saved');
  assert(!event2.secondPrize, 'Unspecified secondPrize remains empty');
  assert(event2.customDetails.length === 1, 'Custom details saved exactly 1 item');
  assert(event2.customDetails[0].value === 'ROBOTICS_CONF', 'Custom detail value matches');
  assert(!event2.secondaryCoordinator, 'Unspecified secondary coordinator remains absent');

  // 5. Test Event Editing & Persistence
  console.log('\n--- Step 5: Event Editing & Persistence ---');
  const editPayload = {
    title: `Robotics Expo ${suffix} — Updated`,
    tagline: 'Designing tomorrow today — Enhanced Edition',
    rulesAndGuidelines: 'Updated lab rules and safety checklist.',
    prizeAvailable: true,
    totalPrizePool: 750,
    firstPrize: '$750 Platinum Award',
    secondPrize: '$250 Runner Up',
  };

  const editRes = await fetch(`${BASE_URL}/events/${event2._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collegeToken}`,
    },
    body: JSON.stringify(editPayload),
  });
  const editData: any = await editRes.json();
  assert(editData.success === true, 'Event updated successfully');
  assert(editData.event.title === `Robotics Expo ${suffix} — Updated`, 'Updated title returned in response');
  assert(editData.event.secondPrize === '$250 Runner Up', 'Updated secondPrize saved');
  assert(editData.event.totalPrizePool === 750, 'Updated totalPrizePool saved');
  assert(!editData.event.secondaryCoordinator, 'Secondary coordinator remained absent after update');

  // Verify DB reflects updated event
  const getUpdatedRes = await fetch(`${BASE_URL}/events/${event2._id}`);
  const getUpdatedData: any = await getUpdatedRes.json();
  assert(getUpdatedData.event.title === `Robotics Expo ${suffix} — Updated`, 'DB persistence verified after refresh');
  assert(getUpdatedData.event.secondPrize === '$250 Runner Up', 'secondPrize persisted in DB');

  // 6. Test Group Creation, Edit, Member Roles, and Permissions
  console.log('\n--- Step 6: Group Creation, Edit, and Permissions ---');
  const groupPayload = {
    name: `Autonomous Robotics Circle ${suffix}`,
    description: 'A dedicated group for students working on autonomous systems.',
    chatPermissions: 'Everyone',
    groupPrivacy: 'Everyone',
  };

  const createGroupRes = await fetch(`${BASE_URL}/groups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collegeToken}`,
    },
    body: JSON.stringify(groupPayload),
  });
  const createGroupData: any = await createGroupRes.json();
  assert(createGroupData.success === true, 'Group created successfully');
  const group = createGroupData.group;
  assert(Boolean(group?._id), 'Group has valid ID');
  assert(group.name === groupPayload.name, 'Group name matches');
  assert(group.chatPermissions === 'Everyone', 'Default chatPermissions is Everyone');

  // Add Student to Group
  console.log('\n--- Step 7: Group Membership & Permissions ---');
  const addMemberRes = await fetch(`${BASE_URL}/groups/${group._id}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collegeToken}`,
    },
    body: JSON.stringify({ targetUserId: studentUser._id }),
  });
  const addMemberData: any = await addMemberRes.json();
  if (!addMemberData.success) {
    console.log('addMember failed:', addMemberRes.status, JSON.stringify(addMemberData));
  }
  assert(addMemberData.success === true, 'Student added to group');

  // Test Student sending a message when chatPermissions === 'Everyone'
  const sendMsg1Res = await fetch(`${BASE_URL}/groups/${group._id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ text: 'Hello fellow roboticists!' }),
  });
  const sendMsg1Data: any = await sendMsg1Res.json();
  assert(sendMsg1Data.success === true, 'Student successfully sent message when chat is open to Everyone');

  // Edit Group: restrict chat to Admins Only and change description
  console.log('\n--- Step 8: Edit Group Settings ---');
  const updateGroupRes = await fetch(`${BASE_URL}/groups/${group._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collegeToken}`,
    },
    body: JSON.stringify({
      description: 'Official announcements only for autonomous robotics.',
      chatPermissions: 'Admins Only',
      groupPrivacy: 'Invite Only',
    }),
  });
  const updateGroupData: any = await updateGroupRes.json();
  assert(updateGroupData.success === true, 'Group updated successfully');
  assert(updateGroupData.group.chatPermissions === 'Admins Only', 'chatPermissions updated to Admins Only');
  assert(updateGroupData.group.groupPrivacy === 'Invite Only', 'groupPrivacy updated to Invite Only');

  // Test Student sending a message when chatPermissions === 'Admins Only' (Expect 403 Forbidden)
  const sendMsgBlockedRes = await fetch(`${BASE_URL}/groups/${group._id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ text: 'Can I speak?' }),
  });
  assert(sendMsgBlockedRes.status === 403, 'Regular member blocked (HTTP 403) from sending message when chat is Admins Only');

  // Promote Student to Admin
  console.log('\n--- Step 9: Promote Member to Admin ---');
  const promoteRes = await fetch(`${BASE_URL}/groups/${group._id}/members/${studentUser._id}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collegeToken}`,
    },
    body: JSON.stringify({ role: 'Admin' }),
  });
  const promoteData: any = await promoteRes.json();
  assert(promoteData.success === true, 'Student promoted to Admin');

  // Now Student (as Admin) sends message when chatPermissions === 'Admins Only'
  const sendMsgAdminRes = await fetch(`${BASE_URL}/groups/${group._id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ text: 'Official Admin broadcast update.' }),
  });
  const sendMsgAdminData: any = await sendMsgAdminRes.json();
  assert(sendMsgAdminData.success === true, 'Promoted Admin can post in Admins Only group');

  // Clear Chat History for user
  console.log('\n--- Step 10: Clear Chat History ---');
  const clearChatRes = await fetch(`${BASE_URL}/groups/${group._id}/clear`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({}),
  });
  const clearChatData: any = await clearChatRes.json();
  assert(clearChatData.success === true, 'Chat cleared successfully for user');

  // Check messages after clear: Student should see 0 messages
  const getMsgsStudentRes = await fetch(`${BASE_URL}/groups/${group._id}/messages`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const getMsgsStudentData: any = await getMsgsStudentRes.json();
  assert(getMsgsStudentData.messages.length === 0, 'Cleared user sees 0 messages');

  // Other member (College admin) should STILL see all group messages
  const getMsgsCollegeRes = await fetch(`${BASE_URL}/groups/${group._id}/messages`, {
    headers: { Authorization: `Bearer ${collegeToken}` },
  });
  const getMsgsCollegeData: any = await getMsgsCollegeRes.json();
  assert(getMsgsCollegeData.messages.length >= 2, 'Other group members still see shared messages (safe clear)');

  // Demote and Leave Group
  console.log('\n--- Step 11: Demote & Leave Group ---');
  const demoteRes = await fetch(`${BASE_URL}/groups/${group._id}/members/${studentUser._id}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${collegeToken}`,
    },
    body: JSON.stringify({ role: 'Member' }),
  });
  const demoteData: any = await demoteRes.json();
  assert(demoteData.success === true, 'Student demoted back to Member');

  const leaveRes = await fetch(`${BASE_URL}/groups/${group._id}/leave`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({}),
  });
  const leaveData: any = await leaveRes.json();
  assert(leaveData.success === true, 'Member left group');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});

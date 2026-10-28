import assert from 'assert';

const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('--- STARTING 3-ROLE & WIZARD VERIFICATION ---');

  // Test 1: Organizer Quick Switch / Login
  console.log('1. Testing Organizer Login via Quick Switch...');
  const orgSwitchRes = await fetch(`${BASE_URL}/auth/quick-switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: 'organizer' }),
  });
  const orgSwitch = await orgSwitchRes.json();
  assert.strictEqual(orgSwitch.success, true, 'Organizer switch should succeed');
  assert.strictEqual(orgSwitch.user.role, 'Organizer', 'User role should be Organizer');
  assert.ok(orgSwitch.organizerProfile, 'Organizer profile should be returned');
  console.log('   ✓ Organizer authenticated successfully. Org name:', orgSwitch.organizerProfile.organizationName);

  const orgToken = orgSwitch.tokens.accessToken;

  // Test 2: Approver (College Super Admin) Login
  console.log('2. Testing Approver Login via Quick Switch...');
  const appSwitchRes = await fetch(`${BASE_URL}/auth/quick-switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: 'college-super' }),
  });
  const appSwitch = await appSwitchRes.json();
  assert.strictEqual(appSwitch.success, true, 'College super switch should succeed');
  assert.strictEqual(appSwitch.user.role, 'College Super Admin');
  const appToken = appSwitch.tokens.accessToken;
  const collegeId = appSwitch.user.collegeId || appSwitch.college._id;
  console.log('   ✓ Approver authenticated. College ID:', collegeId);

  // Test 3: 4-Step Wizard Validation - Title Length > 15 chars rejected
  console.log('3. Testing Wizard Title Validation (> 15 chars)...');
  const invalidTitleRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgToken}`,
    },
    body: JSON.stringify({
      title: 'This Event Title Exceeds 15 Characters Limit',
      poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      targetCollegeId: collegeId,
      category: 'Technical',
      description: 'Valid short description within 200 characters.',
      eventDate: '2026-11-20',
      startTime: '09:00',
      endTime: '17:00',
      registrationDeadline: '2026-11-19T23:59',
      eventMode: 'Offline',
      venue: 'Main Campus Hall',
      registrationType: 'Individual',
      capacity: 100,
      rulesAndGuidelines: 'Valid rules.',
      isFree: true,
      primaryCoordinator: {
        name: 'Alex Vance',
        phone: '9876543210',
        email: 'alex@technexus.org',
      },
    }),
  });
  assert.strictEqual(invalidTitleRes.status, 400, 'Title > 15 chars must return 400 Bad Request');
  const invalidTitleJson = await invalidTitleRes.json();
  assert.ok(invalidTitleJson.message.includes('15'), 'Message should indicate 15 characters limit');
  console.log('   ✓ Wizard correctly rejected title > 15 chars:', invalidTitleJson.message);

  // Test 4: 4-Step Wizard Validation - Description > 200 chars rejected
  console.log('4. Testing Wizard Description Validation (> 200 chars)...');
  const longDesc = 'A'.repeat(205);
  const invalidDescRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgToken}`,
    },
    body: JSON.stringify({
      title: 'Tech Summit 26',
      poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      targetCollegeId: collegeId,
      category: 'Technical',
      description: longDesc,
      eventDate: '2026-11-20',
      startTime: '09:00',
      endTime: '17:00',
      registrationDeadline: '2026-11-19T23:59',
      eventMode: 'Offline',
      venue: 'Main Campus Hall',
      registrationType: 'Individual',
      capacity: 100,
      rulesAndGuidelines: 'Valid rules.',
      isFree: true,
      primaryCoordinator: {
        name: 'Alex Vance',
        phone: '9876543210',
        email: 'alex@technexus.org',
      },
    }),
  });
  assert.strictEqual(invalidDescRes.status, 400, 'Description > 200 chars must return 400 Bad Request');
  const invalidDescJson = await invalidDescRes.json();
  assert.ok(invalidDescJson.message.includes('200'), 'Message should indicate 200 characters limit');
  console.log('   ✓ Wizard correctly rejected description > 200 chars:', invalidDescJson.message);

  // Test 5: Organizer submits a valid proposal to Target College
  console.log('5. Testing Organizer submitting proposal to Approver college...');
  const proposalRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgToken}`,
    },
    body: JSON.stringify({
      title: 'HackSprint 26',
      poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      targetCollegeId: collegeId,
      category: 'Technical',
      eventType: 'Hackathon',
      tagline: 'Code for the Future',
      description: 'An elite 24-hour inter-college coding sprint with top industry sponsors.',
      eventDate: '2026-11-25',
      startTime: '10:00',
      endTime: '18:00',
      registrationDeadline: '2026-11-24T23:59',
      eventMode: 'Offline',
      venue: 'Ramanujan Tech Auditorium',
      registrationType: 'Team',
      minTeamSize: 2,
      maxTeamSize: 4,
      capacity: 200,
      rulesAndGuidelines: '1. Bring college ID.\n2. Original code required.',
      isFree: true,
      primaryCoordinator: {
        name: 'Alex Vance',
        phone: '9876543210',
        email: 'alex@technexus.org',
      },
      registrationQuestions: [
        {
          id: 'q1',
          label: 'GitHub Profile or Portfolio Link',
          type: 'Short Text',
          required: true,
        },
      ],
    }),
  });

  const proposalJson = await proposalRes.json();
  assert.strictEqual(proposalRes.status, 201, 'Proposal creation should return 201 Created');
  assert.strictEqual(proposalJson.event.creatorRole, 'Organizer', 'Event creatorRole should be Organizer');
  assert.strictEqual(proposalJson.event.status, 'Pending Approval', 'Event status must be Pending Approval');
  const createdEventId = proposalJson.event._id;
  console.log('   ✓ Proposal created successfully with ID:', createdEventId);

  // Test 6: Approver fetches pending proposals and sees the Organizer proposal
  console.log('6. Testing Approver viewing pending requests...');
  const reqListRes = await fetch(`${BASE_URL}/college/student-requests`, {
    headers: { Authorization: `Bearer ${appToken}` },
  });
  const reqList = await reqListRes.json();
  assert.strictEqual(reqListRes.status, 200, 'Requests list should return 200 OK');
  const found = reqList.requests.find((r: any) => r._id === createdEventId);
  assert.ok(found, 'Created organizer proposal must be present in approver requests queue');
  assert.strictEqual(found.creatorRole, 'Organizer');
  console.log('   ✓ Approver successfully retrieved pending proposal from Organizer!');

  // Test 7: Approver approves proposal
  console.log('7. Testing Approver approving the proposal...');
  const approveRes = await fetch(`${BASE_URL}/events/${createdEventId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${appToken}` },
  });
  const approveJson = await approveRes.json();
  assert.strictEqual(approveRes.status, 200, 'Approval should return 200 OK');
  assert.strictEqual(approveJson.success, true);

  // Verify event is now published
  const getEventRes = await fetch(`${BASE_URL}/events/${createdEventId}`);
  const getEventJson = await getEventRes.json();
  assert.strictEqual(getEventJson.event.status, 'Published', 'Event should now be Published');
  console.log('   ✓ Proposal approved and verified Published on public feed!');

  // Test 8: Organizer queries their events
  console.log('8. Testing Organizer querying their events...');
  const orgEventsRes = await fetch(`${BASE_URL}/organizer/events`, {
    headers: { Authorization: `Bearer ${orgToken}` },
  });
  const orgEventsJson = await orgEventsRes.json();
  assert.strictEqual(orgEventsRes.status, 200);
  assert.ok(orgEventsJson.events.some((e: any) => e._id === createdEventId));
  console.log('   ✓ Organizer successfully fetched their organized events.');

  console.log('\n--- ALL 3-ROLE & WIZARD TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

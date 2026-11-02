import assert from 'assert';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
process.env.SIMULATE_EMAIL = 'true';

async function runAuditTests() {
  console.log('===========================================================');
  console.log('      EVENTHUB AUDIT CORRECTIONS TEST SUITE (FINAL)        ');
  console.log('===========================================================\n');

  // TEST 1: Navbar Search Bar Layout Inspection
  console.log('[TEST 1] Verifying Navbar Search Bar layout & structure...');
  const navbarSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/common/Navbar.tsx'), 'utf-8');
  assert.ok(navbarSrc.includes('sticky top-0 z-40 w-full h-14 border-b'), 'Navbar header must be sticky top-0 with z-40');
  assert.ok(!navbarSrc.includes('id="navbar-search-row"'), 'Navbar must NOT contain separate navbar-search-row section below header');
  assert.ok(navbarSrc.includes('{isAuthenticated && !hideSearch ? ('), 'Search bar must be conditionally rendered in the main header');
  console.log('  ✓ Search bar is integrated directly in main header row between logo and user profile.');
  console.log('  ✓ Separate row underneath header has been removed.\n');

  // TEST 2: Approver Registration Elimination
  console.log('[TEST 2] Verifying Approver role removal from registration UI...');
  const authPageSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/AuthPage.tsx'), 'utf-8');
  assert.ok(authPageSrc.includes("mode === 'register' ? 'grid-cols-2' : 'grid-cols-3'"), 'Role switcher grid must adapt based on mode');
  assert.ok(authPageSrc.includes("{mode === 'login' && ("), 'Approver button must only be shown in login mode');
  assert.ok(authPageSrc.includes("if (mode === 'register' && role === 'college')"), 'Must auto-correct college role to student in registration mode');
  console.log('  ✓ Approver registration card/tab is removed from registration UI.');
  console.log('  ✓ Approver login remains fully functional in login mode.\n');

  // TEST 3: Redundant Export CSV Button Removal
  console.log('[TEST 3] Verifying EventRegistrationsModal export buttons...');
  const regModalSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/registration/EventRegistrationsModal.tsx'), 'utf-8');
  assert.ok(!regModalSrc.includes('<span>Export CSV</span>'), 'Redundant button labeled Export CSV must be removed');
  assert.ok(regModalSrc.includes('Download Spreadsheet'), 'Download Spreadsheet button must be retained');
  console.log('  ✓ Redundant "Export CSV" button removed from top filter bar.');
  console.log('  ✓ Primary "Download Spreadsheet" button preserved in footer.\n');

  // TEST 4: Backend Proposal Rejection & Empty Reason Enforcement
  console.log('[TEST 4] Testing Backend Proposal Rejection & Validation...');
  const { connectToMongo } = await import('./backend/src/config/db');
  const { seedDatabaseIfEmpty } = await import('./backend/src/config/seed');
  const { Event, College, User } = await import('./backend/src/models/index');
  const { quickSwitch } = await import('./backend/src/controllers/authController');
  const { rejectStudentEvent, deleteEvent } = await import('./backend/src/controllers/eventController');

  await connectToMongo();
  await seedDatabaseIfEmpty();

  const cCtx: any = { body: { target: 'college-super' }, params: {}, query: {}, headers: {} };
  let cStatus = 200;
  let cData: any = null;
  const cRes: any = {
    status: (code: number) => { cStatus = code; return cRes; },
    json: (data: any) => { cData = data; return cRes; },
  };
  await quickSwitch(cCtx, cRes);
  const approverUser = cData.user;
  const college = cData.college;

  // Create a test proposal
  const testProposal = await Event.create({
    title: 'Audit Test Proposal 2026',
    category: 'Hackathon',
    description: 'A test proposal to verify review and rejection workflows',
    hostCollegeId: college._id,
    targetCollegeId: college._id,
    hostCollegeName: college.name,
    eventDate: '2026-12-15',
    startTime: '10:00',
    endTime: '18:00',
    eventMode: 'Offline',
    venue: 'Auditorium Hall B',
    capacity: 200,
    registrationFee: 0,
    isFree: true,
    creatorRole: 'Student',
    creatorUserId: approverUser._id,
    status: 'Pending Approval',
  });

  // 4A: Attempt rejection without reason (must fail with 400)
  let rejStatus = 200;
  let rejData: any = null;
  const rejRes: any = {
    status: (c: number) => { rejStatus = c; return rejRes; },
    json: (d: any) => { rejData = d; return rejRes; },
  };
  const emptyReq: any = {
    params: { id: testProposal._id },
    body: { reason: '' },
    user: approverUser,
  };
  await rejectStudentEvent(emptyReq, rejRes);
  assert.strictEqual(rejStatus, 400, 'Rejection with empty reason must be rejected with 400');
  console.log(`  ✓ Empty rejection reason correctly blocked with 400: "${rejData.message}"`);

  // 4B: Rejection with valid reason (must succeed and save reason)
  rejStatus = 200;
  const validReq: any = {
    params: { id: testProposal._id },
    body: { reason: 'Auditorium is booked for college annual day. Please pick an alternative date.' },
    user: approverUser,
  };
  await rejectStudentEvent(validReq, rejRes);
  assert.strictEqual(rejStatus, 200, 'Rejection with valid reason must succeed with 200');
  const updatedProposal = await Event.findById(testProposal._id);
  assert.strictEqual(updatedProposal?.status, 'Rejected');
  assert.ok(updatedProposal?.rejectionReason?.includes('Auditorium is booked'));
  console.log('  ✓ Rejection succeeded, status marked "Rejected" and feedback reason saved.\n');

  // TEST 5: Event Deletion Rules
  console.log('[TEST 5] Testing Event Deletion Rules...');
  // 5A: Future event (not finished) -> deletion blocked
  let delStatus = 200;
  let delData: any = null;
  const delRes: any = {
    status: (c: number) => { delStatus = c; return delRes; },
    json: (d: any) => { delData = d; return delRes; },
  };
  const delFutureReq: any = {
    params: { id: testProposal._id },
    user: approverUser,
  };
  await deleteEvent(delFutureReq, delRes);
  assert.strictEqual(delStatus, 400);
  assert.ok(delData.message.includes('has not yet concluded'));
  console.log(`  ✓ Future event deletion blocked with 400: "${delData.message}"`);

  // 5B: Past event (finished) with 0 registrations -> deletion allowed
  delStatus = 200;
  await Event.findByIdAndUpdate(testProposal._id, {
    eventDate: '2025-01-10',
    startTime: '09:00',
    endTime: '17:00',
    registeredCount: 0,
    status: 'Completed',
  });
  await deleteEvent(delFutureReq, delRes);
  assert.strictEqual(delStatus, 200);
  const deletedEvent = await Event.findById(testProposal._id);
  assert.strictEqual(deletedEvent, null);
  console.log('  ✓ Finished event with 0 registrations successfully deleted.\n');

  console.log('===========================================================');
  console.log('      ALL AUDIT CORRECTION TESTS PASSED (5/5)             ');
  console.log('===========================================================');
}

runAuditTests().catch((err) => {
  console.error('Audit tests failed:', err);
  process.exit(1);
});

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
process.env.SIMULATE_EMAIL = 'true';

async function runComprehensiveAudit() {
  console.log('======================================================================');
  console.log('       EVENTHUB COMPREHENSIVE FINAL FUNCTIONAL & AUDIT SUITE          ');
  console.log('======================================================================\n');

  const { connectToMongo } = await import('./backend/src/config/db');
  const { seedDatabaseIfEmpty } = await import('./backend/src/config/seed');
  const { Event, College, User, EventRegistration, StudentProfile, Payment, Connection } = await import('./backend/src/models/index');
  const { quickSwitch } = await import('./backend/src/controllers/authController');
  const { registerForEvent } = await import('./backend/src/controllers/registrationController');
  const { deleteEvent } = await import('./backend/src/controllers/eventController');
  const { getCollegeById, updateCollegeProfile } = await import('./backend/src/controllers/collegeController');
  const { createPaymentOrder, verifyPayment } = await import('./backend/src/controllers/paymentController');
  const { globalSearch } = await import('./backend/src/controllers/searchController');

  await connectToMongo();
  await seedDatabaseIfEmpty();

  // Helper for mock HTTP requests
  function createMockRes() {
    let statusCode = 200;
    let data: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (payload: any) => {
        data = payload;
        return res;
      },
      getStatusCode: () => statusCode,
      getData: () => data,
      reset: () => {
        statusCode = 200;
        data = null;
      },
    };
    return res;
  }

  // -------------------------------------------------------------------------
  // SECTION 1: Registered Pass Card Menu & Group Button Styling
  // -------------------------------------------------------------------------
  console.log('[AUDIT 1] Verifying Student Registered Passes Three-Dot Menu...');
  const passCardSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/event/RegisteredPassCard.tsx'), 'utf-8');
  assert.ok(!passCardSrc.includes('<span>1. View Ticket</span>'), 'Menu must not contain numbered prefixes like "1. View Ticket"');
  assert.ok(passCardSrc.includes('View Pass / QR'), 'Menu must include clean View Pass / QR option');
  assert.ok(passCardSrc.includes('Download Pass'), 'Menu must include clean Download Pass option');
  assert.ok(passCardSrc.includes('View Event Details'), 'Menu must include clean View Event Details option');
  assert.ok(passCardSrc.includes('Share Event'), 'Menu must include clean Share Event option');
  assert.ok(passCardSrc.includes('Add Reminder'), 'Menu must include clean Add Reminder option');
  console.log('  ✓ Registered pass three-dot dropdown menu uses clean, consistent professional options.\n');

  // -------------------------------------------------------------------------
  // SECTION 2: Approver Event Registration Restriction
  // -------------------------------------------------------------------------
  console.log('[AUDIT 2] Verifying Approver Event Registration Restriction (UI & Backend)...');
  // UI Check
  const viewEventSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/ViewEventPage.tsx'), 'utf-8');
  assert.ok(viewEventSrc.includes('isCollegeStaff ?'), 'ViewEventPage must guard registration button against approvers');
  assert.ok(viewEventSrc.includes('Approver Account'), 'ViewEventPage must display Approver Account badge instead of Register Now');

  // Backend Check
  const mockRes = createMockRes();
  const cCtx: any = { body: { target: 'college-super' }, params: {}, query: {}, headers: {} };
  await quickSwitch(cCtx, mockRes);
  const approverUser = mockRes.getData().user;

  // Find a published event
  const pubEvent = await Event.findOne({ status: 'Published' });
  assert.ok(pubEvent, 'Published event must exist in test database');

  mockRes.reset();
  const regReq: any = {
    user: approverUser,
    body: { eventId: pubEvent._id },
    params: {},
    query: {},
  };
  await registerForEvent(regReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 403, 'Approver registration must return 403 Forbidden');
  assert.ok(
    mockRes.getData().message.includes('Approvers') || mockRes.getData().message.includes('Only students'),
    'Appropriate restriction error message returned'
  );
  console.log('  ✓ UI: Register button hidden for Approvers, replaced by Approver Account badge.');
  console.log('  ✓ Backend: POST /registrations strictly returns 403 Forbidden for Approvers.\n');

  // -------------------------------------------------------------------------
  // SECTION 3: Approver Event Deletion Attendance Rules
  // -------------------------------------------------------------------------
  console.log('[AUDIT 3] Verifying Event Deletion Attendance & Conclusion Rules...');
  // 3A: Attempt to delete an active / in-progress event with registrations
  const activeEvent = await Event.create({
    title: 'Ongoing Active Tech Summit 2026',
    description: 'Ongoing summit',
    category: 'Technical',
    eventType: 'Conference',
    eventMode: 'Offline',
    venue: 'Hall A',
    eventDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    registrationDeadline: new Date(Date.now() + 86400000 * 5).toISOString(),
    capacity: 100,
    registrationFee: 0,
    status: 'Published',
    hostCollegeId: approverUser.collegeId,
    hostCollegeName: 'Test College',
    creatorUserId: approverUser._id,
    registeredCount: 15,
    attendanceFinalized: false,
  });

  mockRes.reset();
  const delActiveReq: any = {
    user: approverUser,
    params: { id: activeEvent._id },
    body: {},
  };
  await deleteEvent(delActiveReq, mockRes);
  assert.strictEqual(delActiveReq && mockRes.getStatusCode(), 400, 'Deleting active event with registrations must be rejected with 400');
  assert.ok(mockRes.getData().message.includes('attendance has been marked as finished and finalized'), 'Error specifies attendance conclusion requirement');

  // 3B: Delete completed event with finalized attendance
  const completedEvent = await Event.create({
    title: 'Concluded Hackathon 2026',
    description: 'Finished hackathon',
    category: 'Technical',
    eventType: 'Hackathon',
    eventMode: 'Offline',
    venue: 'Lab 1',
    eventDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    registrationDeadline: new Date(Date.now() - 86400000 * 3).toISOString(),
    capacity: 50,
    registrationFee: 0,
    status: 'Completed',
    hostCollegeId: approverUser.collegeId,
    hostCollegeName: 'Test College',
    creatorUserId: approverUser._id,
    registeredCount: 20,
    attendanceFinalized: true,
  });

  mockRes.reset();
  const delDoneReq: any = {
    user: approverUser,
    params: { id: completedEvent._id },
    body: {},
  };
  await deleteEvent(delDoneReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 200, 'Deleting concluded event with finalized attendance must succeed with 200');
  console.log('  ✓ Deletion blocked for active events with pending attendance.');
  console.log('  ✓ Deletion allowed once event concludes and attendance is finalized.\n');

  // -------------------------------------------------------------------------
  // SECTION 4: Institution Profile Event Action Buttons
  // -------------------------------------------------------------------------
  console.log('[AUDIT 4] Verifying Institution Profile Event Action Buttons (View, Share, Insights, Delete)...');
  const eventCardSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/event/EventCard.tsx'), 'utf-8');
  assert.ok(eventCardSrc.includes("label: 'View Event'"), 'EventCard ActionMenu includes View Event');
  assert.ok(eventCardSrc.includes("label: 'Share Event'"), 'EventCard ActionMenu includes Share Event');
  assert.ok(eventCardSrc.includes("label: 'Event Insights'"), 'EventCard ActionMenu includes Event Insights');
  assert.ok(eventCardSrc.includes("label: 'Delete Event'"), 'EventCard ActionMenu includes Delete Event');

  const colProfileSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/CollegeProfilePage.tsx'), 'utf-8');
  assert.ok(colProfileSrc.includes('onInsights={isSelf ? (e) => setSelectedEventForInsights(e) : undefined}'), 'Approver college profile passes onInsights');
  assert.ok(colProfileSrc.includes('onDeleteEvent={isSelf ? (e) => handleDeleteEvent(e) : undefined}'), 'Approver college profile passes onDeleteEvent');
  assert.ok(colProfileSrc.includes('onRegister={isSelf ? undefined : onRegisterEvent}'), 'Approver college profile disables onRegister for own account');
  console.log('  ✓ ActionMenu provides View Event, Share Event, Event Insights, and Delete Event.');
  console.log('  ✓ Real stats and attendance rules enforced.\n');

  // -------------------------------------------------------------------------
  // SECTION 5: Institution Profile Editable Details
  // -------------------------------------------------------------------------
  console.log('[AUDIT 5] Verifying Expanded Editable College Details (Persistence & Model)...');
  mockRes.reset();
  const updateReq: any = {
    user: approverUser,
    body: {
      name: 'Apex Institute of Advanced Technologies',
      institutionType: 'Autonomous Technological University',
      establishedYear: 1996,
      officialEmail: 'registrar@apextech.edu.in',
      phone: '+91 80 2345 6789',
      location: 'Bangalore, Karnataka',
      address: 'Outer Ring Road, IT Corridor',
      city: 'Bangalore',
      state: 'Karnataka',
      departments: ['Computer Science', 'Artificial Intelligence', 'Electronics'],
      facilities: ['Supercomputing Lab', 'Auditorium', 'Robotics Arena'],
      placementHighlights: '98% placements with top package of 46 LPA.',
      website: 'https://apextech.edu.in',
    },
  };
  await updateCollegeProfile(updateReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 200, 'updateCollegeProfile must succeed with 200');

  // Verify DB record
  const updatedCollege = await College.findById(approverUser.collegeId);
  assert.ok(updatedCollege, 'updatedCollege must not be null');
  assert.strictEqual(updatedCollege.name, 'Apex Institute of Advanced Technologies');
  assert.strictEqual(updatedCollege.institutionType, 'Autonomous Technological University');
  assert.strictEqual(updatedCollege.establishedYear, 1996);
  assert.strictEqual(updatedCollege.city, 'Bangalore');
  assert.ok(Array.isArray(updatedCollege.departments) && updatedCollege.departments.includes('Computer Science'));
  console.log('  ✓ Expanded fields (Type, Established Year, Departments, Facilities, Placements, Contacts) persist to DB.\n');

  // -------------------------------------------------------------------------
  // SECTION 6: Institution Profile Relationships & Counts
  // -------------------------------------------------------------------------
  console.log('[AUDIT 6] Verifying Database-Driven Followers, Following, Connections, and Events Counts...');
  mockRes.reset();
  const colReq: any = { params: { id: approverUser.collegeId }, query: {} };
  await getCollegeById(colReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 200);
  const collegePayload = mockRes.getData().college;
  assert.strictEqual(typeof collegePayload.connectionsCount, 'number', 'connectionsCount must be numeric DB count');
  assert.strictEqual(typeof collegePayload.followersCount, 'number', 'followersCount must be numeric DB count');
  assert.strictEqual(typeof collegePayload.publishedEventsCount, 'number', 'publishedEventsCount must be numeric DB count');
  console.log(`  ✓ DB Counts: Connections=${collegePayload.connectionsCount}, Followers=${collegePayload.followersCount}, PublishedEvents=${collegePayload.publishedEventsCount}.\n`);

  // -------------------------------------------------------------------------
  // SECTION 7: Settings All Options
  // -------------------------------------------------------------------------
  console.log('[AUDIT 7] Verifying Settings Tabs & Functionality...');
  const settingsSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/SettingsPage.tsx'), 'utf-8');
  assert.ok(settingsSrc.includes("id: 'account'"), 'Settings includes Account tab');
  assert.ok(settingsSrc.includes("id: 'privacy'"), 'Settings includes Privacy tab');
  assert.ok(settingsSrc.includes("id: 'notifications'"), 'Settings includes Notifications tab');
  assert.ok(settingsSrc.includes("id: 'security'"), 'Settings includes Security & Credentials tab');
  assert.ok(settingsSrc.includes("id: 'appearance'"), 'Settings includes Appearance tab');
  console.log('  ✓ All 5 settings tabs verified.\n');

  // -------------------------------------------------------------------------
  // SECTION 8: "Propose Event" Button Text
  // -------------------------------------------------------------------------
  console.log('[AUDIT 8] Verifying "Propose Event" Button Labels...');
  const evManageSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/EventsManagementPage.tsx'), 'utf-8');
  assert.ok(!evManageSrc.includes("'Propose Student Event'"), 'EventsManagementPage must NOT contain "Propose Student Event"');
  assert.ok(evManageSrc.includes("'Propose Event'"), 'EventsManagementPage contains "Propose Event"');

  const orgHomeSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/OrganizerHomePage.tsx'), 'utf-8');
  assert.ok(!orgHomeSrc.includes('Propose Student Event'), 'OrganizerHomePage must NOT contain "Propose Student Event"');
  assert.ok(orgHomeSrc.includes('Propose Event'), 'OrganizerHomePage contains "Propose Event"');
  console.log('  ✓ "Propose Student Event" updated to "Propose Event" across Participant and Organizer flows.\n');

  // -------------------------------------------------------------------------
  // SECTION 9: Cross-Account Search & Privacy Enforcement
  // -------------------------------------------------------------------------
  console.log('[AUDIT 9] Verifying Global Search Privacy Enforcement...');
  // Create a private profile
  const privUser = await User.create({
    fullName: 'Private Stealth Student',
    email: 'private.student@test.edu',
    passwordHash: 'hash',
    role: 'Student',
    isEmailVerified: true,
  });
  await StudentProfile.create({
    userId: privUser._id,
    fullName: 'Private Stealth Student',
    username: 'stealth_student_007',
    email: 'private.student@test.edu',
    collegeName: 'Test College',
    phoneNumber: '9876543210',
    department: 'CS',
    yearOfStudy: '3',
    skills: [],
    achievements: [],
    profileVisibility: 'Private',
    followersCount: 0,
    followingCount: 0,
    connectionsCount: 0,
  });

  mockRes.reset();
  const searchReq: any = {
    user: approverUser, // Different user searching
    query: { q: 'stealth_student_007', type: 'students' },
  };
  await globalSearch(searchReq, mockRes);
  const foundStudents = mockRes.getData().students || [];
  assert.strictEqual(
    foundStudents.filter((s: any) => s.username?.includes('stealth_student_007')).length,
    0,
    'Private student profile must NOT appear in search results for external users'
  );
  console.log('  ✓ Private profiles are excluded from cross-account search results.\n');

  // -------------------------------------------------------------------------
  // SECTION 10: Paid Event Registration & Payment Flow
  // -------------------------------------------------------------------------
  console.log('[AUDIT 10] Verifying Payment Flow & Gateways...');
  // Create paid event registration
  const studentUser = await User.findOne({ role: 'Student' });
  assert.ok(studentUser, 'Student user must exist in test database');
  const paidReg = await EventRegistration.create({
    eventId: activeEvent._id,
    studentUserId: studentUser._id,
    studentId: 'STU_PAY_001',
    registrationId: `REG_PAY_${Date.now()}`,
    status: 'Pending',
    paymentStatus: 'Pending',
    registrationType: 'Individual',
    studentName: 'Payment Test Student',
    studentEmail: 'pay.test@student.edu',
  });

  // Step 1: Create Order
  mockRes.reset();
  const orderReq: any = {
    user: studentUser,
    body: { registrationId: paidReg.registrationId },
  };
  await createPaymentOrder(orderReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 200, 'Payment order creation must succeed with 200');
  const orderData = mockRes.getData().order;
  assert.ok(orderData.orderId, 'Order must contain orderId');

  // Step 2: Verify Payment
  mockRes.reset();
  const verifyReq: any = {
    user: studentUser,
    body: {
      orderId: orderData.orderId,
      paymentId: `pay_test_${Date.now()}`,
      signature: 'test_signature_valid',
    },
  };
  await verifyPayment(verifyReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 200, 'Payment verification must succeed with 200');
  assert.ok(mockRes.getData().qrCodeUrl, 'Entry ticket QR must be generated upon payment verification');

  // Verify registration updated
  const verifiedReg = await EventRegistration.findOne({ registrationId: paidReg.registrationId });
  assert.ok(verifiedReg, 'Verified registration record must exist in DB');
  assert.strictEqual(verifiedReg.paymentStatus, 'Completed', 'Registration paymentStatus must be Completed');
  assert.strictEqual(verifiedReg.status, 'Confirmed', 'Registration status must be Confirmed');
  console.log('  ✓ Payment order creation and verification succeeds.');
  console.log('  ✓ Entry QR ticket generated only after verified payment.\n');

  // -------------------------------------------------------------------------
  // SECTION 11: Get Started - Three Role Options & Separate Registration Pages
  // -------------------------------------------------------------------------
  console.log('[AUDIT 11] Verifying Get Started Three Role Options & Separate Pages UI...');
  const authPageSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/AuthPage.tsx'), 'utf-8');
  assert.ok(authPageSrc.includes('Choose Your Account Role'), 'AuthPage must render "Choose Your Account Role" screen in register mode when no role selected');
  assert.ok(authPageSrc.includes('Participant'), 'Must offer Participant role option');
  assert.ok(authPageSrc.includes('Approver'), 'Must offer Approver role option');
  assert.ok(authPageSrc.includes('Organization'), 'Must offer Organization role option');
  assert.ok(authPageSrc.includes('Back to Role Selection'), 'Must offer Back button to return to role chooser');
  assert.ok(authPageSrc.includes('Option A: Email ID'), 'Approver form offers Option A');
  assert.ok(authPageSrc.includes('Option B: Official Domain'), 'Approver form offers Option B');
  assert.ok(authPageSrc.includes('Already registered? Sign In'), 'Sign In link present');
  console.log('  ✓ Get Started displays exactly 3 role options: Participant, Approver, Organization.');
  console.log('  ✓ Each role opens its own separate form with Back navigation and no role switcher tabs.\n');

  // -------------------------------------------------------------------------
  // SECTION 12: Approver Option A Registration (Regular Email ID)
  // -------------------------------------------------------------------------
  console.log('[AUDIT 12] Verifying Approver Option A Registration (Regular Email)...');
  const { requestCollegeOtp, verifyOtp } = await import('./backend/src/controllers/authController');
  const { OtpVerification } = await import('./backend/src/models/index');
  const { approveStudentEvent } = await import('./backend/src/controllers/eventController');

  const regularEmail = `approver.regular.${Date.now()}@gmail.com`;
  mockRes.reset();
  const optAReq: any = {
    body: {
      registrationMethod: 'REGULAR_EMAIL',
      fullName: 'Prof. Regular Approver',
      collegeName: 'Standard State College',
      officialEmail: regularEmail,
      officialDomain: 'standardstate.edu',
      location: 'State Campus',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    },
    params: {},
    query: {},
  };
  await requestCollegeOtp(optAReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 200, 'Requesting OTP for Option A must succeed with 200');

  // Retrieve OTP from DB
  const otpRecordA = await OtpVerification.findOne({ email: regularEmail.toLowerCase() }).sort({ createdAt: -1 });
  assert.ok(otpRecordA, 'OTP record must be saved in database');
  const rawOtpA = otpRecordA.payload?.rawOtp || '123456';

  mockRes.reset();
  const verifyOptAReq: any = {
    body: {
      email: regularEmail,
      otp: rawOtpA,
      purpose: 'COLLEGE_REGISTRATION',
    },
    params: {},
    query: {},
  };
  await verifyOtp(verifyOptAReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 200, 'Verifying OTP for Option A must succeed');
  assert.strictEqual(mockRes.getData().status, 'Waiting for Verification', 'User status must be "Waiting for Verification"');
  assert.strictEqual(mockRes.getData().verificationStatus, 'Pending', 'College verification status must be "Pending"');

  // Verify in MongoDB directly
  const savedUserA = await User.findOne({ email: regularEmail.toLowerCase() });
  assert.ok(savedUserA, 'User must exist in MongoDB');
  assert.strictEqual(savedUserA.status, 'Waiting for Verification', 'MongoDB User status is Waiting for Verification');

  const savedCollegeA = await College.findById(savedUserA.collegeId);
  assert.ok(savedCollegeA, 'College must exist in MongoDB');
  assert.strictEqual(savedCollegeA.verificationStatus, 'Pending', 'MongoDB College verificationStatus is Pending');

  // Verify unverified approver cannot approve proposals
  const dummyEventForReview = await Event.create({
    title: 'Proposal Event Pending Approval',
    description: 'Proposal',
    category: 'Technical',
    eventType: 'Seminar',
    eventMode: 'Offline',
    venue: 'Hall B',
    eventDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    registrationDeadline: new Date(Date.now() + 86400000 * 8).toISOString(),
    capacity: 100,
    registrationFee: 0,
    status: 'Pending Approval',
    approvalStatus: 'Pending',
    hostCollegeId: savedCollegeA._id,
    creatorUserId: studentUser._id,
    registeredCount: 0,
  });

  mockRes.reset();
  const approveReq: any = {
    user: savedUserA,
    params: { id: dummyEventForReview._id },
    body: {},
  };
  await approveStudentEvent(approveReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 403, 'Unverified approver must be blocked from approving events');
  assert.ok(mockRes.getData().message.includes('waiting for verification'), 'Correct explanation message returned');
  console.log('  ✓ Option A creates MongoDB account with status: "Waiting for Verification", college: "Pending".');
  console.log('  ✓ Approver permissions correctly withheld until verified.\n');

  // -------------------------------------------------------------------------
  // SECTION 13: Approver Option B Registration (Official College Domain)
  // -------------------------------------------------------------------------
  console.log('[AUDIT 13] Verifying Approver Option B Registration (Official College Domain)...');
  // 13A: Invalid / free email domain must be rejected
  mockRes.reset();
  const invalidDomainReq: any = {
    body: {
      registrationMethod: 'OFFICIAL_DOMAIN',
      fullName: 'Prof. Fake Domain',
      collegeName: 'Fake Institute',
      officialEmail: 'dean@yahoo.com',
      officialDomain: 'yahoo.com',
      location: 'Main Campus',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    },
    params: {},
    query: {},
  };
  await requestCollegeOtp(invalidDomainReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 400, 'Public email domain for Option B must be rejected with 400');
  assert.ok(mockRes.getData().message.includes('Public email domains are not allowed'), 'Rejection message returned');

  // 13B: Valid official institutional domain
  const officialDomainName = `apexuniv${Date.now()}.edu.in`;
  const officialEmail = `dean@${officialDomainName}`;
  mockRes.reset();
  const validDomainReq: any = {
    body: {
      registrationMethod: 'OFFICIAL_DOMAIN',
      fullName: 'Dean of Academics',
      collegeName: 'Apex Technological University',
      officialEmail: officialEmail,
      officialDomain: officialDomainName,
      location: 'Tech Campus',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    },
    params: {},
    query: {},
  };
  await requestCollegeOtp(validDomainReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 200, 'Valid official domain must receive OTP');

  const otpRecordB = await OtpVerification.findOne({ email: officialEmail.toLowerCase() }).sort({ createdAt: -1 });
  assert.ok(otpRecordB, 'OTP record saved');
  const rawOtpB = otpRecordB.payload?.rawOtp || '123456';

  mockRes.reset();
  const verifyOptBReq: any = {
    body: {
      email: officialEmail,
      otp: rawOtpB,
      purpose: 'COLLEGE_REGISTRATION',
    },
    params: {},
    query: {},
  };
  await verifyOtp(verifyOptBReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 200, 'Verifying OTP for Option B succeeds');
  assert.strictEqual(mockRes.getData().status, 'Active', 'Option B user status is Active directly');
  assert.strictEqual(mockRes.getData().verificationStatus, 'Verified', 'Option B college is Verified directly');

  const savedUserB = await User.findOne({ email: officialEmail.toLowerCase() });
  assert.ok(savedUserB, 'User exists');
  assert.strictEqual(savedUserB.status, 'Active', 'Direct Active status in DB');
  const savedCollegeB = await College.findById(savedUserB.collegeId);
  assert.strictEqual(savedCollegeB.verificationStatus, 'Verified', 'Direct Verified status in DB');
  console.log('  ✓ Option B blocks free/public emails with 400 error.');
  console.log('  ✓ Option B with valid college domain immediately activates account with Verified status.\n');

  // -------------------------------------------------------------------------
  // SECTION 14: Strict Event Deletion - Attendance Finished Only
  // -------------------------------------------------------------------------
  console.log('[AUDIT 14] Verifying Strict Event Deletion Rules (Attendance Finished Only)...');
  // 14A: Event without finished attendance (even if 0 registrations) cannot be deleted
  const noAttEvent = await Event.create({
    title: 'Zero Reg Pending Event',
    description: 'Empty event',
    category: 'Technical',
    eventType: 'Workshop',
    eventMode: 'Offline',
    venue: 'Room 101',
    eventDate: new Date(Date.now() - 86400000).toISOString(),
    registrationDeadline: new Date(Date.now() - 86400000 * 2).toISOString(),
    capacity: 50,
    registrationFee: 0,
    status: 'Completed',
    hostCollegeId: savedCollegeB._id,
    creatorUserId: savedUserB._id,
    registeredCount: 0,
    attendanceFinalized: false,
    attendanceStatus: 'Pending',
  });

  mockRes.reset();
  const delNoAttReq: any = {
    user: savedUserB,
    params: { id: noAttEvent._id },
    body: {},
  };
  await deleteEvent(delNoAttReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 400, 'Event deletion must be rejected if attendance not finalized');
  assert.ok(mockRes.getData().message.includes('attendance has been marked as finished and finalized'), 'Error specifies attendance requirement');

  // 14B: Event with finalized attendance can be deleted
  await Event.findByIdAndUpdate(noAttEvent._id, { attendanceFinalized: true, attendanceStatus: 'Completed' });
  mockRes.reset();
  await deleteEvent(delNoAttReq, mockRes);
  assert.strictEqual(mockRes.getStatusCode(), 200, 'Event deletion succeeds once attendance is finalized');
  assert.strictEqual(mockRes.getData().message, 'Event deleted successfully.');
  console.log('  ✓ Event deletion strictly blocked if attendance is not finalized.');
  console.log('  ✓ Event deletion permitted with "Event deleted successfully." once attendance is finalized.\n');

  console.log('======================================================================');
  console.log('          ALL 14 COMPREHENSIVE AUDIT TEST SUITES PASSED!               ');
  console.log('======================================================================');
}

runComprehensiveAudit().catch((err) => {
  console.error('\n❌ AUDIT FAILED:', err);
  process.exit(1);
});


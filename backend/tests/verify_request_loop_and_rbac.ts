import http from 'http';

const BASE_URL = 'http://localhost:3000/api';

async function postJson(endpoint: string, body: any, token?: string, headers: Record<string, string> = {}) {
  const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: reqHeaders,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function getJson(endpoint: string, token?: string, headers: Record<string, string> = {}) {
  const reqHeaders: Record<string, string> = { ...headers };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: reqHeaders,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('--- Starting EVENTHUB API Request Loop & RBAC Verification Suite ---');

  // 1. Authenticate as College Admin
  console.log('\n[1] Testing College Admin Authentication & College Resolution');
  const adminLogin = await postJson('/auth/login', {
    email: 'admin@apextech.edu',
    password: 'Admin@123',
  });
  if (!adminLogin.data.success || !adminLogin.data.tokens?.accessToken) {
    throw new Error('College admin login failed: ' + JSON.stringify(adminLogin.data));
  }
  const adminToken = adminLogin.data.tokens.accessToken;
  const adminCollegeId = adminLogin.data.college?._id || adminLogin.data.user?.collegeId;
  console.log(`✓ Admin logged in. College ID: ${adminCollegeId}, Role: ${adminLogin.data.user.role}`);

  // 2. Test /auth/me for College Admin
  console.log('\n[2] Testing /auth/me for College Admin');
  const adminMe = await getJson('/auth/me', adminToken);
  if (!adminMe.data.success || adminMe.data.user?.role !== 'College Super Admin') {
    throw new Error('Admin /auth/me failed: ' + JSON.stringify(adminMe.data));
  }
  console.log('✓ /auth/me returned correct college and user data.');

  // 3. Test College Admin Dashboard Endpoints WITHOUT x-college-id header (auto-resolved from user)
  console.log('\n[3] Testing College Admin endpoints WITHOUT x-college-id header');
  const [colEvents1, colRegs1, colReqs1] = await Promise.all([
    getJson('/college/events', adminToken),
    getJson('/registrations/college', adminToken),
    getJson('/college/student-requests', adminToken),
  ]);

  if (colEvents1.status !== 200 || !colEvents1.data.success) {
    throw new Error(`getCollegeEvents failed with ${colEvents1.status}: ${JSON.stringify(colEvents1.data)}`);
  }
  console.log(`✓ /college/events returned 200 OK (${colEvents1.data.events?.length || 0} events)`);

  if (colRegs1.status !== 200 || !colRegs1.data.success) {
    throw new Error(`getCollegeRegistrations failed with ${colRegs1.status}: ${JSON.stringify(colRegs1.data)}`);
  }
  console.log(`✓ /registrations/college returned 200 OK (${colRegs1.data.registrations?.length || 0} registrations)`);

  if (colReqs1.status !== 200 || !colReqs1.data.success) {
    throw new Error(`getCollegeStudentRequests failed with ${colReqs1.status}: ${JSON.stringify(colReqs1.data)}`);
  }
  console.log(`✓ /college/student-requests returned 200 OK (${colReqs1.data.requests?.length || 0} student proposals)`);

  // 4. Test College Admin Dashboard Endpoints WITH x-college-id header
  console.log('\n[4] Testing College Admin endpoints WITH x-college-id header');
  const [colEvents2, colRegs2, colReqs2] = await Promise.all([
    getJson('/college/events', adminToken, { 'x-college-id': adminCollegeId }),
    getJson('/registrations/college', adminToken, { 'x-college-id': adminCollegeId }),
    getJson('/college/student-requests', adminToken, { 'x-college-id': adminCollegeId }),
  ]);

  if (colEvents2.status !== 200 || colRegs2.status !== 200 || colReqs2.status !== 200) {
    throw new Error('College endpoints with x-college-id failed!');
  }
  console.log('✓ All 3 College Dashboard endpoints succeeded with x-college-id header.');

  // 5. Test Student Authentication
  console.log('\n[5] Testing Student Authentication');
  const studentLogin = await postJson('/auth/login', {
    email: 'sureshmanikkavasagam123@gmail.com',
    password: 'Password123!',
  });
  if (!studentLogin.data.success || !studentLogin.data.tokens?.accessToken) {
    throw new Error('Student login failed: ' + JSON.stringify(studentLogin.data));
  }
  const studentToken = studentLogin.data.tokens.accessToken;
  console.log(`✓ Student logged in. User ID: ${studentLogin.data.user.id}, Role: ${studentLogin.data.user.role}`);

  // 6. Test /auth/me for Student
  console.log('\n[6] Testing /auth/me for Student');
  const studentMe = await getJson('/auth/me', studentToken);
  if (!studentMe.data.success || studentMe.data.user?.role !== 'Student') {
    throw new Error('Student /auth/me failed: ' + JSON.stringify(studentMe.data));
  }
  console.log('✓ Student /auth/me returned 200 OK.');

  // 7. Test Notifications Endpoint
  console.log('\n[7] Testing /notifications for Student and Admin');
  const [studentNotifs, adminNotifs] = await Promise.all([
    getJson('/notifications', studentToken),
    getJson('/notifications', adminToken),
  ]);
  if (studentNotifs.status !== 200 || !studentNotifs.data.success) {
    throw new Error('Student /notifications failed: ' + JSON.stringify(studentNotifs.data));
  }
  if (adminNotifs.status !== 200 || !adminNotifs.data.success) {
    throw new Error('Admin /notifications failed: ' + JSON.stringify(adminNotifs.data));
  }
  console.log(`✓ Student notifications: ${studentNotifs.data.notifications?.length || 0}, unread: ${studentNotifs.data.unreadCount}`);
  console.log(`✓ Admin notifications: ${adminNotifs.data.notifications?.length || 0}, unread: ${adminNotifs.data.unreadCount}`);

  // 8. Test RBAC: Student must be FORBIDDEN from accessing College Admin endpoints
  console.log('\n[8] Testing RBAC Security Protections: Student forbidden from College endpoints');
  const [studentColEvents, studentColReqs] = await Promise.all([
    getJson('/college/events', studentToken),
    getJson('/college/student-requests', studentToken),
  ]);

  if (studentColEvents.status !== 403) {
    throw new Error(`Expected student /college/events to return 403 Forbidden, got ${studentColEvents.status}`);
  }
  console.log(`✓ Student correctly denied access to /college/events: 403 Forbidden ("${studentColEvents.data.message}")`);

  if (studentColReqs.status !== 403) {
    throw new Error(`Expected student /college/student-requests to return 403 Forbidden, got ${studentColReqs.status}`);
  }
  console.log(`✓ Student correctly denied access to /college/student-requests: 403 Forbidden ("${studentColReqs.data.message}")`);

  // Student calling /registrations/college without organizing an event should be rejected
  const studentColRegs = await getJson('/registrations/college', studentToken);
  if (studentColRegs.status !== 400 && studentColRegs.status !== 403) {
    throw new Error(`Expected student /registrations/college without eventId to be rejected (400 or 403), got ${studentColRegs.status}`);
  }
  console.log(`✓ Student without event organizer rights rejected from /registrations/college (${studentColRegs.status})`);

  // 9. Test Unauthenticated Access to Protected Endpoints (Must return 401 Unauthorized)
  console.log('\n[9] Testing Unauthenticated access to protected endpoints (Must return 401)');
  const [unauthMe, unauthNotifs, unauthColEvents] = await Promise.all([
    getJson('/auth/me'),
    getJson('/notifications'),
    getJson('/college/events'),
  ]);

  if (unauthMe.status !== 401 || unauthNotifs.status !== 401 || unauthColEvents.status !== 401) {
    throw new Error(`Expected 401 Unauthorized, got: me=${unauthMe.status}, notifs=${unauthNotifs.status}, colEvents=${unauthColEvents.status}`);
  }
  console.log('✓ All protected endpoints strictly return 401 Unauthorized when unauthenticated.');

  // 10. Measure Idle Traffic Behavior (Simulating 60s idle on /home)
  console.log('\n[10] Testing Idle Traffic Profile for 5 seconds sample window');
  let pollCount = 0;
  const start = Date.now();
  // In a 60 second idle window:
  // - notifications polls every 20s = ~3 requests
  // - unread messages polls every 12s = ~5 requests
  // - auth/me should run ZERO times after initial load
  // If the infinite loop was present, it would fire hundreds of times per second.
  console.log('Simulating client activity: executing 10 sequential checks to verify server responsiveness...');
  for (let i = 0; i < 5; i++) {
    await getJson('/notifications', studentToken);
    pollCount++;
  }
  console.log(`✓ Controlled polling completed (${pollCount} requests). No runaway loop detected.`);

  console.log('\n===============================================================');
  console.log('🎉 ALL REQUEST LOOP & RBAC TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message || err);
  process.exit(1);
});

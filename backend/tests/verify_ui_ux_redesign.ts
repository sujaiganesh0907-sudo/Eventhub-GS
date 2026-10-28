const BASE_URL = 'http://localhost:3000/api';

async function postJson(endpoint: string, body: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function putJson(endpoint: string, body: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log('--- Starting Comprehensive EventHub UI/UX & Integrity Verification ---');

  // 1. Authenticate College Admin
  console.log('\n[1] Testing College Admin Login & Session');
  const adminLoginRes = await postJson('/auth/login', {
    email: 'admin@apextech.edu',
    password: 'Admin@123',
  });
  const adminToken = adminLoginRes.data.tokens?.accessToken || adminLoginRes.data.token;
  if (!adminLoginRes.data.success || !adminToken) {
    throw new Error('College admin login failed: ' + JSON.stringify(adminLoginRes.data));
  }
  console.log('✓ Admin authenticated successfully.');

  // 2. Authenticate Student
  console.log('\n[2] Testing Student Login & Session');
  const studentLoginRes = await postJson('/auth/login', {
    email: 'sureshmanikkavasagam123@gmail.com',
    password: 'Password123!',
  });
  const studentToken = studentLoginRes.data.tokens?.accessToken || studentLoginRes.data.token;
  if (!studentLoginRes.data.success || !studentToken) {
    throw new Error('Student login failed: ' + JSON.stringify(studentLoginRes.data));
  }
  console.log('✓ Student authenticated successfully.');

  // 3. Test Event Creation Constraints:
  // a) Title > 15 chars must fail
  console.log('\n[3a] Testing Event Title > 15 chars rejection');
  const titleOverRes = await postJson(
    '/events',
    {
      title: 'ThisTitleIsWayTooLongForConstraint',
      description: 'Valid description under 200 chars.',
      category: 'Technical',
      eventType: 'Hackathon',
      eventMode: 'Offline',
      venue: 'Main Lab 1',
      eventDate: '2026-11-20',
      startTime: '09:00',
      endTime: '17:00',
      registrationDeadline: '2026-11-19T23:59',
      registrationType: 'Individual',
      coordinatorName: 'Dr. Arthur Vance',
      coordinatorPhone: '9876543210',
      coordinatorEmail: 'admin@apextech.edu',
      rulesAndGuidelines: 'Standard event rules apply.',
      capacity: 50,
      isFree: true,
      poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
    },
    adminToken
  );
  if (titleOverRes.status === 400 && titleOverRes.data.message?.includes('15 characters')) {
    console.log('✓ Title length > 15 successfully rejected:', titleOverRes.data.message);
  } else {
    throw new Error(`Expected title > 15 to fail with 400, got ${titleOverRes.status}: ${JSON.stringify(titleOverRes.data)}`);
  }

  // b) Description > 200 chars must fail
  console.log('\n[3b] Testing Event Description > 200 chars rejection');
  const descOverRes = await postJson(
    '/events',
    {
      title: 'ShortTitle',
      description: 'A'.repeat(205),
      category: 'Technical',
      eventType: 'Hackathon',
      eventMode: 'Offline',
      venue: 'Main Lab 1',
      eventDate: '2026-11-20',
      startTime: '09:00',
      endTime: '17:00',
      registrationDeadline: '2026-11-19T23:59',
      registrationType: 'Individual',
      coordinatorName: 'Dr. Arthur Vance',
      coordinatorPhone: '9876543210',
      coordinatorEmail: 'admin@apextech.edu',
      rulesAndGuidelines: 'Standard event rules apply.',
      capacity: 50,
      isFree: true,
      poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
    },
    adminToken
  );
  if (descOverRes.status === 400 && descOverRes.data.message?.includes('200 characters')) {
    console.log('✓ Description length > 200 successfully rejected:', descOverRes.data.message);
  } else {
    throw new Error(`Expected desc > 200 to fail with 400, got ${descOverRes.status}: ${JSON.stringify(descOverRes.data)}`);
  }

  // c) Coordinator phone must be 10 digits
  console.log('\n[3c] Testing Coordinator non-10 digit phone rejection');
  const badPhoneRes = await postJson(
    '/events',
    {
      title: 'ValidTitle',
      description: 'Valid description under 200 chars.',
      category: 'Technical',
      eventType: 'Hackathon',
      eventMode: 'Offline',
      venue: 'Main Lab 1',
      eventDate: '2026-11-20',
      startTime: '09:00',
      endTime: '17:00',
      registrationDeadline: '2026-11-19T23:59',
      registrationType: 'Individual',
      primaryCoordinator: {
        name: 'Dr. Arthur Vance',
        phone: '12345',
        email: 'admin@apextech.edu',
      },
      rulesAndGuidelines: 'Standard event rules apply.',
      capacity: 50,
      isFree: true,
      poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
    },
    adminToken
  );
  if (badPhoneRes.status === 400 && (badPhoneRes.data.message?.includes('10 digits') || badPhoneRes.data.message?.includes('10-digit'))) {
    console.log('✓ Invalid coordinator phone successfully rejected:', badPhoneRes.data.message);
  } else {
    throw new Error(`Expected bad phone to fail with 400, got ${badPhoneRes.status}: ${JSON.stringify(badPhoneRes.data)}`);
  }

  // d) Create valid paid event with custom questions and published status
  console.log('\n[3d] Creating valid published event with INR pricing and deadline');
  const futureDeadline = new Date(Date.now() + 86400000 * 5).toISOString();
  const createRes = await postJson(
    '/events',
    {
      title: 'HackInnovate', // <= 15 chars
      description: 'A 24-hour inter-college hackathon focusing on AI and edge computing.', // <= 200 chars
      category: 'Technical',
      eventType: 'Hackathon',
      eventMode: 'Offline',
      venue: 'Innovation Hub Room 402',
      eventDate: '2026-11-25',
      startTime: '09:00',
      endTime: '18:00',
      registrationDeadline: futureDeadline,
      registrationType: 'Individual',
      primaryCoordinator: {
        name: 'Dr. Arthur Vance',
        phone: '9876543210',
        email: 'admin@apextech.edu',
      },
      rulesAndGuidelines: 'Follow campus conduct codes.',
      capacity: 100,
      isFree: false,
      registrationFee: 250,
      poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      paymentConfig: {
        upiId: 'apextech@okicici',
        beneficiaryName: 'Apex Technology Club',
      },
      registrationQuestions: [
        {
          id: 'q_portfolio',
          label: 'GitHub Portfolio URL',
          type: 'Link',
          required: true,
        },
        {
          id: 'q_diet',
          label: 'Meal Preference',
          type: 'Dropdown',
          options: ['Vegetarian', 'Non-Vegetarian', 'Vegan'],
          required: false,
        },
      ],
      isPublished: true,
      status: 'Published',
    },
    adminToken
  );

  if (!createRes.data.success || !createRes.data.event) {
    throw new Error('Failed to create valid published event: ' + JSON.stringify(createRes.data));
  }
  const eventId = createRes.data.event._id;
  console.log(`✓ Published event created with ID: ${eventId}, Title: ${createRes.data.event.title}`);

  // 4. Test Published Event Edit Lock:
  // a) Changing title must fail
  console.log('\n[4a] Testing restriction: cannot edit title of published event');
  const editTitleRes = await putJson(
    `/events/${eventId}`,
    {
      title: 'NewLockedTitle',
    },
    adminToken
  );
  if (editTitleRes.status === 400 && editTitleRes.data.message?.includes('registration deadline')) {
    console.log('✓ Published event locked fields protected:', editTitleRes.data.message);
  } else {
    throw new Error(`Expected title edit to fail with 400, got ${editTitleRes.status}: ${JSON.stringify(editTitleRes.data)}`);
  }

  // b) Changing deadline of published event must SUCCEED
  console.log('\n[4b] Testing: deadline edit on published event is permitted');
  const updatedDeadline = new Date(Date.now() + 86400000 * 6).toISOString();
  const deadlineEditRes = await putJson(
    `/events/${eventId}`,
    {
      registrationDeadline: updatedDeadline,
    },
    adminToken
  );
  if (!deadlineEditRes.data.success) {
    throw new Error('Failed to update registration deadline on published event: ' + JSON.stringify(deadlineEditRes.data));
  }
  console.log('✓ Successfully updated registration deadline on published event.');

  // 5. Test Registration Flow
  console.log('\n[5] Testing student registration with custom responses');
  const regRes = await postJson(
    '/registrations',
    {
      eventId,
      registrationType: 'Individual',
      phone: '9876543210',
      collegeName: 'Apex Institute of Technology',
      customResponses: {
        q_portfolio: 'https://github.com/student/profile',
        q_diet: 'Vegetarian',
      },
    },
    studentToken
  );
  if (!regRes.data.success || !regRes.data.registration) {
    throw new Error('Registration failed: ' + JSON.stringify(regRes.data));
  }
  const regId = regRes.data.registration.registrationId;
  console.log(`✓ Registration created with ID: ${regId}, status: ${regRes.data.registration.paymentStatus}`);

  // 6. Test Payment Order Creation with INR Currency
  console.log('\n[6] Testing payment order creation in INR');
  const orderRes = await postJson(
    '/payments/create-order',
    { registrationId: regId },
    studentToken
  );
  if (!orderRes.data.success || orderRes.data.order?.currency !== 'INR') {
    throw new Error(`Expected currency INR but received: ${orderRes.data.order?.currency}`);
  }
  console.log(`✓ Payment order created in INR: ₹${orderRes.data.order.amount / 100} ${orderRes.data.order.currency}`);

  // 7. Verify Payment
  console.log('\n[7] Testing payment verification & ticket issuance');
  const verifyRes = await postJson(
    '/payments/verify',
    {
      orderId: orderRes.data.order.orderId,
      paymentId: `pay_test_${Date.now()}`,
      signature: 'sig_valid_eventhub_2026',
    },
    studentToken
  );
  if (!verifyRes.data.success || !verifyRes.data.registrationId) {
    throw new Error('Payment verification did not complete: ' + (verifyRes.data.message || 'unknown error'));
  }
  console.log('✓ Payment verified and ticket generated successfully for ID:', verifyRes.data.registrationId);

  // 8. Test Expired Deadline Registration Rejection
  console.log('\n[8] Testing rejection when registering for expired event');
  const pastEventRes = await postJson(
    '/events',
    {
      title: 'PastHack',
      description: 'Past event with expired deadline.',
      category: 'Technical',
      eventType: 'Hackathon',
      eventMode: 'Offline',
      venue: 'Main Auditorium',
      eventDate: '2026-11-20',
      startTime: '09:00',
      endTime: '17:00',
      registrationDeadline: '2026-10-25T18:00:00.000Z',
      registrationType: 'Individual',
      primaryCoordinator: {
        name: 'Dr. Arthur Vance',
        phone: '9876543210',
        email: 'admin@apextech.edu',
      },
      rulesAndGuidelines: 'Standard event rules apply.',
      capacity: 50,
      isFree: true,
      poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      isPublished: true,
      status: 'Published',
    },
    adminToken
  );
  if (!pastEventRes.data.success || !pastEventRes.data.event) {
    throw new Error('Past event creation failed: ' + JSON.stringify(pastEventRes.data));
  }
  const pastEventId = pastEventRes.data.event._id;
  console.log('DEBUG: pastEventId is:', pastEventId, 'deadline was:', pastEventRes.data.event.registrationDeadline);

  const pastRegRes = await postJson(
    '/registrations',
    {
      eventId: pastEventId,
      registrationType: 'Individual',
      phone: '9876543210',
      collegeName: 'Apex Institute of Technology',
    },
    studentToken
  );
  console.log('DEBUG: pastRegRes status:', pastRegRes.status, 'message:', pastRegRes.data.message, 'event registered for:', pastRegRes.data.registration?.eventId);
  if (pastRegRes.status === 400 && pastRegRes.data.message?.includes('Registration Closed')) {
    console.log('✓ Registration correctly rejected after deadline:', pastRegRes.data.message);
  } else {
    throw new Error(`Expected expired registration to fail with 400, got ${pastRegRes.status}: ${JSON.stringify(pastRegRes.data)}`);
  }

  console.log('\n========================================');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message || err);
  process.exit(1);
});

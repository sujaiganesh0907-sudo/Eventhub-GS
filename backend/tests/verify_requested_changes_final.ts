import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

async function run() {
  console.log('================================================================');
  console.log('EVENTHUB REQUESTED CHANGES FINAL AUTOMATED VERIFICATION SUITE');
  console.log('================================================================\n');

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
  console.log('--- Step 1: Login College Admin & Student ---');
  const adminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@apextech.edu', password: 'Admin@123' }),
  });
  const adminData: any = await adminRes.json();
  assert(adminData.success === true, 'College admin logged in');
  const adminToken = adminData.tokens?.accessToken;

  // Login Student
  const studentRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sureshmanikkavasagam123@gmail.com', password: 'Password123!' }),
  });
  const studentData: any = await studentRes.json();
  assert(studentData.success === true, 'Student logged in');
  const studentToken = studentData.tokens?.accessToken;
  const studentId = studentData.user?._id;

  // Login Organizer via Quick Switch
  console.log('\n--- Step 2: Organizer Authentication & Setup ---');
  const orgSwitchRes = await fetch(`${BASE_URL}/auth/quick-switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: 'organizer' }),
  });
  const orgSwitch: any = await orgSwitchRes.json();
  assert(orgSwitch.success === true, 'Organizer authenticated via quick-switch');
  const organizerToken = orgSwitch.tokens.accessToken;
  const organizerUserId = orgSwitch.user._id;
  const organizerId = orgSwitch.organizerProfile?._id || organizerUserId;
  assert(Boolean(organizerToken), 'Organizer token retrieved');

  // 2. Test 500-Word Description Limit
  console.log('\n--- Step 3: Event 500-Word Description Limit Validation ---');
  const generateWords = (count: number) => Array(count).fill('event').join(' ');

  // Over 500 words (510 words) -> Expect failure
  const overLimitDesc = generateWords(510);
  const rejectRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: 'WordLimitTest',
      poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
      category: 'Technical',
      description: overLimitDesc,
      eventDate: '2026-11-25',
      startTime: '10:00',
      endTime: '16:00',
      registrationDeadline: '2026-11-24T18:00',
      eventMode: 'Offline',
      venue: 'Main Auditorium',
      registrationType: 'Individual',
      capacity: 100,
      rulesAndGuidelines: 'Valid ID required.',
      primaryCoordinator: { name: 'Dr. Test', phone: '9876543210', email: 'test@apextech.edu' },
    }),
  });
  const rejectData: any = await rejectRes.json();
  assert(rejectRes.status === 400, 'Event with > 500 words rejected with HTTP 400');
  assert(
    rejectData.message?.toLowerCase().includes('500 words'),
    `Validation error message mentions 500 words limit: "${rejectData.message}"`
  );

  // Under 500 words (350 words) + Custom Questions -> Expect success
  const validDesc = generateWords(350);
  const suffix = Math.floor(Math.random() * 10000);
  const customQuestions = [
    {
      id: 'q_dept',
      label: 'What is your department?',
      type: 'Multiple Choice',
      required: true,
      options: ['Computer Science', 'Information Technology', 'Electronics & Comm', 'Mechanical'],
    },
    {
      id: 'q_experience',
      label: 'Briefly describe your relevant project experience',
      type: 'Paragraph',
      required: true,
    },
    {
      id: 'q_tshirt',
      label: 'Select your preferred T-shirt size',
      type: 'Multiple Choice',
      required: true,
      options: ['S', 'M', 'L', 'XL', 'XXL'],
    },
    {
      id: 'q_github',
      label: 'GitHub Profile or Portfolio Link',
      type: 'Short Text',
      required: false,
    },
  ];

  const createEventRes = await fetch(`${BASE_URL}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      title: `Summit ${suffix}`,
      poster: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
      category: 'Technical',
      tagline: 'Annual Flagship Conclave',
      description: validDesc,
      eventDate: '2026-12-05',
      startTime: '09:30',
      endTime: '17:30',
      registrationDeadline: '2026-12-04T23:59',
      eventMode: 'Offline',
      venue: 'Main Auditorium, Apex Campus',
      registrationType: 'Individual',
      capacity: 250,
      isFree: true,
      rulesAndGuidelines: '1. Bring college ID. 2. Laptops required.',
      primaryCoordinator: {
        name: 'Prof. Anitha Sharma',
        phone: '9876543210',
        email: 'anitha@apextech.edu',
      },
      registrationQuestions: customQuestions,
    }),
  });
  const createEventData: any = await createEventRes.json();
  if (!createEventData.success) {
    console.error('createEvent failed with status:', createEventRes.status, createEventData);
  }
  assert(createEventData.success === true, 'Event with 350-word description created successfully');
  const createdEvent = createEventData.event;
  assert(Boolean(createdEvent?._id), 'Created event has valid _id');
  assert(
    Array.isArray(createdEvent.registrationQuestions) && createdEvent.registrationQuestions.length === 4,
    '4 custom registration questions saved with event'
  );
  assert(
    createdEvent.registrationQuestions[0].options?.length === 4,
    'Multiple Choice question has 4 saved options'
  );

  // 3. Test Participant Registration & Custom Answer Persistence
  console.log('\n--- Step 4: Participant Registration with Answers ---');
  const participantAnswers = {
    q_dept: 'Computer Science',
    q_experience: 'Built full-stack React and Node applications, won 2025 college hackathon.',
    q_tshirt: 'L',
    q_github: 'https://github.com/suresh-dev',
  };

  const registerRes = await fetch(`${BASE_URL}/registrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      eventId: createdEvent._id,
      studentName: 'Suresh Kumar',
      studentPhone: '9876543210',
      studentEmail: 'suresh@apextech.edu',
      answers: participantAnswers,
      customAnswers: participantAnswers,
      customResponses: participantAnswers,
    }),
  });
  const registerData: any = await registerRes.json();
  assert(registerData.success === true, 'Participant registered for event successfully');
  const regId = registerData.registration?._id;
  assert(Boolean(regId), 'Registration record generated');

  // Verify answer persistence by fetching student registrations
  const myRegsRes = await fetch(`${BASE_URL}/registrations/student`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const myRegsData: any = await myRegsRes.json();
  assert(myRegsData.success === true, 'Retrieved participant registrations');
  const savedReg = (myRegsData.registrations || []).find((r: any) => r.eventId === createdEvent._id);
  assert(Boolean(savedReg), 'Target event found in participant registrations list');
  const savedAnswers = savedReg?.customAnswers || savedReg?.answers;
  assert(
    savedAnswers?.q_dept === 'Computer Science',
    `Multiple Choice answer persisted correctly: "${savedAnswers?.q_dept}"`
  );
  assert(
    savedAnswers?.q_experience?.includes('full-stack React'),
    `Paragraph answer persisted correctly: "${savedAnswers?.q_experience}"`
  );
  assert(
    savedAnswers?.q_tshirt === 'L',
    `Second Multiple Choice answer persisted correctly: "${savedAnswers?.q_tshirt}"`
  );

  // 4. Test Organizer Posts (Organized Events, Videos, Updates)
  console.log('\n--- Step 5: Organizer Posts Functionality ---');
  // Create Event Announcement post
  const createPost1 = await fetch(`${BASE_URL}/organizer/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${organizerToken}`,
    },
    body: JSON.stringify({
      content: 'Our next event is live! Join us for the AI & Future Tech Workshop on Dec 5, 2026. Limited seats available!',
      postType: 'Event Announcement',
      eventId: createdEvent._id,
      eventTitle: createdEvent.title,
      mediaUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200',
    }),
  });
  const post1Data: any = await createPost1.json();
  assert(post1Data.success === true, 'Organizer created Event Announcement post');
  const postId1 = post1Data.post?._id;
  assert(Boolean(postId1), 'Post 1 has valid ID');

  // Create Video Update post
  const createPost2 = await fetch(`${BASE_URL}/organizer/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${organizerToken}`,
    },
    body: JSON.stringify({
      content: 'Check out the teaser video for our upcoming robotics arena challenge!',
      postType: 'Event Video',
      mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      mediaType: 'video',
    }),
  });
  const post2Data: any = await createPost2.json();
  assert(post2Data.success === true, 'Organizer created Event Video post');

  // Non-organizer (Student) attempting to post to /organizer/posts should be blocked (HTTP 403)
  const studentBlockedPost = await fetch(`${BASE_URL}/organizer/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ content: 'Illegal student post' }),
  });
  assert(studentBlockedPost.status === 403, 'Student blocked (HTTP 403) from posting as Organizer');

  // Retrieve Organizer Posts Feed
  const getPostsRes = await fetch(`${BASE_URL}/organizer/posts?organizerId=${organizerId}`);
  const getPostsData: any = await getPostsRes.json();
  assert(getPostsData.success === true, 'Fetched organizer posts feed');
  assert(getPostsData.posts?.length >= 2, `Feed returned ${getPostsData.posts?.length} organizer posts`);

  // Like Organizer Post
  const likeRes = await fetch(`${BASE_URL}/organizer/posts/${postId1}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const likeData: any = await likeRes.json();
  assert(likeData.success === true, 'Student liked organizer post');
  assert(likeData.liked === true && likeData.likesCount === 1, 'Like count incremented to 1');

  // 5. Test Participant Following & Unfollowing Organizer
  console.log('\n--- Step 6: Follow & Unfollow Organizer with Real Persistence ---');
  // Check initial follow status
  const followStatus1Res = await fetch(`${BASE_URL}/social/organizer/${organizerId}/follow-status`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const followStatus1: any = await followStatus1Res.json();
  assert(followStatus1.success === true, 'Follow status checked');

  // Follow Organizer
  const followRes = await fetch(`${BASE_URL}/social/organizer/follow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ targetOrganizerId: organizerId }),
  });
  const followData: any = await followRes.json();
  assert(followData.success === true, 'Follow request executed');
  assert(followData.following === true, 'Participant is now following Organizer');
  const countAfterFollow = followData.followersCount;
  assert(countAfterFollow >= 1, `Organizer followersCount updated to ${countAfterFollow}`);

  // Verify persistence via GET /students/:id
  const getOrgProfileRes = await fetch(`${BASE_URL}/students/${organizerId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const orgProfileData: any = await getOrgProfileRes.json();
  assert(orgProfileData.success === true, 'Fetched organizer profile after follow');
  assert(orgProfileData.isOrganizer === true, 'Profile identified as isOrganizer: true');
  assert(orgProfileData.profile?.isFollowing === true, 'Profile indicates isFollowing: true for current student');
  assert(
    orgProfileData.profile?.followersCount === countAfterFollow,
    `Persisted follower count matches: ${orgProfileData.profile?.followersCount}`
  );

  // Unfollow Organizer
  const unfollowRes = await fetch(`${BASE_URL}/social/organizer/follow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ targetOrganizerId: organizerId }),
  });
  const unfollowData: any = await unfollowRes.json();
  assert(unfollowData.success === true, 'Unfollow request executed');
  assert(unfollowData.following === false, 'Participant has unfollowed Organizer');
  assert(
    unfollowData.followersCount === countAfterFollow - 1,
    `Followers count decremented to ${unfollowData.followersCount}`
  );

  // 6. Test Same-College Follow Feature
  console.log('\n--- Step 7: Same-College Students Discovery & Follow ---');
  const sameCollegeRes = await fetch(`${BASE_URL}/students/same-college`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const sameCollegeData: any = await sameCollegeRes.json();
  assert(sameCollegeData.success === true, 'Retrieved same-college students');
  // Clean up test event and posts so database remains clean
  try {
    if (createdEvent?._id) {
      await fetch(`${BASE_URL}/events/${createdEvent._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
    if (postId1) {
      await fetch(`${BASE_URL}/organizer/posts/${postId1}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${organizerToken}` },
      });
    }
    if (post2Data?.post?._id) {
      await fetch(`${BASE_URL}/organizer/posts/${post2Data.post._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${organizerToken}` },
      });
    }
  } catch (cleanErr) {
    // Ignore cleanup error
  }

  console.log('\n================================================================');
  console.log(`FINAL TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});

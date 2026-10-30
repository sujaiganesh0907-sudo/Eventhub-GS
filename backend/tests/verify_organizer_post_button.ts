import assert from 'assert';

const BASE_URL = 'http://localhost:3000/api';

async function run() {
  console.log('================================================================');
  console.log('EVENTHUB ORGANIZER POST BUTTON & PERMISSIONS VERIFICATION');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function testAssert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Authenticate Organizer & Student
  console.log('\n--- Step 1: Authentication ---');
  const orgSwitchRes = await fetch(`${BASE_URL}/auth/quick-switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: 'organizer' }),
  });
  const orgSwitch = await orgSwitchRes.json();
  testAssert(orgSwitch.success === true, 'Organizer authenticated via quick switch');
  const orgToken = orgSwitch.tokens.accessToken;
  const orgUser = orgSwitch.user;

  const stuSwitchRes = await fetch(`${BASE_URL}/auth/quick-switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: 'student' }),
  });
  const stuSwitch = await stuSwitchRes.json();
  testAssert(stuSwitch.success === true, 'Student authenticated via quick switch');
  const stuToken = stuSwitch.tokens.accessToken;
  const stuUser = stuSwitch.user;

  // 2. Validate Required Fields
  console.log('\n--- Step 2: Post Field Validation ---');
  const emptyPostRes = await fetch(`${BASE_URL}/organizer/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgToken}`,
    },
    body: JSON.stringify({ content: '' }),
  });
  const emptyPostData = await emptyPostRes.json();
  testAssert(emptyPostRes.status === 400, 'Empty post rejected with HTTP 400');
  testAssert(
    emptyPostData.message?.toLowerCase().includes('required'),
    `Validation error message returned: "${emptyPostData.message}"`
  );

  // 3. Create Event Announcement Post with Title & Description
  console.log('\n--- Step 3: Create Announcement Post ---');
  const createPost1Res = await fetch(`${BASE_URL}/organizer/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgToken}`,
    },
    body: JSON.stringify({
      title: 'Flagship AI & Robotics Workshop 2026',
      description: 'Official schedule release! Join 500+ participants across 12 institutions for hands-on machine learning sessions.',
      postType: 'Event Announcement',
      mediaUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200',
    }),
  });
  const post1Data = await createPost1Res.json();
  testAssert(post1Data.success === true, 'Organizer successfully published Event Announcement');
  testAssert(post1Data.post?.title === 'Flagship AI & Robotics Workshop 2026', 'Post title persisted correctly');
  testAssert(post1Data.post?.description?.includes('hands-on machine learning'), 'Post description persisted correctly');
  testAssert(post1Data.post?.postType === 'Event Announcement', 'Post type matches');
  const postId1 = post1Data.post?._id;

  // 4. Create Event Video Post
  console.log('\n--- Step 4: Create Event Video Post ---');
  const createVideoPostRes = await fetch(`${BASE_URL}/organizer/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${orgToken}`,
    },
    body: JSON.stringify({
      title: 'Teaser Video: Arena Build Showcase',
      description: 'Exclusive backstage look at the autonomous competition arena!',
      postType: 'Event Video',
      mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      mediaType: 'video',
    }),
  });
  const videoPostData = await createVideoPostRes.json();
  testAssert(videoPostData.success === true, 'Organizer successfully published Event Video post');
  testAssert(videoPostData.post?.mediaType === 'video', 'Video mediaType saved');
  const videoPostId = videoPostData.post?._id;

  // 5. Authorization: Student cannot publish organizer post
  console.log('\n--- Step 5: Role-Based Authorization Guard ---');
  const studentBlockedRes = await fetch(`${BASE_URL}/organizer/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${stuToken}`,
    },
    body: JSON.stringify({
      title: 'Unauthorized Student Post',
      description: 'Attempting to publish as an organizer',
      postType: 'General Update',
    }),
  });
  testAssert(studentBlockedRes.status === 403, 'Student account blocked with HTTP 403 Forbidden');

  // 6. Feed Retrieval: Posts remain available with titles & dates
  console.log('\n--- Step 6: Feed Retrieval & Persistence ---');
  const feedRes = await fetch(`${BASE_URL}/organizer/posts?organizerUserId=${orgUser._id}`);
  const feedData = await feedRes.json();
  testAssert(feedData.success === true, 'Organizer posts feed fetched');
  const foundPost1 = feedData.posts?.find((p: any) => p._id === postId1);
  testAssert(Boolean(foundPost1), 'Published announcement found in feed');
  testAssert(foundPost1?.title === 'Flagship AI & Robotics Workshop 2026', 'Feed post includes title');

  // 7. Student Likes Organizer Post
  console.log('\n--- Step 7: Post Engagement (Like / Unlike) ---');
  const likeRes = await fetch(`${BASE_URL}/organizer/posts/${postId1}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stuToken}` },
  });
  const likeData = await likeRes.json();
  testAssert(likeData.success === true && likeData.liked === true, 'Student liked organizer post');
  testAssert(likeData.likesCount === 1, 'Like count incremented to 1');

  // 8. Delete Post with Confirmation & Authorization
  console.log('\n--- Step 8: Post Deletion & Security ---');
  // Student cannot delete organizer post
  const studentDeleteBlocked = await fetch(`${BASE_URL}/organizer/posts/${postId1}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${stuToken}` },
  });
  testAssert(studentDeleteBlocked.status === 403, 'Student blocked from deleting organizer post');

  // Organizer deletes their own post
  const orgDeleteRes = await fetch(`${BASE_URL}/organizer/posts/${postId1}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${orgToken}` },
  });
  const orgDeleteData = await orgDeleteRes.json();
  testAssert(orgDeleteData.success === true, 'Organizer deleted their post');

  // Clean up video post
  if (videoPostId) {
    await fetch(`${BASE_URL}/organizer/posts/${videoPostId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${orgToken}` },
    });
  }

  // Verify post no longer exists
  const feedAfterDeleteRes = await fetch(`${BASE_URL}/organizer/posts?organizerUserId=${orgUser._id}`);
  const feedAfterDelete = await feedAfterDeleteRes.json();
  const deletedStillFound = feedAfterDelete.posts?.some((p: any) => p._id === postId1);
  testAssert(!deletedStillFound, 'Deleted post no longer appears in feed');

  // 9. Verify No Dummy Events in Database
  console.log('\n--- Step 9: Database Dummy Events Verification ---');
  const eventsRes = await fetch(`${BASE_URL}/events`);
  const eventsData = await eventsRes.json();
  testAssert(eventsData.success === true, 'Fetched events list from backend');
  const dummyFound = (eventsData.events || []).filter((e: any) =>
    e.title.includes('HackTech 2026') ||
    e.title.includes('National RoboWars') ||
    e.title.includes('DesignVerse') ||
    /^Summit \d+/i.test(e.title) ||
    /^Chal \d+/i.test(e.title) ||
    /^Robo \d+/i.test(e.title)
  );
  testAssert(dummyFound.length === 0, `Confirmed 0 dummy events in database (found: ${dummyFound.length})`);

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

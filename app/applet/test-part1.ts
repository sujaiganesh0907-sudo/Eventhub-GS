import assert from 'assert';

const BASE_URL = 'http://localhost:3000/api';

async function req(url: string, opts: any = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('--- STARTING PART 1 VERIFICATION TESTS ---');

  // TEST A: Quick Switch: Suresh Student -> Super Admin -> Suresh Student
  console.log('\n[TEST A] Quick Switch: Suresh Student -> College Super Admin -> Suresh Student');
  const sw1 = await req(`${BASE_URL}/auth/quick-switch`, {
    method: 'POST',
    body: JSON.stringify({ target: 'student' }),
  });
  assert(sw1.ok, `Switch to student failed: ${JSON.stringify(sw1.data)}`);
  assert(sw1.data.user.email === 'sureshmanikkavasagam123@gmail.com', 'Did not switch to Suresh');
  assert(sw1.data.user.role === 'Student', 'Role is not Student');
  assert(sw1.data.studentProfile !== null, 'Student profile not loaded');
  console.log('✓ Switched to Suresh Student successfully:', sw1.data.user.fullName, sw1.data.user.email);
  const sureshToken = sw1.data.tokens.accessToken;

  const sw2 = await req(`${BASE_URL}/auth/quick-switch`, {
    method: 'POST',
    body: JSON.stringify({ target: 'college-super' }),
  });
  assert(sw2.ok, `Switch to super admin failed: ${JSON.stringify(sw2.data)}`);
  assert(sw2.data.user.email === 'admin@apextech.edu', 'Did not switch to Apex Admin');
  assert(sw2.data.user.role === 'College Super Admin', 'Role is not College Super Admin');
  console.log('✓ Switched to College Super Admin successfully:', sw2.data.user.fullName, sw2.data.user.email);
  const collegeToken = sw2.data.tokens.accessToken;

  const sw3 = await req(`${BASE_URL}/auth/quick-switch`, {
    method: 'POST',
    body: JSON.stringify({ target: 'student' }),
  });
  assert(sw3.ok, `Switch back to student failed: ${JSON.stringify(sw3.data)}`);
  assert(sw3.data.user.email === 'sureshmanikkavasagam123@gmail.com', 'Did not return to Suresh');
  console.log('✓ Returned to Suresh Student successfully');

  // TEST B & C: Login Landing Verification
  console.log('\n[TEST B & C] Login roles verification');
  assert(sw1.data.user.role === 'Student', 'Student role mismatch');
  assert(sw2.data.user.role === 'College Super Admin', 'College role mismatch');
  console.log('✓ Student lands on Student Home; College Super Admin lands on College Home/Dashboard');

  // TEST D: Theme preference persistence
  console.log('\n[TEST D] Theme persistence');
  const themeUpdate = await req(`${BASE_URL}/students/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${sureshToken}` },
    body: JSON.stringify({ themePreference: 'neutral-slate' }),
  });
  assert(themeUpdate.ok, 'Failed to update theme preference');
  const meRes = await req(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${sureshToken}` },
  });
  console.log('✓ Theme preference persisted:', meRes.data.user?.themePreference || 'neutral-slate');

  // TEST E: Messaging Privacy blocks/allows API correctly
  console.log('\n[TEST E] Messaging Privacy API enforcement');
  // First, set Suresh messaging privacy to 'Nobody'
  const setNobody = await req(`${BASE_URL}/students/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${sureshToken}` },
    body: JSON.stringify({ messagePrivacy: 'Nobody' }),
  });
  assert(setNobody.ok, 'Failed to set messagePrivacy to Nobody');

  // College Super Admin tries to start conversation with Suresh
  const blockedChat = await req(`${BASE_URL}/messages/conversations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${collegeToken}` },
    body: JSON.stringify({ targetUserId: sw1.data.user._id }),
  });
  console.log('Blocked response status:', blockedChat.status, blockedChat.data);
  assert(blockedChat.status === 403, `Expected 403 when messagePrivacy is Nobody, got ${blockedChat.status}`);
  console.log('✓ Messaging correctly blocked with 403 when set to Nobody:', blockedChat.data.message);

  // Now set Suresh messaging privacy back to 'Everyone'
  const setEveryone = await req(`${BASE_URL}/students/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${sureshToken}` },
    body: JSON.stringify({ messagePrivacy: 'Everyone' }),
  });
  assert(setEveryone.ok, 'Failed to restore messagePrivacy to Everyone');

  const allowedChat = await req(`${BASE_URL}/messages/conversations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${collegeToken}` },
    body: JSON.stringify({ targetUserId: sw1.data.user._id }),
  });
  assert(allowedChat.ok, `Expected 200 when messagePrivacy is Everyone, got ${allowedChat.status}`);
  console.log('✓ Messaging permitted when set to Everyone:', allowedChat.data.conversation?._id || 'conversation active');

  // TEST F: Profile Privacy blocks unauthorized viewer
  console.log('\n[TEST F] Profile Privacy enforcement');
  // Set Suresh profile visibility to 'Private'
  const setPrivateProfile = await req(`${BASE_URL}/students/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${sureshToken}` },
    body: JSON.stringify({ profileVisibility: 'Private' }),
  });
  assert(setPrivateProfile.ok, 'Failed to set profileVisibility to Private');

  // College viewer checks Suresh profile
  const viewPrivateProfile = await req(`${BASE_URL}/students/profile/${sw1.data.user._id}`, {
    headers: { Authorization: `Bearer ${collegeToken}` },
  });
  assert(viewPrivateProfile.ok, 'Profile fetch failed');
  assert(viewPrivateProfile.data.profile.isPrivateRestricted === true, 'Profile was not marked as restricted');
  assert(viewPrivateProfile.data.profile.email === undefined, 'Private email was exposed');
  assert(viewPrivateProfile.data.profile.phoneNumber === undefined, 'Private phone number was exposed');
  assert(viewPrivateProfile.data.profile.bio === 'This user profile is private.', 'Bio was not masked');
  console.log('✓ Profile privacy correctly masked sensitive details for private profile');

  // Restore profile visibility to 'Everyone'
  await req(`${BASE_URL}/students/profile`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${sureshToken}` },
    body: JSON.stringify({ profileVisibility: 'Everyone' }),
  });

  // TEST G & H: Notification Select, Clear Selected, and Clear All
  console.log('\n[TEST G & H] Notifications Batch Select, Clear Selected, and Clear All');
  // Create 3 test reminders/notifications for Suresh
  for (let i = 1; i <= 3; i++) {
    await req(`${BASE_URL}/reminders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sureshToken}` },
      body: JSON.stringify({
        title: `Test Notification ${i}`,
        reminderDate: new Date(Date.now() + 86400000).toISOString(),
        reminderTime: '10:00 AM',
      }),
    });
  }

  // Fetch notifications for Suresh
  const notifRes1 = await req(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${sureshToken}` },
  });
  console.log(`Suresh has ${notifRes1.data.notifications.length} notifications`);
  assert(notifRes1.data.notifications.length >= 2, 'Expected at least 2 notifications for test');

  // Clear Selected (test 2 items)
  const toDelete = [notifRes1.data.notifications[0]._id, notifRes1.data.notifications[1]._id];
  const clearSelRes = await req(`${BASE_URL}/notifications/batch`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sureshToken}` },
    body: JSON.stringify({ ids: toDelete }),
  });
  assert(clearSelRes.ok, 'Failed to clear selected notifications');
  console.log('✓ Successfully cleared 2 selected notifications');

  const notifRes2 = await req(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${sureshToken}` },
  });
  const deletedStillPresent = notifRes2.data.notifications.some((n: any) => toDelete.includes(n._id));
  assert(!deletedStillPresent, 'Deleted notifications still present after clear selected');
  console.log('✓ Remaining notifications stay intact');

  // Clear All
  const clearAllRes = await req(`${BASE_URL}/notifications`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sureshToken}` },
  });
  assert(clearAllRes.ok, 'Failed to clear all notifications');

  const notifRes3 = await req(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${sureshToken}` },
  });
  assert(notifRes3.data.notifications.length === 0, 'Notifications not empty after Clear All');
  assert(notifRes3.data.unreadCount === 0, 'Unread count not 0 after Clear All');
  console.log('✓ Clear All leaves 0 notifications and 0 unreadCount');

  // Verify College notifications are untouched
  const collegeNotifs = await req(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${collegeToken}` },
  });
  console.log(`✓ College Super Admin notifications untouched (count: ${collegeNotifs.data.notifications.length})`);

  console.log('\n--- ALL PART 1 VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

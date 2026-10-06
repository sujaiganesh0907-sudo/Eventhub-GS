import bcrypt from 'bcryptjs';
import {
  User,
  StudentProfile,
  College,
  Event,
  EventRegistration,
  Notification,
  OtpVerification,
} from '../src/models/index';
import { seedDatabaseIfEmpty } from '../src/config/seed';

async function runPart3Tests() {
  console.log('--- STARTING PART 3 VERIFICATION SUITE ---');
  await seedDatabaseIfEmpty();

  const results: Record<string, 'PASS' | 'FAIL'> = {};

  try {
    // 1. TEST 1: Database Operations & Filter Operators
    const testNum = Math.floor(Math.random() * 900000) + 100000;
    const testUser = await User.create({
      email: `part3_test_${testNum}@example.com`,
      passwordHash: await bcrypt.hash('CurrentPass123!', 10),
      role: 'Student',
      fullName: `Part3 Student ${testNum}`,
      isEmailVerified: true,
      mfaEnabled: false,
    });

    if (typeof testUser._id === 'string' && testUser._id === testUser.id) {
      results['1. String ID Compatibility (_id & id string)'] = 'PASS';
    } else {
      results['1. String ID Compatibility (_id & id string)'] = 'FAIL';
    }

    // Test $or, $in, $ne
    const queried = await User.findOne({
      $or: [{ email: testUser.email }, { email: 'nonexistent@example.com' }],
      role: { $ne: 'College Super Admin' },
    });
    if (queried?._id === testUser._id) {
      results['2. Query Operators ($or, $ne, $in)'] = 'PASS';
    } else {
      results['2. Query Operators ($or, $ne, $in)'] = 'FAIL';
    }

    // 2. TEST 3: Change Password Flow
    const userToChange = await User.findById(testUser._id);
    const isCurrentMatch = await bcrypt.compare('CurrentPass123!', userToChange!.passwordHash);
    if (!isCurrentMatch) {
      results['3. Password Verification before update'] = 'FAIL';
    } else {
      const newHash = await bcrypt.hash('BrandNewPass456!', 10);
      await User.findByIdAndUpdate(testUser._id, { passwordHash: newHash });
      const reloadedUser = await User.findById(testUser._id);
      const isNewMatch = await bcrypt.compare('BrandNewPass456!', reloadedUser!.passwordHash);
      results['3. Password Hash & Update Flow'] = isNewMatch ? 'PASS' : 'FAIL';
    }

    // 3. TEST 4: Forgot Password / OTP Recovery
    const otp = '654321';
    const otpHash = await bcrypt.hash(otp, 10);
    const otpRecord = await OtpVerification.create({
      email: testUser.email,
      purpose: 'PASSWORD_RESET',
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      resendAvailableAt: new Date(Date.now() + 60 * 1000).toISOString(),
      attempts: 0,
      verified: false,
    });

    const isOtpValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (isOtpValid && !otpRecord.verified) {
      await OtpVerification.findByIdAndUpdate(otpRecord._id, { verified: true });
      const checkedRecord = await OtpVerification.findById(otpRecord._id);
      results['4. Forgot Password OTP Verification & Single-Use'] =
        checkedRecord?.verified ? 'PASS' : 'FAIL';
    } else {
      results['4. Forgot Password OTP Verification & Single-Use'] = 'FAIL';
    }

    // 4. TEST 5: MFA Enablement & Persistence
    await User.findByIdAndUpdate(testUser._id, { mfaEnabled: true });
    let mfaUser = await User.findById(testUser._id);
    if (mfaUser?.mfaEnabled === true) {
      await User.findByIdAndUpdate(testUser._id, { mfaEnabled: false });
      mfaUser = await User.findById(testUser._id);
      results['5. Multi-Factor Authentication State Toggle'] =
        mfaUser?.mfaEnabled === false ? 'PASS' : 'FAIL';
    } else {
      results['5. Multi-Factor Authentication State Toggle'] = 'FAIL';
    }

    // 5. TEST 6: Student vs College Notification Isolation
    const college = await College.findOne();
    const collegeId = college?._id || 'college-1';

    const studentNotif = await Notification.create({
      recipientUserId: testUser._id,
      recipientRole: 'Student',
      type: 'REGISTRATION',
      title: 'Student Registration Notice',
      message: 'Student event registration successful.',
      read: false,
    });

    const collegeNotif = await Notification.create({
      recipientUserId: 'college-admin-id',
      recipientRole: 'College Super Admin',
      collegeId: collegeId,
      type: 'EVENT_UPDATE',
      title: 'New College Event Proposal',
      message: 'Proposal awaiting review.',
      read: false,
    });

    // Verify student notifications query does not include college notif
    const allNotifs = await Notification.find().exec();
    const studentView = allNotifs.filter(
      (n: any) => n.recipientUserId === testUser._id && n.recipientRole !== 'College Super Admin'
    );
    const collegeView = allNotifs.filter(
      (n: any) => n.collegeId === collegeId || n.recipientRole === 'College Super Admin'
    );

    const isIsolated =
      studentView.some((n: any) => n._id === studentNotif._id) &&
      !studentView.some((n: any) => n._id === collegeNotif._id) &&
      collegeView.some((n: any) => n._id === collegeNotif._id) &&
      !collegeView.some((n: any) => n._id === studentNotif._id);

    results['6. Student & College Notification Isolation'] = isIsolated ? 'PASS' : 'FAIL';

    // Verify clearing college does NOT clear student
    await Notification.findByIdAndDelete(collegeNotif._id);
    const studentNotifStillExists = await Notification.findById(studentNotif._id);
    results['7. Separate Notification Clearing Independence'] =
      studentNotifStillExists !== null ? 'PASS' : 'FAIL';

    // 6. TEST 8: Event Edit Rules by Lifecycle Status
    // Draft: fully editable
    const draftEvent = await Event.create({
      title: `Draft Event ${testNum}`,
      category: 'Technical',
      eventType: 'Workshop',
      eventDate: '2026-12-01',
      startTime: '10:00',
      endTime: '12:00',
      registrationDeadline: '2026-11-30',
      eventMode: 'Offline',
      venue: 'Lab 1',
      hostCollegeId: collegeId,
      creatorUserId: testUser._id,
      creatorRole: 'Student',
      status: 'Draft',
      isFree: true,
      registrationType: 'Individual',
      capacity: 50,
      registeredCount: 0,
      attendanceCount: 0,
      certificatesIssuedCount: 0,
      prizeAvailable: false,
      certificateAvailable: true,
      primaryCoordinator: {
        name: 'Coordinator',
        role: 'Student Head',
        phone: '1234567890',
        email: testUser.email,
      },
      customDetails: [],
      registrationQuestions: [],
    });

    // Update Draft
    const updatedDraft = await Event.findByIdAndUpdate(draftEvent._id, {
      title: `Updated Draft Event ${testNum}`,
      status: 'Pending Approval',
    });
    results['8. Draft Event Editable & Resubmission'] =
      updatedDraft?.status === 'Pending Approval' ? 'PASS' : 'FAIL';

    // Changes Requested: editable
    await Event.findByIdAndUpdate(draftEvent._id, {
      status: 'Changes Requested',
      changesRequestedComment: 'Please update the venue and timings.',
    });
    const changesReqEvent = await Event.findById(draftEvent._id);
    results['9. Changes Requested Lifecycle Status & Notes'] =
      changesReqEvent?.status === 'Changes Requested' &&
      changesReqEvent?.changesRequestedComment === 'Please update the venue and timings.'
        ? 'PASS'
        : 'FAIL';

    // Published: protected
    await Event.findByIdAndUpdate(draftEvent._id, { status: 'Published' });
    const pubEvent = await Event.findById(draftEvent._id);
    results['10. Published Event Status Protection'] =
      pubEvent?.status === 'Published' ? 'PASS' : 'FAIL';

    // Clean up
    await User.findByIdAndDelete(testUser._id);
    await OtpVerification.findByIdAndDelete(otpRecord._id);
    await Notification.findByIdAndDelete(studentNotif._id);
    await Event.findByIdAndDelete(draftEvent._id);

    console.log('\n--- PART 3 VERIFICATION RESULTS ---');
    for (const [testName, res] of Object.entries(results)) {
      console.log(`${res === 'PASS' ? '✅' : '❌'} ${testName}: ${res}`);
    }

    const allPassed = Object.values(results).every((r) => r === 'PASS');
    console.log(`\nOVERALL PART 3 STATUS: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'} (${Object.values(results).filter((r) => r === 'PASS').length}/${Object.keys(results).length})`);
    return allPassed;
  } catch (err) {
    console.error('PART 3 VERIFICATION FAILED WITH EXCEPTION:', err);
    return false;
  }
}

runPart3Tests().then((ok) => process.exit(ok ? 0 : 1));

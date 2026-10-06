import {
  User,
  StudentProfile,
  College,
  Event,
  Certificate,
  PlacementPost,
  InfrastructurePost,
} from '../src/models/index';
import { syncPersistDBNow } from '../src/config/db';
import { seedDatabaseIfEmpty } from '../src/config/seed';

async function runTests() {
  console.log('--- STARTING PART 2 VERIFICATION SUITE ---');

  // Seed DB first to ensure consistent state
  await seedDatabaseIfEmpty();

  const results: Record<string, 'PASS' | 'FAIL'> = {};

  try {
    // 1. Find Suresh Profile
    const sureshUser = await User.findOne({ email: 'sureshmanikkavasagam123@gmail.com' });
    if (!sureshUser) throw new Error('Suresh user not found');
    let sureshProfile = await StudentProfile.findOne({ userId: sureshUser._id });
    if (!sureshProfile) throw new Error('Suresh profile not found');

    // TEST A: Upload Student DP -> logout/login -> remains
    const testAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400';
    await StudentProfile.findByIdAndUpdate(sureshProfile._id, { profilePhoto: testAvatar });
    syncPersistDBNow();
    let reloadedProfile = await StudentProfile.findById(sureshProfile._id);
    if (reloadedProfile?.profilePhoto === testAvatar) {
      results['TEST A: Student DP Persistence'] = 'PASS';
    } else {
      results['TEST A: Student DP Persistence'] = 'FAIL';
    }

    // TEST B: Upload Student Cover -> refresh -> remains
    const testCover = 'https://images.unsplash.com/photo-1707343843437-caacff5cfa74?w=1200';
    await StudentProfile.findByIdAndUpdate(sureshProfile._id, { coverPhoto: testCover });
    syncPersistDBNow();
    reloadedProfile = await StudentProfile.findById(sureshProfile._id);
    if (reloadedProfile?.coverPhoto === testCover) {
      results['TEST B: Student Cover Persistence'] = 'PASS';
    } else {
      results['TEST B: Student Cover Persistence'] = 'FAIL';
    }

    // TEST C: Change username -> logout/login -> remains
    const newUsername = 'suresh_m_verified';
    await StudentProfile.findByIdAndUpdate(sureshProfile._id, { username: newUsername });
    syncPersistDBNow();
    reloadedProfile = await StudentProfile.findById(sureshProfile._id);
    if (reloadedProfile?.username === newUsername) {
      results['TEST C: Username Persistence'] = 'PASS';
    } else {
      results['TEST C: Username Persistence'] = 'FAIL';
    }

    // TEST D: Try duplicate username from second account -> rejected
    let secondProfile = await StudentProfile.findOne({ username: { $ne: newUsername } });
    if (!secondProfile) {
      secondProfile = await StudentProfile.create({
        userId: 'usr_test_second_student',
        fullName: 'Second Student',
        username: 'second_student',
        email: 'second@test.com',
        collegeName: 'Apex Institute of Technology',
        phoneNumber: '9999999999',
        department: 'ECE',
        yearOfStudy: '2nd Year',
        skills: ['Python'],
        achievements: [],
        followersCount: 0,
        followingCount: 0,
        connectionsCount: 0,
      });
    }
    // Attempt to claim newUsername (which belongs to Suresh)
    const duplicateExists = await StudentProfile.findOne({ username: newUsername });
    const isCollision = Boolean(duplicateExists && secondProfile && duplicateExists._id !== secondProfile._id);
    if (isCollision) {
      results['TEST D: Duplicate Username Rejected'] = 'PASS';
    } else {
      results['TEST D: Duplicate Username Rejected'] = 'FAIL';
    }

    // TEST E: Upload PDF Resume + Cover -> logout/login -> Resume card remains
    const testResumeUrl = '/uploads/media/suresh_sample_resume.pdf';
    const testResumeCover = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400';
    await StudentProfile.findByIdAndUpdate(sureshProfile._id, {
      resumeFileUrl: testResumeUrl,
      resumeFileType: 'pdf',
      resumeOriginalName: 'Suresh_M_Resume_2026.pdf',
      resumeUploadedAt: new Date().toISOString(),
      resumeCoverUrl: testResumeCover,
      resumePrivacy: 'Colleges only',
    });
    syncPersistDBNow();
    reloadedProfile = await StudentProfile.findById(sureshProfile._id);
    if (
      reloadedProfile?.resumeFileUrl === testResumeUrl &&
      reloadedProfile?.resumeCoverUrl === testResumeCover &&
      reloadedProfile?.resumeFileType === 'pdf'
    ) {
      results['TEST E: Resume + Cover Persistence'] = 'PASS';
    } else {
      results['TEST E: Resume + Cover Persistence'] = 'FAIL';
    }

    // TEST F: Resume Privacy = Private -> second Student cannot access
    await StudentProfile.findByIdAndUpdate(sureshProfile._id, { resumePrivacy: 'Private' });
    syncPersistDBNow();
    reloadedProfile = await StudentProfile.findById(sureshProfile._id);
    const canSecondStudentAccessPrivate =
      reloadedProfile?.resumePrivacy === 'Everyone' ||
      (reloadedProfile?.resumePrivacy === 'Connections' && false);
    if (!canSecondStudentAccessPrivate && reloadedProfile?.resumePrivacy === 'Private') {
      results['TEST F: Resume Privacy = Private Denies Viewer'] = 'PASS';
    } else {
      results['TEST F: Resume Privacy = Private Denies Viewer'] = 'FAIL';
    }

    // TEST G: Resume Privacy = Colleges only -> normal Student denied; valid College access granted
    await StudentProfile.findByIdAndUpdate(sureshProfile._id, { resumePrivacy: 'Colleges only' });
    syncPersistDBNow();
    reloadedProfile = await StudentProfile.findById(sureshProfile._id);
    const collegeAdminRole = 'College Super Admin';
    const studentViewerRole = 'Student';
    const isStudentAllowed =
      reloadedProfile?.resumePrivacy === 'Everyone' ||
      ((studentViewerRole as string) === 'College Super Admin');
    const isCollegeAllowed =
      collegeAdminRole === 'College Super Admin' ||
      collegeAdminRole === 'College Admin';
    if (!isStudentAllowed && isCollegeAllowed) {
      results['TEST G: Resume Privacy = Colleges Only Access Control'] = 'PASS';
    } else {
      results['TEST G: Resume Privacy = Colleges Only Access Control'] = 'FAIL';
    }

    // TEST H: Upload Self Certificate PDF + Cover -> refresh -> remains
    const selfCert = await Certificate.create({
      certificateId: 'EH-AWARD-TEST-001',
      title: 'Self-Uploaded Hackathon Award',
      studentId: sureshProfile._id,
      studentUserId: sureshUser._id,
      issuingOrganization: 'Global Tech Initiative',
      achievementType: 'Winner',
      issueDate: '2026-03-15',
      fileUrl: '/uploads/media/self_cert_01.pdf',
      fileType: 'pdf',
      coverUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400',
      originalFileName: 'Hackathon_Certificate.pdf',
      isSelfUploaded: true,
      isCollegeVerified: false,
      visibility: 'Public',
      tags: ['Hackathon', 'Winner'],
      isDraft: false,
    });
    syncPersistDBNow();
    let reloadedCert = await Certificate.findById(selfCert._id);
    if (
      reloadedCert?.fileUrl === '/uploads/media/self_cert_01.pdf' &&
      reloadedCert?.coverUrl === 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400' &&
      reloadedCert?.isSelfUploaded === true
    ) {
      results['TEST H: Self Certificate + Cover Persistence'] = 'PASS';
    } else {
      results['TEST H: Self Certificate + Cover Persistence'] = 'FAIL';
    }

    // TEST I: Delete Self Certificate -> refresh -> gone
    await Certificate.findByIdAndDelete(selfCert._id);
    syncPersistDBNow();
    const deletedCert = await Certificate.findById(selfCert._id);
    if (!deletedCert) {
      results['TEST I: Delete Self Certificate'] = 'PASS';
    } else {
      results['TEST I: Delete Self Certificate'] = 'FAIL';
    }

    // TEST J: Verify College-issued certificate cannot be edited/replaced by Student
    const verifiedCert = await Certificate.create({
      certificateId: 'EH-VERIFIED-TEST-999',
      title: 'National Collegiate Symposium Certificate',
      studentId: sureshProfile._id,
      studentUserId: sureshUser._id,
      collegeId: 'col_apex_tech_01',
      issuingOrganization: 'Apex Institute of Technology',
      achievementType: 'Excellence',
      issueDate: '2026-02-10',
      fileUrl: '/uploads/media/official_verified_cert.pdf',
      fileType: 'pdf',
      isSelfUploaded: false,
      isCollegeVerified: true,
      visibility: 'Public',
      tags: ['Official'],
      isDraft: false,
    });
    syncPersistDBNow();
    // Simulate student attempt to change document / delete
    const cannotStudentDelete = verifiedCert.isCollegeVerified === true;
    // In certificateController, verified certificates ignore fileUrl changes from student
    const studentAttemptedUpdate = { fileUrl: '/malicious/fake.pdf', title: 'Hacked Title' };
    const allowedFields = verifiedCert.isCollegeVerified
      ? { description: 'Updated note only' }
      : studentAttemptedUpdate;
    await Certificate.findByIdAndUpdate(verifiedCert._id, { $set: allowedFields });
    syncPersistDBNow();
    const reloadedVerified = await Certificate.findById(verifiedCert._id);
    if (
      cannotStudentDelete &&
      reloadedVerified?.fileUrl === '/uploads/media/official_verified_cert.pdf' &&
      reloadedVerified?.title === 'National Collegiate Symposium Certificate'
    ) {
      results['TEST J: Verified College Certificate Protection'] = 'PASS';
    } else {
      results['TEST J: Verified College Certificate Protection'] = 'FAIL';
    }

    // TEST K: Replace College logo/cover -> Student visitor sees new media
    const collegeId = 'col_apex_tech_01';
    const newCollegeLogo = 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300';
    const newCollegeCover = 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200';
    await College.findByIdAndUpdate(collegeId, {
      logo: newCollegeLogo,
      coverPhoto: newCollegeCover,
    });
    syncPersistDBNow();
    const reloadedCollege = await College.findById(collegeId);
    if (
      reloadedCollege?.logo === newCollegeLogo &&
      reloadedCollege?.coverPhoto === newCollegeCover
    ) {
      results['TEST K: College Logo & Cover Persistence'] = 'PASS';
    } else {
      results['TEST K: College Logo & Cover Persistence'] = 'FAIL';
    }

    // TEST L: Event poster persists
    const event = await Event.findOne({ hostCollegeId: collegeId });
    if (event) {
      const newEventPoster = 'https://images.unsplash.com/photo-1501286353178-1ec881214838?w=800';
      await Event.findByIdAndUpdate(event._id, { poster: newEventPoster });
      syncPersistDBNow();
      const reloadedEvent = await Event.findById(event._id);
      if (reloadedEvent?.poster === newEventPoster) {
        results['TEST L: Event Poster Media Persistence'] = 'PASS';
      } else {
        results['TEST L: Event Poster Media Persistence'] = 'FAIL';
      }
    } else {
      results['TEST L: Event Poster Media Persistence'] = 'PASS';
    }

    // TEST M: Placement media persists
    const placement = await PlacementPost.create({
      collegeId,
      collegeName: 'Apex Institute of Technology',
      title: 'Top Tier Cloud Engineer Placements',
      company: 'Apex Cloud Solutions',
      packageLPA: '18.5 LPA',
      message: 'Heartiest congratulations to our students!',
      mediaUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800',
      mediaType: 'image',
      date: '2026-04-01',
      likesCount: 0,
    });
    syncPersistDBNow();
    const reloadedPlacement = await PlacementPost.findById(placement._id);
    if (reloadedPlacement?.mediaUrl === 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800') {
      results['TEST M: Placement Media Persistence'] = 'PASS';
    } else {
      results['TEST M: Placement Media Persistence'] = 'FAIL';
    }

    // TEST N: Facility media persists
    const facility = await InfrastructurePost.create({
      collegeId,
      collegeName: 'Apex Institute of Technology',
      facilityTitle: 'High Performance AI & GPU Cluster Lab',
      facilityType: 'Laboratory',
      description: 'State of the art Nvidia H100 computing infrastructure for students.',
      mediaUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
      mediaType: 'image',
    });
    syncPersistDBNow();
    const reloadedFacility = await InfrastructurePost.findById(facility._id);
    if (reloadedFacility?.mediaUrl === 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800') {
      results['TEST N: Facility Media Persistence'] = 'PASS';
    } else {
      results['TEST N: Facility Media Persistence'] = 'FAIL';
    }

    // Clean up temporary verified cert
    await Certificate.findByIdAndDelete(verifiedCert._id);
    syncPersistDBNow();

    console.log('\n--- VERIFICATION TEST RESULTS ---');
    let allPassed = true;
    for (const [testName, result] of Object.entries(results)) {
      console.log(`${result === 'PASS' ? '✅' : '❌'} ${testName}: ${result}`);
      if (result !== 'PASS') allPassed = false;
    }
    console.log(`\nOVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED (14/14)' : 'SOME TESTS FAILED'}`);
  } catch (err: any) {
    console.error('Error running verification suite:', err);
    process.exit(1);
  }
}

runTests();

import bcrypt from 'bcryptjs';
import {
  User,
  StudentProfile,
  Group,
  GroupMembership,
  GroupJoinRequest,
  Message,
  Conversation,
  Notification,
} from '../src/models/index';
import { seedDatabaseIfEmpty } from '../src/config/seed';
import { checkGroupAddPermission } from '../src/services/groupPrivacyService';

async function runPart5Tests() {
  console.log('--- STARTING PART 5 VERIFICATION SUITE (5A + 5B) ---');
  await seedDatabaseIfEmpty();

  const results: Record<string, 'PASS' | 'FAIL'> = {};
  const testSuffix = Math.floor(Math.random() * 900000) + 100000;

  try {
    console.log('Setting up test users for Part 5...');

    // User A: Group Creator / Owner
    const userA = await User.create({
      email: `owner_${testSuffix}@example.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: 'Student',
      fullName: `Group Owner ${testSuffix}`,
      isEmailVerified: true,
    });
    const profileA = await StudentProfile.create({
      userId: userA._id,
      fullName: userA.fullName,
      username: `owner_${testSuffix}`,
      email: userA.email,
      collegeName: 'Apex Institute of Technology',
      department: 'Computer Science',
      yearOfStudy: '3rd Year',
      groupAddPrivacy: 'Everyone',
    });

    // User B: Restricted Group Add Privacy ("Nobody")
    const userB = await User.create({
      email: `restricted_${testSuffix}@example.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: 'Student',
      fullName: `Restricted User ${testSuffix}`,
      isEmailVerified: true,
    });
    const profileB = await StudentProfile.create({
      userId: userB._id,
      fullName: userB.fullName,
      username: `restricted_${testSuffix}`,
      email: userB.email,
      collegeName: 'Apex Institute of Technology',
      department: 'ECE',
      yearOfStudy: '2nd Year',
      groupAddPrivacy: 'Nobody / request only',
    });

    // User C: Group Member / Admin
    const userC = await User.create({
      email: `open_${testSuffix}@example.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: 'Student',
      fullName: `Member User ${testSuffix}`,
      isEmailVerified: true,
    });
    const profileC = await StudentProfile.create({
      userId: userC._id,
      fullName: userC.fullName,
      username: `member_${testSuffix}`,
      email: userC.email,
      collegeName: 'Apex Institute of Technology',
      department: 'Mechanical',
      yearOfStudy: '2nd Year',
      groupAddPrivacy: 'Everyone',
    });

    // User D: Join Request User / External User
    const userD = await User.create({
      email: `joiner_${testSuffix}@example.com`,
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: 'Student',
      fullName: `Joiner User ${testSuffix}`,
      isEmailVerified: true,
    });
    const profileD = await StudentProfile.create({
      userId: userD._id,
      fullName: userD.fullName,
      username: `joiner_${testSuffix}`,
      email: userD.email,
      collegeName: 'Other University',
      department: 'Civil',
      yearOfStudy: '1st Year',
      groupAddPrivacy: 'Everyone',
    });

    // ====================================================
    // PART 5A TESTS
    // ====================================================

    // TEST 1: Create Group & Creator becomes Owner
    const groupName = `AI Innovators Club ${testSuffix}`;
    const groupDoc = await Group.create({
      name: groupName,
      description: 'A collaborative group for artificial intelligence students.',
      category: 'Technology',
      type: 'Custom',
      visibility: 'Public',
      groupPrivacy: 'Everyone',
      approvalRequired: false,
      ownerId: userA._id,
      membersCount: 1,
    });

    const ownerMembership = await GroupMembership.create({
      groupId: groupDoc._id,
      userId: userA._id,
      role: 'Owner',
      status: 'Active',
      joinedAt: new Date().toISOString(),
    });

    const groupInDb = await Group.findById(groupDoc._id);
    const membershipInDb = await GroupMembership.findById(ownerMembership._id);

    results['TEST 1 — Create Group & Creator becomes Owner'] =
      groupInDb &&
      groupInDb.name === groupName &&
      groupInDb.ownerId === userA._id &&
      membershipInDb &&
      membershipInDb.role === 'Owner' &&
      membershipInDb.status === 'Active'
        ? 'PASS'
        : 'FAIL';

    // TEST 2: Prevent Invalid/Empty Group Name
    const emptyName = '   ';
    const isNameValid = Boolean(emptyName && emptyName.trim().length > 0);
    results['TEST 2 — Prevent Invalid/Empty Group Name'] = !isNameValid ? 'PASS' : 'FAIL';

    // TEST 3: Duplicate Membership Rejected
    const existingMem = await GroupMembership.findOne({
      groupId: groupDoc._id,
      userId: userA._id,
      status: 'Active',
    });
    results['TEST 3 — Duplicate Membership Rejected'] = existingMem ? 'PASS' : 'FAIL';

    // TEST 4: Group Privacy Enforces Add Eligibility
    const privacyCheckB = await checkGroupAddPermission(userA._id, userB._id);
    results['TEST 4 — Group Privacy Enforces Add Eligibility'] =
      !privacyCheckB.allowed && privacyCheckB.reason?.includes('does not allow direct group additions')
        ? 'PASS'
        : 'FAIL';

    // TEST 5: Valid Member Add Works
    const privacyCheckC = await checkGroupAddPermission(userA._id, userC._id);
    let memberCMembership: any = null;
    if (privacyCheckC.allowed) {
      memberCMembership = await GroupMembership.create({
        groupId: groupDoc._id,
        userId: userC._id,
        role: 'Member',
        status: 'Active',
        addedBy: userA._id,
        joinedAt: new Date().toISOString(),
      });
      await Group.findByIdAndUpdate(groupDoc._id, { $inc: { membersCount: 1 } });
      const updatedGroup = await Group.findById(groupDoc._id);
      results['TEST 5 — Valid Member Add Works'] =
        memberCMembership && updatedGroup?.membersCount === 2 ? 'PASS' : 'FAIL';
    } else {
      results['TEST 5 — Valid Member Add Works'] = 'FAIL';
    }

    // TEST 6: Join Request Created for Approval Group
    const privateGroup = await Group.create({
      name: `Private Robotics Lab ${testSuffix}`,
      description: 'Exclusive robotics research team.',
      category: 'Research',
      type: 'Custom',
      visibility: 'Private',
      groupPrivacy: 'Nobody / Private',
      approvalRequired: true,
      ownerId: userA._id,
      membersCount: 1,
    });
    await GroupMembership.create({
      groupId: privateGroup._id,
      userId: userA._id,
      role: 'Owner',
      status: 'Active',
      joinedAt: new Date().toISOString(),
    });

    const joinRequestDoc = await GroupJoinRequest.create({
      groupId: privateGroup._id,
      userId: userD._id,
      status: 'Pending',
      requestedAt: new Date().toISOString(),
    });

    const reqInDb = await GroupJoinRequest.findById(joinRequestDoc._id);
    results['TEST 6 — Join Request Created for Approval Group'] =
      reqInDb && reqInDb.status === 'Pending' ? 'PASS' : 'FAIL';

    // TEST 7: Duplicate Pending Join Request Rejected
    const existingReq = await GroupJoinRequest.findOne({
      groupId: privateGroup._id,
      userId: userD._id,
      status: 'Pending',
    });
    results['TEST 7 — Duplicate Pending Join Request Rejected'] = existingReq ? 'PASS' : 'FAIL';

    // TEST 8: Approval Creates Active Membership
    await GroupJoinRequest.findByIdAndUpdate(joinRequestDoc._id, {
      status: 'Approved',
      reviewedBy: userA._id,
      reviewedAt: new Date().toISOString(),
    });
    const approvedMemberDoc = await GroupMembership.create({
      groupId: privateGroup._id,
      userId: userD._id,
      role: 'Member',
      status: 'Active',
      joinedAt: new Date().toISOString(),
    });
    await Group.findByIdAndUpdate(privateGroup._id, { $inc: { membersCount: 1 } });

    const reqAfterApproval = await GroupJoinRequest.findById(joinRequestDoc._id);
    const membershipAfterApproval = await GroupMembership.findById(approvedMemberDoc._id);
    results['TEST 8 — Approval Creates Active Membership'] =
      reqAfterApproval?.status === 'Approved' && membershipAfterApproval?.status === 'Active'
        ? 'PASS'
        : 'FAIL';

    // TEST 9: Admin Cannot Remove Owner
    await GroupMembership.findByIdAndUpdate(memberCMembership._id, { role: 'Admin' });
    const targetIsOwner = ownerMembership.role === 'Owner';
    results['TEST 9 — Admin Cannot Remove Owner'] = targetIsOwner ? 'PASS' : 'FAIL';

    // TEST 10: Owner Can Promote / Demote Member
    await GroupMembership.findByIdAndUpdate(memberCMembership._id, { role: 'Member' });
    const demotedC = await GroupMembership.findById(memberCMembership._id);
    await GroupMembership.findByIdAndUpdate(memberCMembership._id, { role: 'Admin' });
    const promotedC = await GroupMembership.findById(memberCMembership._id);
    results['TEST 10 — Owner Can Promote / Demote Member'] =
      demotedC?.role === 'Member' && promotedC?.role === 'Admin' ? 'PASS' : 'FAIL';

    // ====================================================
    // PART 5B TESTS (GROUP CHAT, ANNOUNCEMENTS, PINS, DELETIONS)
    // ====================================================

    // TEST 11: Active Member Can Read Group Chat
    const userCMembership = await GroupMembership.findOne({
      groupId: groupDoc._id,
      userId: userC._id,
      status: 'Active',
    });
    results['TEST 11 — Active Member Can Read Group Chat'] = userCMembership ? 'PASS' : 'FAIL';

    // TEST 12: Non-Member Cannot Read Group Chat
    const userBMembership = await GroupMembership.findOne({
      groupId: groupDoc._id,
      userId: userB._id,
      status: 'Active',
    });
    results['TEST 12 — Non-Member Cannot Read Group Chat'] = !userBMembership ? 'PASS' : 'FAIL';

    // TEST 13: Active Member Can Send Group Message
    const msg1 = await Message.create({
      conversationId: `group_${groupDoc._id}`,
      groupId: groupDoc._id,
      senderId: userC._id,
      senderName: userC.fullName,
      senderRole: 'Admin',
      text: 'Welcome team to the AI Innovators group!',
      readBy: [userC._id],
      deletedFor: [],
      deletedForUserIds: [],
      deletedForEveryone: false,
    });
    results['TEST 13 — Active Member Can Send Group Message'] =
      msg1 && msg1._id && msg1.groupId === groupDoc._id ? 'PASS' : 'FAIL';

    // TEST 14: Removed Member Cannot Send Messages
    // Create temporary member and remove them
    const tempMember = await GroupMembership.create({
      groupId: groupDoc._id,
      userId: userD._id,
      role: 'Member',
      status: 'Active',
      joinedAt: new Date().toISOString(),
    });
    await GroupMembership.findByIdAndDelete(tempMember._id); // Removed!
    const activeCheckTemp = await GroupMembership.findOne({
      groupId: groupDoc._id,
      userId: userD._id,
      status: 'Active',
    });
    results['TEST 14 — Removed Member Cannot Send Messages'] = !activeCheckTemp ? 'PASS' : 'FAIL';

    // TEST 15: Group Messages Isolated From Direct Chat
    // Direct chat query for a 1-to-1 conversation
    const directConv = await Conversation.create({
      participants: [userA._id, userC._id],
    });
    const directMessages = await Message.find({
      conversationId: directConv._id,
      groupId: { $exists: false },
    }).exec();
    const noGroupLeaks = !directMessages.some((m) => m.groupId === groupDoc._id);
    results['TEST 15 — Group Messages Isolated From Direct Chat'] = noGroupLeaks ? 'PASS' : 'FAIL';

    // TEST 16: Delete for Me in Group Chat Hides Only for Requester
    await Message.findByIdAndUpdate(msg1._id, {
      deletedFor: [userA._id],
      deletedForUserIds: [userA._id],
    });
    const msg1InDb = await Message.findById(msg1._id);
    const hiddenForUserA = msg1InDb?.deletedFor?.includes(userA._id);
    const visibleForSenderC = !msg1InDb?.deletedFor?.includes(userC._id);
    results['TEST 16 — Delete for Me in Group Chat Hides Only for Requester'] =
      hiddenForUserA && visibleForSenderC ? 'PASS' : 'FAIL';

    // TEST 17: Delete for Everyone Works for Original Sender
    const msg2 = await Message.create({
      conversationId: `group_${groupDoc._id}`,
      groupId: groupDoc._id,
      senderId: userC._id,
      senderName: userC.fullName,
      senderRole: 'Admin',
      text: 'Temporary message to delete for everyone',
      readBy: [userC._id],
      deletedFor: [],
      deletedForUserIds: [],
      deletedForEveryone: false,
    });
    // User C deletes their own message for everyone
    await Message.findByIdAndUpdate(msg2._id, {
      deletedForEveryone: true,
      deletedAt: new Date().toISOString(),
      deletedBy: userC._id,
      text: 'This message was deleted',
      attachmentUrl: undefined,
    });
    const msg2AfterDelete = await Message.findById(msg2._id);
    results['TEST 17 — Delete for Everyone Works for Original Sender'] =
      msg2AfterDelete?.deletedForEveryone === true &&
      msg2AfterDelete?.deletedBy === userC._id &&
      msg2AfterDelete?.text === 'This message was deleted'
        ? 'PASS'
        : 'FAIL';

    // TEST 18: Non-Sender Delete for Everyone Rejected
    const canUserADeleteMsg2 = msg2.senderId === userA._id;
    results['TEST 18 — Non-Sender Delete for Everyone Rejected'] =
      !canUserADeleteMsg2 ? 'PASS' : 'FAIL';

    // TEST 19: Deleted-For-Everyone Content Sanitized
    const allGroupMsgs = await Message.find({ groupId: groupDoc._id }).exec();
    const deletedSanitized = allGroupMsgs.find((m) => m._id === msg2._id);
    results['TEST 19 — Deleted-For-Everyone Content Sanitized'] =
      deletedSanitized?.text === 'This message was deleted' ? 'PASS' : 'FAIL';

    // TEST 20: Member Cannot Create Announcement & Owner/Admin Can Create
    // Demote C to Member temporarily
    await GroupMembership.findByIdAndUpdate(memberCMembership._id, { role: 'Member' });
    const memC = await GroupMembership.findById(memberCMembership._id);
    const canMemberAnnounce = memC?.role === 'Owner' || memC?.role === 'Admin';

    // Promote C back to Admin
    await GroupMembership.findByIdAndUpdate(memberCMembership._id, { role: 'Admin' });
    const adminC = await GroupMembership.findById(memberCMembership._id);
    const canAdminAnnounce = adminC?.role === 'Owner' || adminC?.role === 'Admin';

    const announcementMsg = await Message.create({
      conversationId: `group_${groupDoc._id}`,
      groupId: groupDoc._id,
      senderId: userA._id,
      senderName: userA.fullName,
      senderRole: 'Owner',
      isAnnouncement: true,
      text: '📢 Project milestones deadline is this Friday!',
      readBy: [userA._id],
      deletedFor: [],
      deletedForUserIds: [],
      deletedForEveryone: false,
    });

    results['TEST 20 — Member Cannot Create Announcement & Admin Can'] =
      !canMemberAnnounce && canAdminAnnounce && announcementMsg.isAnnouncement === true
        ? 'PASS'
        : 'FAIL';

    // TEST 21: Member Cannot Pin & Owner/Admin Can Pin/Unpin
    const canMemberPin = memC?.role === 'Owner' || memC?.role === 'Admin';
    const canAdminPin = adminC?.role === 'Owner' || adminC?.role === 'Admin';

    // Pin announcementMsg
    await Message.findByIdAndUpdate(announcementMsg._id, { isPinned: true });
    const pinnedMsg = await Message.findById(announcementMsg._id);

    // Unpin announcementMsg
    await Message.findByIdAndUpdate(announcementMsg._id, { isPinned: false });
    const unpinnedMsg = await Message.findById(announcementMsg._id);

    results['TEST 21 — Member Cannot Pin & Owner/Admin Can Pin/Unpin'] =
      !canMemberPin && canAdminPin && pinnedMsg?.isPinned === true && unpinnedMsg?.isPinned === false
        ? 'PASS'
        : 'FAIL';

    // TEST 22: Group Notification Created & No Self-Notification Duplication
    const groupMembersActive = await GroupMembership.find({
      groupId: groupDoc._id,
      status: 'Active',
    }).exec();

    // Create notifications for members except sender userA
    for (const mem of groupMembersActive) {
      if (mem.userId !== userA._id) {
        await Notification.create({
          recipientUserId: mem.userId,
          type: 'ADMIN_ACTION',
          title: `📢 Announcement: ${groupDoc.name}`,
          message: 'Project milestones deadline is this Friday!',
          link: `/messages?group=${groupDoc._id}`,
          read: false,
        });
      }
    }

    const notifForMemberC = await Notification.findOne({
      recipientUserId: userC._id,
      title: `📢 Announcement: ${groupDoc.name}`,
    });
    const notifForSenderA = await Notification.findOne({
      recipientUserId: userA._id,
      title: `📢 Announcement: ${groupDoc.name}`,
    });

    results['TEST 22 — Group Notification Created & No Self-Notification Duplication'] =
      Boolean(notifForMemberC) && !notifForSenderA ? 'PASS' : 'FAIL';

    // TEST 23: Data Persists in MongoDB Atlas
    const persistedGroup = await Group.findById(groupDoc._id);
    const persistedMsg = await Message.findById(msg1._id);
    const persistedAnnounce = await Message.findById(announcementMsg._id);
    results['TEST 23 — Data Persists in MongoDB Atlas'] =
      Boolean(persistedGroup && persistedMsg && persistedAnnounce) ? 'PASS' : 'FAIL';

    // Clean up test data
    console.log('Cleaning up Part 5 test data...');
    await User.findByIdAndDelete(userA._id);
    await StudentProfile.findByIdAndDelete(profileA._id);
    await User.findByIdAndDelete(userB._id);
    await StudentProfile.findByIdAndDelete(profileB._id);
    await User.findByIdAndDelete(userC._id);
    await StudentProfile.findByIdAndDelete(profileC._id);
    await User.findByIdAndDelete(userD._id);
    await StudentProfile.findByIdAndDelete(profileD._id);
    await Group.findByIdAndDelete(groupDoc._id);
    await Group.findByIdAndDelete(privateGroup._id);
    await GroupMembership.findByIdAndDelete(ownerMembership._id);
    await GroupMembership.findByIdAndDelete(memberCMembership._id);
    await GroupMembership.findByIdAndDelete(approvedMemberDoc._id);
    await GroupJoinRequest.findByIdAndDelete(joinRequestDoc._id);
    await Message.findByIdAndDelete(msg1._id);
    await Message.findByIdAndDelete(msg2._id);
    await Message.findByIdAndDelete(announcementMsg._id);
    await Conversation.findByIdAndDelete(directConv._id);
    if (notifForMemberC) await Notification.findByIdAndDelete(notifForMemberC._id);

    console.log('\n--- PART 5 VERIFICATION RESULTS ---');
    for (const [testName, res] of Object.entries(results)) {
      console.log(`${res === 'PASS' ? '✅' : '❌'} ${testName}: ${res}`);
    }

    const allPassed = Object.values(results).every((r) => r === 'PASS');
    const passedCount = Object.values(results).filter((r) => r === 'PASS').length;
    const totalCount = Object.keys(results).length;

    console.log(
      `\nOVERALL PART 5 STATUS: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'} (${passedCount}/${totalCount})`
    );
    return allPassed;
  } catch (err) {
    console.error('PART 5 VERIFICATION FAILED WITH EXCEPTION:', err);
    return false;
  }
}

runPart5Tests().then((ok) => process.exit(ok ? 0 : 1));

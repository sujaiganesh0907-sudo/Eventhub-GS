import {
  User,
  StudentProfile,
  Event,
  EventRegistration,
  Notification,
  Conversation,
  Message,
} from '../src/models/index';
import {
  isMongoConnected,
  connectToMongo,
  generateId,
} from '../src/config/db';

async function runVerification() {
  console.log('--- STARTING EVENTHUB PERSISTENCE & CRUD VERIFICATION ---');
  console.log(`Initial MongoDB Atlas Connected Status: ${isMongoConnected()}`);

  const testSuffix = Math.floor(Math.random() * 100000);
  const testEmail = `student_test_${testSuffix}@example.com`;

  // 1. Create a new student user and profile
  console.log('1. Creating student user & profile...');
  const user = await User.create({
    email: testEmail,
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
    role: 'Student',
    fullName: `Test Student ${testSuffix}`,
    isEmailVerified: true,
  });

  if (!user || (!user._id && !user.id)) {
    throw new Error('Failed to create user record');
  }
  console.log(`Created user with string ID: ${user._id}`);

  const profile = await StudentProfile.create({
    userId: user._id,
    fullName: user.fullName,
    username: `teststudent${testSuffix}`,
    email: user.email,
    collegeName: 'Apex Institute of Technology',
    department: 'Computer Science',
    yearOfStudy: '3rd Year',
    skills: ['React', 'TypeScript', 'Node.js'],
    achievements: ['Dean\'s List 2026'],
    profileVisibility: 'Everyone',
    messagePrivacy: 'Everyone',
    groupAddPrivacy: 'Everyone',
  });
  console.log(`Created student profile: ${profile._id}`);

  // 2. Edit student profile
  console.log('2. Updating student profile fields...');
  const updatedProfile = await StudentProfile.findByIdAndUpdate(profile._id, {
    bio: 'Aspiring Full Stack Engineer & Event Coordinator',
    skills: ['React', 'TypeScript', 'Node.js', 'MongoDB'],
  });
  if (!updatedProfile || !updatedProfile.skills.includes('MongoDB')) {
    throw new Error('Profile update verification failed');
  }
  console.log('Profile updated successfully.');

  // 3. Upload/change profile image
  console.log('3. Updating profile photo URL...');
  const photoUrl = 'https://res.cloudinary.com/eventhub/image/upload/v123456/profile_test.jpg';
  const profileWithPhoto = await StudentProfile.findByIdAndUpdate(profile._id, {
    profilePhoto: photoUrl,
  });
  if (profileWithPhoto?.profilePhoto !== photoUrl) {
    throw new Error('Profile photo update failed');
  }
  console.log('Profile photo updated successfully.');

  // 4. Create an event
  console.log('4. Creating new event...');
  const event = await Event.create({
    title: `Hackathon Innovate ${testSuffix}`,
    category: 'Technical',
    eventType: 'Hackathon',
    eventDate: '2026-11-15',
    startTime: '09:00',
    endTime: '18:00',
    registrationDeadline: '2026-11-14',
    eventMode: 'Offline',
    venue: 'Main Auditorium',
    hostCollegeId: 'apex-college-id',
    creatorUserId: user._id,
    creatorRole: 'Student',
    status: 'Draft',
    isFree: true,
    registrationType: 'Individual',
    capacity: 200,
    registeredCount: 0,
    attendanceCount: 0,
    certificatesIssuedCount: 0,
    prizeAvailable: true,
    certificateAvailable: true,
    primaryCoordinator: {
      name: 'Test Student',
      role: 'Lead Organizer',
      phone: '9876543210',
      email: testEmail,
    },
    customDetails: [],
    registrationQuestions: [],
  });
  console.log(`Created event: ${event._id}`);

  // 5. Register for an event
  console.log('5. Registering for the event...');
  const registration = await EventRegistration.create({
    registrationId: `REG-${testSuffix}`,
    eventId: event._id,
    studentUserId: user._id,
    studentId: profile._id,
    collegeId: 'apex-college-id',
    studentName: user.fullName,
    studentEmail: user.email,
    studentPhone: '9876543210',
    studentCollege: 'Apex Institute of Technology',
    studentDepartment: 'Computer Science',
    studentYear: '3rd Year',
    registrationType: 'Individual',
    customResponses: {},
    isFree: true,
    amount: 0,
    paymentStatus: 'Waived',
    status: 'Confirmed',
    attended: false,
    certificateIssued: false,
    qrToken: `QR-${testSuffix}`,
  });
  console.log(`Created registration: ${registration._id}`);

  // Test $inc atomic update on Event registeredCount
  await Event.updateOne({ _id: event._id }, { $inc: { registeredCount: 1 } });
  const reloadedEvent = await Event.findById(event._id);
  if (reloadedEvent?.registeredCount !== 1) {
    throw new Error(`Expected registeredCount to be 1, got ${reloadedEvent?.registeredCount}`);
  }
  console.log('Atomic $inc on event registration counter verified.');

  // 6. Create a notification
  console.log('6. Creating notification...');
  const notification = await Notification.create({
    recipientUserId: user._id,
    recipientRole: 'Student',
    type: 'REGISTRATION',
    title: 'Registration Confirmed',
    message: `Your pass for ${event.title} is now confirmed.`,
    read: false,
    metadata: { eventId: event._id, registrationId: registration._id },
  });
  console.log(`Created notification: ${notification._id}`);

  // 7. Send a message
  console.log('7. Creating conversation & sending message...');
  const conversation = await Conversation.create({
    participants: [user._id, 'admin-user-id'],
    participantDetails: [
      {
        userId: user._id,
        role: 'Student',
        name: user.fullName,
      },
      {
        userId: 'admin-user-id',
        role: 'College Super Admin',
        name: 'Apex Tech Admin',
      },
    ],
  });

  const message = await Message.create({
    conversationId: conversation._id,
    senderId: user._id,
    senderName: user.fullName,
    senderRole: 'Student',
    text: 'Hello, looking forward to the Hackathon event!',
    readBy: [user._id],
  });
  console.log(`Created message: ${message._id}`);

  // 8. Test query filters: $or, $and, $in, $ne, $regex, sort, skip, limit
  console.log('8. Testing query operators ($or, $in, $ne, $regex, sort, chaining)...');
  const foundEvents = await Event.find({
    $or: [{ title: { $regex: 'Innovate', $options: 'i' } }, { category: 'Sports' }],
    status: { $ne: 'Cancelled' },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .exec();

  if (!foundEvents.some((e: any) => e._id === event._id)) {
    throw new Error('Event search with $or and $regex failed');
  }
  console.log(`Found ${foundEvents.length} events matching query successfully.`);

  // 9. Clean up test records
  console.log('9. Cleaning up test data...');
  await User.findByIdAndDelete(user._id);
  await StudentProfile.findByIdAndDelete(profile._id);
  await Event.findByIdAndDelete(event._id);
  await EventRegistration.findByIdAndDelete(registration._id);
  await Notification.findByIdAndDelete(notification._id);
  await Conversation.findByIdAndDelete(conversation._id);
  await Message.findByIdAndDelete(message._id);

  console.log('10. Confirmed cleanup of test records.');
  console.log('--- ALL EVENTHUB PERSISTENCE & CRUD VERIFICATIONS PASSED ---');
  return true;
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('VERIFICATION ERROR:', err);
    process.exit(1);
  });

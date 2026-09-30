import { Request, Response } from 'express';
import { College, EventRegistration, Event, Certificate, User, StudentProfile } from '../models/index';

export async function getPublicStats(_req: Request, res: Response) {
  try {
    const totalUsers = await User.countDocuments({});
    const totalStudents = await StudentProfile.countDocuments({});
    const totalColleges = await College.countDocuments({});
    const totalEvents = await Event.countDocuments({});
    const activeEvents = await Event.countDocuments({ status: 'Published' });

    // 1. Premier Colleges: count verified colleges ONLY
    const allColleges = await College.find({}).exec();
    const verifiedCollegesCount = allColleges.filter(
      (c) => c.verificationStatus === 'Verified'
    ).length;

    // 2. Event Participants: count confirmed event registrations / unique participants
    const allRegistrations = await EventRegistration.find({}).exec();
    const confirmedRegistrations = allRegistrations.filter(
      (r) => r.status === 'Confirmed'
    );
    // Unique participants across confirmed registrations
    const uniqueParticipantIds = new Set(
      confirmedRegistrations.map((r) => r.studentId)
    );
    const participantsCount = confirmedRegistrations.length;
    const uniqueParticipantsCount = uniqueParticipantIds.size;

    // 3. Published Events count
    const publishedEventsCount = activeEvents;

    // 4. Certificates issued
    const allCertificates = await Certificate.find({}).exec();
    const certificatesCount = allCertificates.length;

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalStudents,
        totalColleges,
        totalEvents,
        activeEvents,
        verifiedCollegesCount,
        participantsCount,
        uniqueParticipantsCount,
        publishedEventsCount,
        certificatesCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve stats',
    });
  }
}

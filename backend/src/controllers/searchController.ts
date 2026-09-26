import { Request, Response } from 'express';
import { StudentProfile, College, Event } from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Global Search endpoint: Students, Colleges, and Events
 * GET /api/search/global?q=...&type=all|students|colleges|events
 */
export async function globalSearch(req: AuthenticatedRequest, res: Response) {
  try {
    const { q = '', type = 'all' } = req.query;
    const query = String(q).trim().toLowerCase();

    if (!query) {
      return res.json({
        success: true,
        query: '',
        students: [],
        colleges: [],
        events: [],
        total: 0,
      });
    }

    const cleanQuery = query.replace(/^@/, '');

    let studentsResult: any[] = [];
    let collegesResult: any[] = [];
    let eventsResult: any[] = [];

    // 1. Search Students
    if (type === 'all' || type === 'students') {
      const allStudents = await StudentProfile.find().limit(50).exec();
      studentsResult = allStudents
        .filter((s) => {
          const matchName = s.fullName && s.fullName.toLowerCase().includes(query);
          const matchUsername = s.username && s.username.toLowerCase().includes(cleanQuery);
          const matchCollege = s.collegeName && s.collegeName.toLowerCase().includes(query);
          const matchDept = s.department && s.department.toLowerCase().includes(query);
          return matchName || matchUsername || matchCollege || matchDept;
        })
        .slice(0, 8)
        .map((s) => ({
          _id: s._id,
          userId: s.userId,
          fullName: s.fullName,
          username: s.username ? (s.username.startsWith('@') ? s.username : `@${s.username}`) : undefined,
          collegeName: s.collegeName,
          department: s.department,
          profilePhoto: s.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          profileVisibility: s.profileVisibility || 'Public',
        }));
    }

    // 2. Search Colleges
    if (type === 'all' || type === 'colleges') {
      const allColleges = await College.find().limit(50).exec();
      collegesResult = allColleges
        .filter((c) => {
          const matchName = c.name && c.name.toLowerCase().includes(query);
          const matchUsername = c.username && c.username.toLowerCase().includes(cleanQuery);
          const matchLocation = c.location && c.location.toLowerCase().includes(query);
          const matchDomain = c.officialDomain && c.officialDomain.toLowerCase().includes(query);
          return matchName || matchUsername || matchLocation || matchDomain;
        })
        .slice(0, 8)
        .map((c) => ({
          _id: c._id,
          name: c.name,
          username: c.username ? (c.username.startsWith('@') ? c.username : `@${c.username}`) : undefined,
          location: c.location,
          logo: c.logo || 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=120&auto=format&fit=crop&q=80',
          verificationStatus: c.verificationStatus,
          isVerified: c.verificationStatus === 'Verified',
        }));
    }

    // 3. Search Events
    if (type === 'all' || type === 'events') {
      const allEvents = await Event.find({ status: 'Published' }).limit(50).exec();
      eventsResult = allEvents
        .filter((e) => {
          const matchTitle = e.title && e.title.toLowerCase().includes(query);
          const matchCategory = e.category && e.category.toLowerCase().includes(query);
          const matchCollege = e.hostCollegeName && e.hostCollegeName.toLowerCase().includes(query);
          const matchType = e.eventType && e.eventType.toLowerCase().includes(query);
          const matchDesc = e.description && e.description.toLowerCase().includes(query);
          return matchTitle || matchCategory || matchCollege || matchType || matchDesc;
        })
        .slice(0, 8)
        .map((e) => ({
          _id: e._id,
          title: e.title,
          poster: e.poster || e.hostCollegeLogo,
          hostCollegeId: e.hostCollegeId,
          hostCollegeName: e.hostCollegeName,
          category: e.category,
          eventDate: e.eventDate,
          eventMode: e.eventMode,
          isFree: e.isFree,
          registrationFee: e.registrationFee,
        }));
    }

    return res.json({
      success: true,
      query,
      students: studentsResult,
      colleges: collegesResult,
      events: eventsResult,
      total: studentsResult.length + collegesResult.length + eventsResult.length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

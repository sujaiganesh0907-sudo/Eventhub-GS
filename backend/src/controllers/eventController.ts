import { Request, Response } from 'express';
import { Event, College, StudentProfile, Notification, IEvent, ICollege, User, EventRegistration, RegistrationQR, Certificate, CollegeAdminMembership, OrganizerProfile } from '../models/index';
import { AuthenticatedRequest } from '../middleware/auth';
import { updateEventGroupLifecycle } from '../services/eventGroupService';
import { sendProposalSubmittedEmail, sendProposalDecisionEmail } from '../services/emailService';

function calculateDeadlineStatus(deadlineStr: string): 'Open' | 'Closing Soon' | 'Closed' {
  if (!deadlineStr) return 'Open';
  const deadline = new Date(deadlineStr).getTime();
  const now = Date.now();
  if (now > deadline) return 'Closed';
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);
  if (hoursLeft <= 24) return 'Closing Soon';
  return 'Open';
}

function enrichEvent(event: IEvent) {
  const seatsLeft = Math.max(0, event.capacity - (event.registeredCount || 0));
  const deadlineStatus = calculateDeadlineStatus(event.registrationDeadline);
  const isFull = (event.registeredCount || 0) >= event.capacity;
  const isClosed = deadlineStatus === 'Closed' || isFull;

  return {
    ...event,
    seatsLeft,
    deadlineStatus,
    isFull,
    isClosed,
  };
}

export async function getEvents(req: Request, res: Response) {
  try {
    const {
      search,
      category,
      mode,
      isFree,
      collegeId,
      status,
      upcoming,
      popular,
      limit = 50,
      skip = 0,
    } = req.query;

    const filter: any = {};
    const authUser = (req as any).user;

    if (status && status !== 'Published') {
      // Only allow querying Draft/Pending events if authenticated and authorized for college or creator
      let canViewUnpublished = false;
      if (authUser) {
        if (collegeId && (authUser.collegeId === collegeId)) {
          canViewUnpublished = true;
        } else if (authUser.role === 'College Super Admin' || authUser.role === 'College Admin') {
          canViewUnpublished = true;
        }
      }
      filter.status = canViewUnpublished ? status : 'Published';
    } else {
      filter.status = 'Published'; // Default public discovery shows Published
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (mode && mode !== 'All') {
      filter.eventMode = mode;
    }

    if (isFree !== undefined && isFree !== '') {
      filter.isFree = isFree === 'true';
    }

    if (collegeId) {
      filter.hostCollegeId = collegeId;
    }

    let query = Event.find(filter);

    if (popular === 'true') {
      query = query.sort({ viewsCount: -1, registeredCount: -1 });
    } else if (upcoming === 'true') {
      query = query.sort({ eventDate: 1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    let events = await query.exec();

    // Client/Text search if specified
    if (search) {
      const term = String(search).toLowerCase();
      events = events.filter((e) =>
        e.title.toLowerCase().includes(term) ||
        (e.tagline && e.tagline.toLowerCase().includes(term)) ||
        e.category.toLowerCase().includes(term) ||
        e.hostCollegeName.toLowerCase().includes(term) ||
        (e.venue && e.venue.toLowerCase().includes(term))
      );
    }

    const total = events.length;
    const paginated = events.slice(Number(skip), Number(skip) + Number(limit));
    const enriched = paginated.map(enrichEvent);

    return res.json({
      success: true,
      total,
      events: enriched,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getEventById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Backend protection for Draft/Pending events (Requirements 1 & 4)
    if (event.status !== 'Published') {
      const u = req.user;
      let authorized = false;
      if (u) {
        if (event.creatorUserId === u._id || (event as any).createdBy === u._id) {
          authorized = true;
        } else if (u.collegeId && (u.collegeId === event.hostCollegeId || u.collegeId === event.targetCollegeId)) {
          authorized = true;
        } else {
          const membership = await CollegeAdminMembership.findOne({
            collegeId: event.hostCollegeId,
            userId: u._id,
            status: 'Active',
          });
          if (membership) authorized = true;
        }
      }
      if (!authorized) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This event has not been published or approved.',
        });
      }
    }

    // Increment views
    await Event.updateOne({ _id: id }, { $inc: { viewsCount: 1 } });
    event.viewsCount = (event.viewsCount || 0) + 1;

    let isRegistered = false;
    let userRegistration = null;
    let userCertificate = null;

    const user = req.user;
    if (user && user.role === 'Student') {
      const reg = await EventRegistration.findOne({
        eventId: event._id,
        $or: [
          { studentUserId: user._id },
          { studentEmail: user.email },
        ],
      });
      if (reg && reg.status !== 'Cancelled') {
        isRegistered = true;
        userRegistration = reg;
        if (reg.certificateIssued) {
          const cert = await Certificate.findOne({
            eventId: event._id,
            $or: [
              { registrationId: reg.registrationId },
              { studentUserId: user._id },
            ],
          });
          userCertificate = cert || null;
        }
      }
    }

    return res.json({
      success: true,
      event: enrichEvent(event),
      isRegistered,
      registration: userRegistration,
      certificate: userCertificate,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function createEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const body = req.body;

    // Validation
    const required = [
      'title',
      'poster',
      'category',
      'description',
      'eventDate',
      'startTime',
      'endTime',
      'registrationDeadline',
      'eventMode',
      'registrationType',
      'capacity',
      'rulesAndGuidelines',
    ];

    for (const field of required) {
      if (!body[field]) {
        return res.status(400).json({ success: false, message: `Field '${field}' is required.` });
      }
    }

    body.title = (body.title || '').trim();
    if (!body.title) {
      return res.status(400).json({ success: false, message: 'Event Name is required.' });
    }
    if (body.title.length > 15) {
      return res.status(400).json({ success: false, message: 'Event Name must be maximum 15 characters.' });
    }

    body.description = (body.description || '').trim();
    if (!body.description) {
      return res.status(400).json({ success: false, message: 'Event Description is required.' });
    }
    const wordCount = body.description ? body.description.trim().split(/\s+/).filter(Boolean).length : 0;
    if (wordCount > 500) {
      return res.status(400).json({ success: false, message: 'Event Description must be maximum 500 words.' });
    }

    if (!body.primaryCoordinator || !body.primaryCoordinator.name || !body.primaryCoordinator.phone || !body.primaryCoordinator.email) {
      return res.status(400).json({ success: false, message: 'Primary coordinator details (name, phone, email) are required.' });
    }

    const coordPhone = String(body.primaryCoordinator.phone).replace(/[\s\-()]/g, '');
    if (!/^[6-9]\d{9}$/.test(coordPhone) && !/^\d{10}$/.test(coordPhone)) {
      return res.status(400).json({ success: false, message: 'Coordinator phone number must be exactly 10 digits.' });
    }

    if (body.meetingLink && !/^https?:\/\/.+/i.test(body.meetingLink.trim())) {
      return res.status(400).json({ success: false, message: 'Meeting link must be a valid HTTP or HTTPS URL.' });
    }

    if (!body.isFree) {
      const fee = Number(body.registrationFee);
      if (isNaN(fee) || fee <= 0) {
        return res.status(400).json({ success: false, message: 'Paid events must have a valid registration fee in INR.' });
      }
      if (!body.paymentConfig?.upiId || !/^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(body.paymentConfig.upiId.trim())) {
        return res.status(400).json({ success: false, message: 'A valid Beneficiary UPI ID (e.g. name@bank) is required for paid events.' });
      }
    }

    // Date validation
    const eventStart = new Date(`${body.eventDate}T${body.startTime}`).getTime();
    const eventEnd = new Date(`${body.eventDate}T${body.endTime}`).getTime();
    const deadline = new Date(body.registrationDeadline).getTime();

    if (isNaN(deadline) || deadline > eventStart) {
      return res.status(400).json({ success: false, message: 'Registration deadline must be before event start time.' });
    }

    if (eventEnd <= eventStart) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }

    // Conditional mode checks
    if ((body.eventMode === 'Offline' || body.eventMode === 'Hybrid') && !body.venue) {
      return res.status(400).json({ success: false, message: 'Venue is required for Offline/Hybrid events.' });
    }

    if ((body.eventMode === 'Online' || body.eventMode === 'Hybrid') && !body.meetingLink) {
      return res.status(400).json({ success: false, message: 'Meeting link is required for Online/Hybrid events.' });
    }

    let hostCollegeId = '';
    let hostCollegeName = '';
    let hostCollegeLogo = '';
    let isCollegeVerified = false;
    let initialStatus: 'Draft' | 'Pending Approval' | 'Published' = 'Published';
    let targetCollegeId = body.targetCollegeId;
    let organizerOrgName = '';

    if (user.role === 'Organizer') {
      const orgProf = await OrganizerProfile.findOne({ userId: user._id });
      organizerOrgName = orgProf?.organizationName || user.fullName;
      if (!targetCollegeId) {
        return res.status(400).json({ success: false, message: 'Target Partner College must be selected for organizer event proposals.' });
      }
      const targetCol = await College.findById(targetCollegeId);
      if (!targetCol) {
        return res.status(400).json({ success: false, message: 'Selected Target College does not exist.' });
      }
      hostCollegeId = targetCol._id;
      hostCollegeName = targetCol.name;
      hostCollegeLogo = targetCol.logo;
      isCollegeVerified = targetCol.verificationStatus === 'Verified';
      initialStatus = body.saveAsDraft ? 'Draft' : 'Pending Approval';
    } else if (user.role === 'Student') {
      // Student must specify a Target College
      if (!targetCollegeId) {
        return res.status(400).json({ success: false, message: 'Target College must be selected for participant event proposals.' });
      }
      const targetCol = await College.findById(targetCollegeId);
      if (!targetCol) {
        return res.status(400).json({ success: false, message: 'Selected Target College does not exist.' });
      }
      hostCollegeId = targetCol._id;
      hostCollegeName = targetCol.name;
      hostCollegeLogo = targetCol.logo;
      isCollegeVerified = targetCol.verificationStatus === 'Verified';
      initialStatus = body.saveAsDraft ? 'Draft' : 'Pending Approval';
    } else {
      // College admin / Approver
      let college: ICollege | null | undefined = req.college;
      if (!college && user.collegeId) {
        college = await College.findById(user.collegeId);
      }
      if (!college && user.role === 'College Super Admin') {
        college = await College.findOne({ superAdminId: user._id });
      }
      if (!college) {
        const m = await CollegeAdminMembership.findOne({ userId: user._id, status: 'Active' });
        if (m) college = await College.findById(m.collegeId);
      }
      if (!college) {
        return res.status(400).json({ success: false, message: 'College association missing' });
      }
      hostCollegeId = college._id;
      hostCollegeName = college.name;
      hostCollegeLogo = college.logo;
      isCollegeVerified = college.verificationStatus === 'Verified';
      initialStatus = body.saveAsDraft ? 'Draft' : 'Published';
    }

    const event = await Event.create({
      title: body.title,
      poster: body.poster,
      hostCollegeId,
      hostCollegeName,
      hostCollegeLogo,
      isCollegeVerified,
      category: body.category,
      eventType: body.eventType || 'Technical',
      tagline: body.tagline || '',
      description: body.description,
      
      eventDate: body.eventDate,
      startTime: body.startTime,
      endTime: body.endTime,
      registrationDeadline: body.registrationDeadline,
      reportingTime: body.reportingTime || '',
      registrationOpensOn: body.registrationOpensOn || new Date().toISOString().split('T')[0],
      
      eventMode: body.eventMode,
      venue: body.venue || '',
      hallRoom: body.hallRoom || '',
      buildingBlock: body.buildingBlock || '',
      address: body.address || '',
      googleMapsLink: body.googleMapsLink || '',
      transportParkingNotes: body.transportParkingNotes || '',
      meetingPlatform: body.meetingPlatform || '',
      meetingLink: body.meetingLink || '',
      
      registrationType: body.registrationType,
      minTeamSize: body.registrationType === 'Team' ? Number(body.minTeamSize) || 2 : 1,
      maxTeamSize: body.registrationType === 'Team' ? Number(body.maxTeamSize) || 4 : 1,
      isFree: body.isFree !== false,
      registrationFee: body.isFree ? 0 : Number(body.registrationFee) || 0,
      capacity: Number(body.capacity) || 100,
      registeredCount: 0,
      
      educationLevel: Array.isArray(body.educationLevel) ? body.educationLevel : ['UG', 'PG'],
      departments: Array.isArray(body.departments) ? body.departments : ['All Departments'],
      eligibleYears: Array.isArray(body.eligibleYears) ? body.eligibleYears : ['All Years'],
      genderRestriction: body.genderRestriction || 'None',
      institutionRestriction: body.institutionRestriction || 'Open to All Colleges',
      additionalEligibilityNotes: body.additionalEligibilityNotes || '',
      
      rulesAndGuidelines: body.rulesAndGuidelines || '',
      hasMultipleRounds: Boolean(body.hasMultipleRounds),
      rounds: Boolean(body.hasMultipleRounds) && Array.isArray(body.rounds)
        ? body.rounds.filter((r: any) => r && r.name && r.name.trim())
        : [],
      requiredMaterials: body.requiredMaterials || '',
      thingsToCarry: body.thingsToCarry || '',
      softwareRequirements: body.softwareRequirements || '',
      hardwareRequirements: body.hardwareRequirements || '',
      submissionRequirements: body.submissionRequirements || '',
      dressCode: body.dressCode || '',
      
      prizeAvailable: Boolean(body.prizeAvailable),
      totalPrizePool: body.prizeAvailable ? Number(body.totalPrizePool) || 0 : 0,
      firstPrize: body.prizeAvailable ? body.firstPrize || '' : '',
      secondPrize: body.prizeAvailable ? body.secondPrize || '' : '',
      thirdPrize: body.prizeAvailable ? body.thirdPrize || '' : '',
      specialPrize: body.prizeAvailable ? body.specialPrize || '' : '',
      prizeNotes: body.prizeAvailable ? body.prizeNotes || '' : '',
      
      certificateAvailable: Boolean(body.certificateAvailable),
      participationCertificate: body.certificateAvailable ? Boolean(body.participationCertificate) : false,
      winnerCertificate: body.certificateAvailable ? Boolean(body.winnerCertificate) : false,
      certificateType: body.certificateType || 'Digital',
      certificateEligibility: body.certificateAvailable ? body.certificateEligibility || '' : '',
      deliveryMethod: body.certificateAvailable ? body.deliveryMethod || '' : '',
      
      primaryCoordinator: body.primaryCoordinator,
      secondaryCoordinator: body.secondaryCoordinator?.name?.trim() ? body.secondaryCoordinator : undefined,
      helpdeskContact: body.helpdeskContact || '',
      
      facilities: body.facilities || {
        food: false,
        accommodation: false,
        transport: false,
        parking: false,
      },
      importantNotes: body.importantNotes || '',
      reportingInstructions: body.reportingInstructions || '',
      idRequirement: body.idRequirement || '',
      
      paymentConfig: body.paymentConfig || {},
      customDetails: Array.isArray(body.customDetails)
        ? body.customDetails.filter((cd: any) => cd && cd.label && cd.label.trim() && cd.value && cd.value.trim())
        : [],
      registrationQuestions: Array.isArray(body.registrationQuestions) ? body.registrationQuestions : [],
      
      creatorRole: user.role === 'Student' ? 'Student' : (user.role === 'Organizer' ? 'Organizer' : 'College'),
      creatorUserId: user._id,
      organizerOrganization: organizerOrgName || undefined,
      targetCollegeId,
      status: initialStatus,
      viewsCount: 0,
      attendanceCount: 0,
      certificatesIssuedCount: 0,
    });

    // Notify target college if student or organizer submitted proposal
    if ((user.role === 'Student' || user.role === 'Organizer') && initialStatus === 'Pending Approval') {
      const collegeSuperAdmin = await User.findOne({
        $or: [{ collegeId: hostCollegeId }, { _id: (await College.findById(hostCollegeId))?.superAdminId }],
        role: 'College Super Admin',
      });
      if (collegeSuperAdmin) {
        await Notification.create({
          recipientUserId: collegeSuperAdmin._id,
          type: 'EVENT_APPROVAL',
          title: user.role === 'Organizer' ? 'New Organizer Event Proposal' : 'New Participant Event Proposal',
          message: `${user.role === 'Organizer' ? `Organizer ${organizerOrgName || user.fullName}` : `Participant ${user.fullName}`} submitted a proposal "${event.title}" for your approval.`,
          link: `/college/events?tab=requests`,
          read: false,
        });

        if (collegeSuperAdmin.email) {
          await sendProposalSubmittedEmail({
            approverEmail: collegeSuperAdmin.email,
            approverName: collegeSuperAdmin.fullName || 'College Administrator',
            collegeName: hostCollegeName,
            eventTitle: event.title,
            organizerName: user.role === 'Organizer' ? (organizerOrgName || user.fullName) : user.fullName,
            organizerRole: user.role === 'Organizer' ? 'Organizer' : 'Participant',
            eventDate: event.eventDate,
            venue: event.eventMode === 'Virtual' ? event.meetingLink : event.venue,
            category: event.category,
            proposalId: event._id,
          });
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: (user.role === 'Student' || user.role === 'Organizer')
        ? (initialStatus === 'Draft' ? 'Event saved as draft.' : 'Event proposal submitted to college for approval!')
        : 'Event published successfully!',
      event: enrichEvent(event),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function approveStudentEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let userCollegeId = user.collegeId;
    if (!userCollegeId) {
      if (user.role === 'College Super Admin') {
        const c = await College.findOne({ superAdminId: user._id });
        if (c) userCollegeId = c._id;
      }
      if (!userCollegeId) {
        const m = await CollegeAdminMembership.findOne({ userId: user._id, status: 'Active' });
        if (m) userCollegeId = m.collegeId;
      }
    }

    if (!userCollegeId) {
      return res.status(403).json({ success: false, message: 'Only authorized college admins can approve event requests' });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event proposal not found' });
    }

    if (event.hostCollegeId !== userCollegeId && event.targetCollegeId !== userCollegeId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to approve proposals for this institution' });
    }

    await Event.findByIdAndUpdate(id, {
      status: 'Published',
      isCollegeVerified: true,
      rejectionReason: undefined,
    });

    const hostCol = await College.findById(userCollegeId);
    const collegeName = hostCol?.name || event.hostCollegeName || 'The College';

    // Notify the creator
    await Notification.create({
      recipientUserId: event.creatorUserId,
      type: 'EVENT_APPROVAL',
      title: 'Event Proposal Approved!',
      message: `Your event proposal "${event.title}" was approved by ${collegeName} and is now live!`,
      link: `/events/${event._id}`,
      read: false,
    });

    const creatorUser = await User.findById(event.creatorUserId);
    if (creatorUser?.email) {
      await sendProposalDecisionEmail({
        recipientEmail: creatorUser.email,
        recipientName: creatorUser.fullName || 'Event Creator',
        eventTitle: event.title,
        collegeName,
        status: 'Approved',
        eventId: event._id,
      });
    }

    return res.json({ success: true, message: 'Event approved and published!' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function rejectStudentEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    let userCollegeId = user.collegeId;
    if (!userCollegeId) {
      if (user.role === 'College Super Admin') {
        const c = await College.findOne({ superAdminId: user._id });
        if (c) userCollegeId = c._id;
      }
      if (!userCollegeId) {
        const m = await CollegeAdminMembership.findOne({ userId: user._id, status: 'Active' });
        if (m) userCollegeId = m.collegeId;
      }
    }

    if (!userCollegeId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.hostCollegeId !== userCollegeId && event.targetCollegeId !== userCollegeId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to review proposals for this institution' });
    }

    await Event.findByIdAndUpdate(id, {
      status: 'Rejected',
      rejectionReason: reason.trim(),
    });

    const hostCol = await College.findById(userCollegeId);
    const collegeName = hostCol?.name || event.hostCollegeName || 'The College';

    // Notify the creator
    await Notification.create({
      recipientUserId: event.creatorUserId,
      type: 'EVENT_REJECTION',
      title: 'Event Proposal Needs Revision',
      message: `Your event proposal "${event.title}" was rejected: ${reason.trim()}`,
      link: `/student/events?tab=pending`,
      read: false,
    });

    const creatorUser = await User.findById(event.creatorUserId);
    if (creatorUser?.email) {
      await sendProposalDecisionEmail({
        recipientEmail: creatorUser.email,
        recipientName: creatorUser.fullName || 'Event Creator',
        eventTitle: event.title,
        collegeName,
        status: 'Rejected',
        rejectionReason: reason.trim(),
        eventId: event._id,
      });
    }

    return res.json({ success: true, message: 'Event proposal marked as rejected with feedback provided.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getStudentMyEvents(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const events = await Event.find({ creatorUserId: user._id }).sort({ createdAt: -1 }).exec();
    return res.json({ success: true, events: events.map(enrichEvent) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getCollegeEvents(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    let targetCollegeId =
      (req.headers['x-college-id'] as string) ||
      (req.query.collegeId as string) ||
      user.collegeId;

    if (!targetCollegeId) {
      if (user.role === 'College Super Admin') {
        const c = await College.findOne({ superAdminId: user._id });
        if (c) targetCollegeId = c._id;
      }
      if (!targetCollegeId) {
        const m = await CollegeAdminMembership.findOne({ userId: user._id, status: 'Active' });
        if (m) targetCollegeId = m.collegeId;
      }
    }

    if (!targetCollegeId) {
      return res.status(403).json({ success: false, message: 'College account required' });
    }

    let isAuthorized = false;
    if (user.role === 'College Super Admin') {
      const c = await College.findById(targetCollegeId);
      if (c && (c.superAdminId === user._id || user.collegeId === targetCollegeId)) {
        isAuthorized = true;
      }
    }
    if (!isAuthorized) {
      const membership = await CollegeAdminMembership.findOne({
        collegeId: targetCollegeId,
        userId: user._id,
        status: 'Active',
      });
      if (membership) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Access forbidden. Active college administration required.' });
    }

    const events = await Event.find({ hostCollegeId: targetCollegeId }).sort({ createdAt: -1 }).exec();
    return res.json({ success: true, events: events.map(enrichEvent) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getCollegeStudentRequests(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    let targetCollegeId =
      (req.headers['x-college-id'] as string) ||
      (req.query.collegeId as string) ||
      user.collegeId;

    if (!targetCollegeId) {
      if (user.role === 'College Super Admin') {
        const c = await College.findOne({ superAdminId: user._id });
        if (c) targetCollegeId = c._id;
      }
      if (!targetCollegeId) {
        const m = await CollegeAdminMembership.findOne({ userId: user._id, status: 'Active' });
        if (m) targetCollegeId = m.collegeId;
      }
    }

    if (!targetCollegeId) {
      return res.status(403).json({ success: false, message: 'College account required' });
    }

    let isAuthorized = false;
    if (user.role === 'College Super Admin') {
      const c = await College.findById(targetCollegeId);
      if (c && (c.superAdminId === user._id || user.collegeId === targetCollegeId)) {
        isAuthorized = true;
      }
    }
    if (!isAuthorized) {
      const membership = await CollegeAdminMembership.findOne({
        collegeId: targetCollegeId,
        userId: user._id,
        status: 'Active',
      });
      if (membership) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Access forbidden. Active college administration required.' });
    }

    const requests = await Event.find({
      $or: [{ hostCollegeId: targetCollegeId }, { targetCollegeId: targetCollegeId }],
      creatorRole: { $in: ['Student', 'Organizer'] },
    }).sort({ createdAt: -1 }).exec();

    return res.json({ success: true, requests: requests.map(enrichEvent) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getEventInsights(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // Authorization check
    const isStudent = user.role === 'Student';
    const isCreator = event.creatorUserId === user._id;
    const isHostCollege = user.collegeId && event.hostCollegeId === user.collegeId;

    if (isStudent && !isCreator) {
      return res.status(403).json({ success: false, message: 'You can only view analytics for events you organized.' });
    }
    if (!isStudent && !isHostCollege) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view analytics for this college event.' });
    }

    // Fetch real registrations
    const registrationsList = await EventRegistration.find({ eventId: event._id }).sort({ createdAt: -1 }).exec();

    const views = event.viewsCount || 0;
    const totalRegistrations = registrationsList.length;
    const capacity = event.capacity || 100;
    const seatsFilledPercent = Math.min(100, Math.round((totalRegistrations / capacity) * 100));
    const conversionRate = views > 0 ? ((totalRegistrations / views) * 100).toFixed(1) : '0.0';
    const revenue = event.isFree ? 0 : registrationsList.filter((r: any) => r.paymentStatus === 'Completed').length * (event.registrationFee || 0);

    const attendedCount = registrationsList.filter((r: any) => r.attended).length;
    const attendanceRate = totalRegistrations > 0 ? Math.round((attendedCount / totalRegistrations) * 100) : 0;

    // Breakdown maps
    const departmentBreakdown: Record<string, number> = {};
    const collegeBreakdown: Record<string, number> = {};

    for (const reg of registrationsList) {
      if (reg.studentDepartment) {
        departmentBreakdown[reg.studentDepartment] = (departmentBreakdown[reg.studentDepartment] || 0) + 1;
      }
      if (reg.studentCollege) {
        collegeBreakdown[reg.studentCollege] = (collegeBreakdown[reg.studentCollege] || 0) + 1;
      }
    }

    const registeredStudents = registrationsList.map((r: any) => ({
      _id: r._id,
      registrationId: r.registrationId,
      passId: r.qrToken,
      qrToken: r.qrToken,
      qrCodeUrl: r.qrCodeUrl,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      studentPhone: r.studentPhone,
      studentCollege: r.studentCollege,
      studentDepartment: r.studentDepartment,
      studentYear: r.studentYear,
      registrationType: r.registrationType,
      teamName: r.teamName,
      paymentStatus: r.paymentStatus,
      attended: r.attended,
      attendedAt: r.attendedAt,
      status: r.status,
      createdAt: r.createdAt,
      customResponses: r.customResponses || {},
      certificateIssued: r.certificateIssued,
      certificateStatus: r.certificateStatus || (r.attended ? (r.certificateIssued ? 'Generated' : 'Pending') : 'Not Eligible'),
      certificateId: r.certificateId,
      certificateFileUrl: r.certificateFileUrl,
    }));

    return res.json({
      success: true,
      insights: {
        eventId: event._id,
        eventTitle: event.title,
        views,
        viewsCount: views,
        registrations: totalRegistrations,
        totalRegistrations,
        capacity,
        seatsFilledPercent,
        conversionRate: Number(conversionRate),
        revenue,
        totalRevenue: revenue,
        isFree: event.isFree,
        fee: event.registrationFee,
        attendanceCount: attendedCount,
        attendedCount,
        attendanceRate,
        certificatesIssuedCount: event.certificatesIssuedCount || 0,
        departmentBreakdown,
        collegeBreakdown,
        registeredStudents,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const isStudent = user.role === 'Student';
    const isCollegeStaff = user.role === 'College Super Admin' || user.role === 'College Admin';
    const isCreator = event.creatorUserId === user._id;
    const isHostCollege = isCollegeStaff && (event.hostCollegeId === user.collegeId || event.targetCollegeId === user.collegeId);

    // Permission and lifecycle rules (Requirements 15, 16, 17, 18, 19)
    if (event.status === 'Completed' || event.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: `${event.status} events cannot be modified.`,
      });
    }

    const body = req.body;

    if (isStudent) {
      if (!isCreator) {
        return res.status(403).json({ success: false, message: 'You can only edit events you created.' });
      }
      if (event.status === 'Published') {
        return res.status(403).json({
          success: false,
          message: 'Published events cannot be edited by students. Contact the host college administrator.',
        });
      }
      if (event.status === 'Pending Approval' && !body.submitForReview) {
        return res.status(400).json({
          success: false,
          message: 'Events currently pending administrative review cannot be modified until the review is completed.',
        });
      }
    } else if (isCollegeStaff) {
      if (!isHostCollege) {
        return res.status(403).json({ success: false, message: 'You are not authorized to edit events for this institution.' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Determine target status
    let nextStatus = event.status;
    if (isStudent) {
      if (body.submitForReview || body.resubmit) {
        nextStatus = 'Pending Approval';
      }
    } else if (isCollegeStaff && body.status) {
      nextStatus = body.status;
    }

    // When Published, protect all fields and allow ONLY the registration deadline to be changed
    const isPublished = event.status === 'Published';
    if (isPublished) {
      if (!body.registrationDeadline) {
        return res.status(400).json({
          success: false,
          message: 'Published events are locked. Only the registration deadline can be modified.',
        });
      }
      const newDeadline = new Date(body.registrationDeadline).getTime();
      const eventStart = new Date(`${event.eventDate}T${event.startTime}`).getTime();
      if (isNaN(newDeadline) || newDeadline > eventStart) {
        return res.status(400).json({
          success: false,
          message: 'Registration deadline must be before the event start time.',
        });
      }

      const updated = await Event.findByIdAndUpdate(
        id,
        {
          $set: {
            registrationDeadline: body.registrationDeadline,
            updatedAt: new Date().toISOString(),
          },
        },
        { new: true }
      );

      return res.json({
        success: true,
        message: 'Registration deadline updated successfully.',
        event: enrichEvent(updated || event),
      });
    }

    // Validation for drafts and pre-publication edits
    if (body.title !== undefined) {
      body.title = body.title.trim();
      if (body.title && body.title.length > 15) {
        return res.status(400).json({ success: false, message: 'Event Name must be maximum 15 characters.' });
      }
    }
    if (body.description !== undefined) {
      body.description = body.description.trim();
      const wordCount = body.description ? body.description.trim().split(/\s+/).filter(Boolean).length : 0;
      if (wordCount > 500) {
        return res.status(400).json({ success: false, message: 'Event Description must be maximum 500 words.' });
      }
    }
    if (body.primaryCoordinator?.phone) {
      const coordPhone = String(body.primaryCoordinator.phone).replace(/[\s\-()]/g, '');
      if (!/^[6-9]\d{9}$/.test(coordPhone) && !/^\d{10}$/.test(coordPhone)) {
        return res.status(400).json({ success: false, message: 'Coordinator phone number must be exactly 10 digits.' });
      }
    }

    const updated = await Event.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(body.title && { title: body.title.trim() }),
          ...(body.poster && { poster: body.poster }),
          ...(body.category && { category: body.category }),
          ...(body.eventType && { eventType: body.eventType }),
          ...(body.tagline !== undefined && { tagline: body.tagline.trim() }),
          ...(body.description && { description: body.description.trim() }),
          ...(body.eventDate && { eventDate: body.eventDate }),
          ...(body.startTime && { startTime: body.startTime }),
          ...(body.endTime && { endTime: body.endTime }),
          ...(body.registrationDeadline && { registrationDeadline: body.registrationDeadline }),
          ...(body.reportingTime !== undefined && { reportingTime: body.reportingTime.trim() }),
          ...(body.registrationOpensOn !== undefined && { registrationOpensOn: body.registrationOpensOn }),
          ...(body.eventMode && { eventMode: body.eventMode }),
          ...(body.venue !== undefined && { venue: body.venue.trim() }),
          ...(body.hallRoom !== undefined && { hallRoom: body.hallRoom.trim() }),
          ...(body.buildingBlock !== undefined && { buildingBlock: body.buildingBlock.trim() }),
          ...(body.address !== undefined && { address: body.address.trim() }),
          ...(body.googleMapsLink !== undefined && { googleMapsLink: body.googleMapsLink.trim() }),
          ...(body.transportParkingNotes !== undefined && { transportParkingNotes: body.transportParkingNotes.trim() }),
          ...(body.meetingPlatform !== undefined && { meetingPlatform: body.meetingPlatform.trim() }),
          ...(body.meetingLink !== undefined && { meetingLink: body.meetingLink.trim() }),
          ...(!isPublished && body.registrationType && { registrationType: body.registrationType }),
          ...(body.minTeamSize !== undefined && { minTeamSize: Number(body.minTeamSize) }),
          ...(body.maxTeamSize !== undefined && { maxTeamSize: Number(body.maxTeamSize) }),
          ...(!isPublished && body.isFree !== undefined && { isFree: Boolean(body.isFree) }),
          ...(!isPublished && body.registrationFee !== undefined && { registrationFee: Number(body.registrationFee) }),
          ...(body.capacity !== undefined && { capacity: Number(body.capacity) }),
          ...(body.educationLevel && { educationLevel: body.educationLevel }),
          ...(body.departments && { departments: body.departments }),
          ...(body.eligibleYears && { eligibleYears: body.eligibleYears }),
          ...(body.genderRestriction !== undefined && { genderRestriction: body.genderRestriction }),
          ...(body.institutionRestriction !== undefined && { institutionRestriction: body.institutionRestriction }),
          ...(body.additionalEligibilityNotes !== undefined && { additionalEligibilityNotes: body.additionalEligibilityNotes.trim() }),
          ...(body.rulesAndGuidelines !== undefined && { rulesAndGuidelines: body.rulesAndGuidelines.trim() }),
          ...(body.hasMultipleRounds !== undefined && { hasMultipleRounds: Boolean(body.hasMultipleRounds) }),
          ...(body.rounds !== undefined && {
            rounds: Boolean(body.hasMultipleRounds) && Array.isArray(body.rounds)
              ? body.rounds.filter((r: any) => r && r.name && r.name.trim())
              : [],
          }),
          ...(body.requiredMaterials !== undefined && { requiredMaterials: body.requiredMaterials.trim() }),
          ...(body.thingsToCarry !== undefined && { thingsToCarry: body.thingsToCarry.trim() }),
          ...(body.softwareRequirements !== undefined && { softwareRequirements: body.softwareRequirements.trim() }),
          ...(body.hardwareRequirements !== undefined && { hardwareRequirements: body.hardwareRequirements.trim() }),
          ...(body.submissionRequirements !== undefined && { submissionRequirements: body.submissionRequirements.trim() }),
          ...(body.dressCode !== undefined && { dressCode: body.dressCode.trim() }),
          ...(body.prizeAvailable !== undefined && { prizeAvailable: Boolean(body.prizeAvailable) }),
          ...(body.totalPrizePool !== undefined && { totalPrizePool: body.prizeAvailable ? Number(body.totalPrizePool) || 0 : 0 }),
          ...(body.firstPrize !== undefined && { firstPrize: body.prizeAvailable ? body.firstPrize.trim() : '' }),
          ...(body.secondPrize !== undefined && { secondPrize: body.prizeAvailable ? body.secondPrize.trim() : '' }),
          ...(body.thirdPrize !== undefined && { thirdPrize: body.prizeAvailable ? body.thirdPrize.trim() : '' }),
          ...(body.specialPrize !== undefined && { specialPrize: body.prizeAvailable ? body.specialPrize.trim() : '' }),
          ...(body.prizeNotes !== undefined && { prizeNotes: body.prizeAvailable ? body.prizeNotes.trim() : '' }),
          ...(body.certificateAvailable !== undefined && { certificateAvailable: Boolean(body.certificateAvailable) }),
          ...(body.participationCertificate !== undefined && { participationCertificate: body.certificateAvailable ? Boolean(body.participationCertificate) : false }),
          ...(body.winnerCertificate !== undefined && { winnerCertificate: body.certificateAvailable ? Boolean(body.winnerCertificate) : false }),
          ...(body.certificateType !== undefined && { certificateType: body.certificateType }),
          ...(body.certificateEligibility !== undefined && { certificateEligibility: body.certificateAvailable ? body.certificateEligibility.trim() : '' }),
          ...(body.deliveryMethod !== undefined && { deliveryMethod: body.certificateAvailable ? body.deliveryMethod.trim() : '' }),
          ...(body.primaryCoordinator && { primaryCoordinator: body.primaryCoordinator }),
          ...(body.secondaryCoordinator !== undefined && {
            secondaryCoordinator: body.secondaryCoordinator?.name?.trim() ? body.secondaryCoordinator : undefined,
          }),
          ...(body.helpdeskContact !== undefined && { helpdeskContact: body.helpdeskContact.trim() }),
          ...(body.facilities !== undefined && { facilities: body.facilities }),
          ...(body.importantNotes !== undefined && { importantNotes: body.importantNotes.trim() }),
          ...(body.reportingInstructions !== undefined && { reportingInstructions: body.reportingInstructions.trim() }),
          ...(body.idRequirement !== undefined && { idRequirement: body.idRequirement.trim() }),
          ...(body.paymentConfig !== undefined && { paymentConfig: body.paymentConfig }),
          ...(body.customDetails !== undefined && {
            customDetails: Array.isArray(body.customDetails)
              ? body.customDetails.filter((cd: any) => cd && cd.label && cd.label.trim() && cd.value && cd.value.trim())
              : [],
          }),
          ...(!isPublished && body.registrationQuestions && { registrationQuestions: body.registrationQuestions }),
          ...(body.changesRequestedComment !== undefined && { changesRequestedComment: body.changesRequestedComment }),
          status: nextStatus,
        },
      },
      { new: true }
    );

    // PART 5C: Propagate event lifecycle changes to associated Event Group
    if (nextStatus === 'Completed' || nextStatus === 'Cancelled') {
      await updateEventGroupLifecycle(id, nextStatus);
    }

    return res.json({
      success: true,
      message: 'Event updated successfully.',
      event: updated ? enrichEvent(updated) : enrichEvent(event),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const isStudent = user.role === 'Student';
    const isOrganizer = user.role === 'Organizer';
    const isCollegeStaff = user.role === 'College Super Admin' || user.role === 'College Admin';
    const isCreator = event.creatorUserId === user._id || (event as any).createdBy === user._id;

    let userCollegeId = user.collegeId;
    if (!userCollegeId && isCollegeStaff) {
      const c = await College.findOne({ superAdminId: user._id });
      if (c) userCollegeId = c._id;
      if (!userCollegeId) {
        const m = await CollegeAdminMembership.findOne({ userId: user._id, status: 'Active' });
        if (m) userCollegeId = m.collegeId;
      }
    }

    const isHostCollege = isCollegeStaff && (
      (userCollegeId && (event.hostCollegeId === userCollegeId || event.targetCollegeId === userCollegeId)) ||
      user.role === 'College Super Admin'
    );

    // Permission rules:
    if (isStudent) {
      if (!isCreator) {
        return res.status(403).json({ success: false, message: 'You can only delete events you created.' });
      }
      if (event.status === 'Published') {
        return res.status(403).json({
          success: false,
          message: 'Approved events cannot be deleted by students. Contact the host college administrator.',
        });
      }
    } else if (isOrganizer) {
      if (!isCreator) {
        return res.status(403).json({ success: false, message: 'You can only delete events you organized.' });
      }
    } else if (isCollegeStaff) {
      if (!isHostCollege && !isCreator) {
        return res.status(403).json({ success: false, message: 'You are not authorized to delete events for this institution.' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await Event.findByIdAndDelete(id);
    await EventRegistration.deleteMany({ eventId: id });
    await RegistrationQR.deleteMany({ eventId: id });

    // PART 5C: Mark linked Event Group as Cancelled/Archived
    try {
      await updateEventGroupLifecycle(id, 'Cancelled');
    } catch (groupErr: any) {
      console.warn('Could not update event group lifecycle on delete:', groupErr?.message || groupErr);
    }

    return res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

import { Router } from 'express';
import {
  studentRegister,
  collegeRegister,
  verifyEmail,
  requestStudentOtp,
  requestCollegeOtp,
  verifyOtp,
  resendOtp,
  login,
  getCurrentUser,
  refreshToken,
} from '../controllers/authController';
import { getPublicStats } from '../controllers/statsController';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  approveStudentEvent,
  rejectStudentEvent,
  getStudentMyEvents,
  getCollegeEvents,
  getCollegeStudentRequests,
  getEventInsights,
} from '../controllers/eventController';
import {
  registerForEvent,
  getStudentRegistrations,
  getCollegeRegistrations,
  getRegistrationTicket,
} from '../controllers/registrationController';
import {
  createPaymentOrder,
  verifyPayment,
} from '../controllers/paymentController';
import {
  verifyAndScanQR,
  markAttendance,
  getEventAttendanceList,
  finishAttendance,
  downloadAttendanceReport,
} from '../controllers/attendanceController';
import {
  issueCertificate,
  addStudentCertificate,
  getMyCertificates,
  getStudentCertificates,
  deleteCertificate,
  updateCertificate,
  retryCertificateEmail,
} from '../controllers/certificateController';
import {
  getStudentProfile,
  updateStudentProfile,
  searchStudents,
} from '../controllers/studentController';
import {
  getColleges,
  getCollegeById,
  updateCollegeProfile,
} from '../controllers/collegeController';
import {
  toggleCollegeConnection,
  checkCollegeConnection,
  toggleFollowStudent,
  checkFollowStatus,
  getStudentFollowers,
  getStudentFollowing,
  getStudentConnectedColleges,
} from '../controllers/socialController';
import {
  getPlacementPosts,
  createPlacementPost,
  deletePlacementPost,
  getInfrastructurePosts,
  createInfrastructurePost,
  deleteInfrastructurePost,
} from '../controllers/postController';
import {
  getCollegeAdmins,
  inviteCollegeAdmin,
  searchUsersForAdmin,
  updateCollegeAdmin,
  removeCollegeAdmin,
  getMyAdminInvitations,
  acceptAdminInvite,
  rejectAdminInvite,
  getMyAdminRoles,
  getAdminActivity,
  createAdminActivity,
} from '../controllers/adminController';
import {
  getUserNotifications,
  markNotificationAsRead,
} from '../controllers/notificationController';
import {
  createReminder,
  updateReminder,
  deleteReminder,
  getStudentReminders,
} from '../controllers/reminderController';
import { globalSearch } from '../controllers/searchController';
import {
  getConversations,
  startOrGetConversation,
  getConversationMessages,
  sendMessage,
  deleteMessage,
  deleteConversation,
  toggleMuteConversation,
  getUnreadMessagesCount,
} from '../controllers/messageController';
import uploadRouter from './uploadRoutes';
import { authenticate, requireRole } from '../middleware/auth';

const apiRouter = Router();

// 1. Auth routes
apiRouter.post('/auth/register/student/request-otp', requestStudentOtp);
apiRouter.post('/auth/register/college/request-otp', requestCollegeOtp);
apiRouter.post('/auth/verify-otp', verifyOtp);
apiRouter.post('/auth/resend-otp', resendOtp);

// Backwards-compatible aliases
apiRouter.post('/auth/register/student', studentRegister);
apiRouter.post('/auth/register/college', collegeRegister);
apiRouter.post('/auth/verify-email', verifyEmail);
apiRouter.post('/auth/login', login);
apiRouter.get('/auth/me', authenticate, getCurrentUser);
apiRouter.post('/auth/refresh-token', refreshToken);

// Public Stats route (real database metrics)
apiRouter.get('/stats', getPublicStats);

// 2. Events routes
apiRouter.get('/events', getEvents);
apiRouter.get('/events/:id', getEventById);
apiRouter.post('/events', authenticate, createEvent);
apiRouter.put('/events/:id', authenticate, updateEvent);
apiRouter.delete('/events/:id', authenticate, deleteEvent);
apiRouter.get('/events/:id/insights', authenticate, getEventInsights);
apiRouter.post('/events/:id/approve', authenticate, requireRole(['College Super Admin', 'College Admin']), approveStudentEvent);
apiRouter.post('/events/:id/reject', authenticate, requireRole(['College Super Admin', 'College Admin']), rejectStudentEvent);
apiRouter.put('/events/:id/review', authenticate, requireRole(['College Super Admin', 'College Admin']), (req, res) => {
  if (req.body && req.body.action === 'reject') {
    return rejectStudentEvent(req, res);
  }
  return approveStudentEvent(req, res);
});

// Student events queries
apiRouter.get('/student/my-events', authenticate, getStudentMyEvents);
apiRouter.get('/students/my-proposals', authenticate, getStudentMyEvents);
apiRouter.get('/college/events', authenticate, getCollegeEvents);
apiRouter.get('/college/student-requests', authenticate, getCollegeStudentRequests);

// 3. Registrations routes
apiRouter.post('/registrations', authenticate, registerForEvent);
apiRouter.get('/registrations/my', authenticate, getStudentRegistrations);
apiRouter.get('/registrations/student', authenticate, getStudentRegistrations);
apiRouter.get('/registrations/college', authenticate, getCollegeRegistrations);
apiRouter.get('/registrations/ticket/:registrationId', authenticate, getRegistrationTicket);

// 4. Payment routes
apiRouter.post('/payments/create-order', authenticate, createPaymentOrder);
apiRouter.post('/payments/verify', authenticate, verifyPayment);

// 5. Attendance routes
apiRouter.post('/attendance/scan', authenticate, verifyAndScanQR);
apiRouter.post('/attendance/mark', authenticate, markAttendance);
apiRouter.get('/attendance/event/:eventId', authenticate, getEventAttendanceList);
apiRouter.post('/attendance/event/:eventId/finalize', authenticate, finishAttendance);
apiRouter.get('/attendance/event/:eventId/export', authenticate, downloadAttendanceReport);

// 6. Certificates routes
apiRouter.post('/certificates/issue', authenticate, issueCertificate);
apiRouter.post('/certificates/student', authenticate, addStudentCertificate);
apiRouter.get('/certificates/my-certificates', authenticate, getMyCertificates);
apiRouter.get('/certificates/student/:studentId', getStudentCertificates);
apiRouter.patch('/certificates/:id', authenticate, updateCertificate);
apiRouter.post('/certificates/:id/retry-email', authenticate, retryCertificateEmail);
apiRouter.delete('/certificates/:id', authenticate, deleteCertificate);
apiRouter.delete('/certificates/student/:id', authenticate, deleteCertificate);

// 7. Students profile routes
apiRouter.get('/students/me', authenticate, getStudentProfile);
apiRouter.get('/students/search', searchStudents);
apiRouter.get('/students/:id', getStudentProfile);
apiRouter.put('/students/profile', authenticate, updateStudentProfile);

// 8. Colleges routes
apiRouter.get('/colleges', getColleges);
apiRouter.get('/colleges/:id', getCollegeById);
apiRouter.put('/colleges/profile', authenticate, updateCollegeProfile);
apiRouter.post('/colleges/:collegeId/follow', authenticate, (req, res) => {
  req.body = { ...req.body, collegeId: req.params.collegeId };
  return toggleCollegeConnection(req, res);
});
apiRouter.get('/colleges/:collegeId/connection', authenticate, checkCollegeConnection);

// 9. Social routes (Connections & Follows)
apiRouter.post('/social/college/connection', authenticate, toggleCollegeConnection);
apiRouter.get('/social/college/:collegeId/connection', authenticate, checkCollegeConnection);
apiRouter.post('/social/student/follow', authenticate, toggleFollowStudent);
apiRouter.get('/social/student/:targetStudentId/follow-status', authenticate, checkFollowStatus);
apiRouter.get('/social/student/:studentId/followers', getStudentFollowers);
apiRouter.get('/social/student/:studentId/following', getStudentFollowing);
apiRouter.get('/social/student/:studentId/connected-colleges', getStudentConnectedColleges);

// 10. Placement & Infrastructure Posts
apiRouter.get('/placements', getPlacementPosts);
apiRouter.post('/placements', authenticate, createPlacementPost);
apiRouter.delete('/placements/:id', authenticate, deletePlacementPost);

apiRouter.get('/infrastructure', getInfrastructurePosts);
apiRouter.post('/infrastructure', authenticate, createInfrastructurePost);
apiRouter.delete('/infrastructure/:id', authenticate, deleteInfrastructurePost);

// 11. Admin Management, Invitations & Activity
apiRouter.get('/admins', authenticate, getCollegeAdmins);
apiRouter.get('/admins/search-users', authenticate, searchUsersForAdmin);
apiRouter.post('/admins/invite', authenticate, inviteCollegeAdmin);
apiRouter.post('/admins', authenticate, inviteCollegeAdmin); // backwards compat
apiRouter.put('/admins/:membershipId', authenticate, updateCollegeAdmin);
apiRouter.delete('/admins/:membershipId', authenticate, removeCollegeAdmin);
apiRouter.get('/admins/my-invitations', authenticate, getMyAdminInvitations);
apiRouter.post('/admins/invitations/:membershipId/accept', authenticate, acceptAdminInvite);
apiRouter.post('/admins/invitations/:membershipId/reject', authenticate, rejectAdminInvite);
apiRouter.get('/admins/my-roles', authenticate, getMyAdminRoles);
apiRouter.get('/admins/activity', authenticate, getAdminActivity);
apiRouter.post('/admins/activity', authenticate, createAdminActivity);

// 12. Notifications & Reminders
apiRouter.get('/notifications', authenticate, getUserNotifications);
apiRouter.patch('/notifications/:id/read', authenticate, markNotificationAsRead);
apiRouter.post('/reminders', authenticate, createReminder);
apiRouter.put('/reminders/:id', authenticate, updateReminder);
apiRouter.delete('/reminders/:id', authenticate, deleteReminder);
apiRouter.get('/reminders', authenticate, getStudentReminders);

// 13. Global Search (Students, Colleges, Events)
apiRouter.get('/search/global', authenticate, globalSearch);

// 14. Messaging System (Student <-> Student, Student <-> College, College <-> Student)
apiRouter.get('/messages/conversations', authenticate, getConversations);
apiRouter.get('/messages/unread-count', authenticate, getUnreadMessagesCount);
apiRouter.post('/messages/conversations', authenticate, startOrGetConversation);
apiRouter.get('/messages/conversations/:id', authenticate, getConversationMessages);
apiRouter.post('/messages/conversations/:id', authenticate, sendMessage);
apiRouter.delete('/messages/:id', authenticate, deleteMessage);
apiRouter.delete('/messages/conversations/:id', authenticate, deleteConversation);
apiRouter.post('/messages/conversations/:id/mute', authenticate, toggleMuteConversation);

// 15. File Uploads
apiRouter.use('/upload', uploadRouter);

export default apiRouter;

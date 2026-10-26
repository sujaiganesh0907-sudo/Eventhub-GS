import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Building2,
  Mail,
  Lock,
  Phone,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  MapPin,
  Globe,
  UserPlus,
  AlertTriangle,
  X,
  Send,
} from 'lucide-react';
import { OtpVerificationView } from '../components/auth/OtpVerificationView';
import {
  getPendingVerification,
  setPendingVerification,
  clearPendingVerification,
} from '../services/verificationStorage';

interface AuthPageProps {
  initialMode?: 'login' | 'register' | 'otp';
  initialRole?: 'student' | 'college';
  noticeMessage?: string;
  onSuccess: () => void;
  onNavigateTab?: (tab: string, notice?: string) => void;
}

const COMMON_DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Biotechnology',
  'Business Administration (MBA / BBA)',
  'Design & Media Arts',
  'Other Department',
];

const YEAR_OPTIONS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year',
  'Other',
];

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  initialRole = 'student',
  noticeMessage,
  onSuccess,
  onNavigateTab,
}) => {
  const {
    login,
    verifyMfaLogin,
    requestStudentOtp,
    requestCollegeOtp,
    switchAccount,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'otp'>(initialMode);
  const [role, setRole] = useState<'student' | 'college'>(initialRole);

  // Common Login Fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // MFA Challenge State during login
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [mfaChallengeEmail, setMfaChallengeEmail] = useState('');
  const [mfaChallengeOtp, setMfaChallengeOtp] = useState('');
  const [mfaChallengeLoading, setMfaChallengeLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  // Student Registration Fields (Start completely empty)
  const [studentFullName, setStudentFullName] = useState('');
  const [studentUsername, setStudentUsername] = useState('');
  const [studentCollegeName, setStudentCollegeName] = useState('');
  const [studentDepartment, setStudentDepartment] = useState('');
  const [studentYearOfStudy, setStudentYearOfStudy] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentConfirmPassword, setStudentConfirmPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showStudentConfirmPassword, setShowStudentConfirmPassword] = useState(false);

  // College Registration Fields (Start completely empty)
  const [collegeName, setCollegeName] = useState('');
  const [collegeOfficialDomain, setCollegeOfficialDomain] = useState('');
  const [collegeLocation, setCollegeLocation] = useState('');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [collegePhone, setCollegePhone] = useState('');
  const [collegePassword, setCollegePassword] = useState('');
  const [collegeConfirmPassword, setCollegeConfirmPassword] = useState('');
  const [showCollegePassword, setShowCollegePassword] = useState(false);
  const [showCollegeConfirmPassword, setShowCollegeConfirmPassword] = useState(false);

  // OTP State
  const [otpEmail, setOtpEmail] = useState('');
  const [otpPurpose, setOtpPurpose] = useState<'STUDENT_REGISTRATION' | 'COLLEGE_REGISTRATION'>('STUDENT_REGISTRATION');

  // Status & Feedback State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(noticeMessage || null);

  // Duplicate College Domain & Request Admin Access State (Requirement 8)
  const [duplicateCollegeDomain, setDuplicateCollegeDomain] = useState<{
    domain: string;
    collegeName?: string;
  } | null>(null);
  const [showRequestAdminModal, setShowRequestAdminModal] = useState(false);
  const [requestAdminName, setRequestAdminName] = useState('');
  const [requestAdminEmail, setRequestAdminEmail] = useState('');
  const [requestAdminPhone, setRequestAdminPhone] = useState('');
  const [requestAdminMessage, setRequestAdminMessage] = useState('');
  const [requestAdminLoading, setRequestAdminLoading] = useState(false);
  const [requestAdminSuccess, setRequestAdminSuccess] = useState<string | null>(null);
  const [requestAdminError, setRequestAdminError] = useState<string | null>(null);

  // Is environment development/demo?
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

  // Sync mode and role if initial props change
  useEffect(() => {
    if (initialMode && initialMode !== mode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    if (initialRole && initialRole !== role) {
      setRole(initialRole);
    }
  }, [initialRole]);

  // Always initialize login inputs as empty by default (Requirement 2)
  useEffect(() => {
    setLoginEmail('');
    setLoginPassword('');
    setShowLoginPassword(false);
  }, [mode, role]);

  // Restore pending verification state on OTP mode or page reload (Requirement 3 & 7)
  useEffect(() => {
    if (mode === 'otp') {
      const pending = getPendingVerification();
      if (pending && pending.email) {
        setOtpEmail(pending.email);
        setOtpPurpose(
          pending.purpose === 'COLLEGE_REGISTRATION'
            ? 'COLLEGE_REGISTRATION'
            : 'STUDENT_REGISTRATION'
        );
        setRole(pending.role || 'student');
      } else if (!otpEmail) {
        // No pending verification and no in-memory email -> redirect to login with notification
        setMessage('No pending verification found. Please register or sign in.');
        setMode('login');
        if (onNavigateTab) {
          onNavigateTab('auth', 'No pending verification found. Please register or sign in.');
        } else {
          window.history.replaceState(null, '', '/login');
        }
      }
    }
  }, [mode, onNavigateTab, otpEmail]);

  // Dynamic Domain Check for College
  const cleanDomain = (d: string) => d.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
  const enteredDomain = cleanDomain(collegeOfficialDomain);
  const emailDomainPart = collegeEmail.includes('@') ? collegeEmail.split('@')[1].trim().toLowerCase() : '';
  const isDomainMismatch =
    enteredDomain.length > 0 &&
    emailDomainPart.length > 0 &&
    emailDomainPart !== enteredDomain &&
    !emailDomainPart.endsWith('.' + enteredDomain);

  // Password Mismatch Logic: ONLY when BOTH have values and differ
  const studentPasswordMismatch =
    studentPassword.length > 0 &&
    studentConfirmPassword.length > 0 &&
    studentPassword !== studentConfirmPassword;

  const collegePasswordMismatch =
    collegePassword.length > 0 &&
    collegeConfirmPassword.length > 0 &&
    collegePassword !== collegeConfirmPassword;

  // --- Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        onSuccess();
      } else if (res.requiresMfa) {
        setIsMfaRequired(true);
        setMfaChallengeEmail(res.email || loginEmail);
        setMessage(res.message || 'Secondary 6-digit verification code dispatched to your email.');
      } else if (res.requiresVerification) {
        const targetEmail = res.email || loginEmail;
        const targetPurpose = role === 'student' ? 'STUDENT_REGISTRATION' : 'COLLEGE_REGISTRATION';
        setPendingVerification({
          role,
          email: targetEmail,
          purpose: targetPurpose,
          status: 'pending',
          createdAt: Date.now(),
        });
        setOtpEmail(targetEmail);
        setOtpPurpose(targetPurpose);
        setMode('otp');
        setMessage(res.message || 'Please verify your email with the 6-digit code.');
        if (onNavigateTab) {
          onNavigateTab('verify-otp');
        } else {
          window.history.pushState(null, '', '/verify-otp');
        }
      } else {
        setError(res.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setError(err.message || 'Error logging in.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaChallengeLoading(true);
    setError(null);

    try {
      const res = await verifyMfaLogin(mfaChallengeEmail, mfaChallengeOtp.trim());
      if (res.success) {
        onSuccess();
      } else {
        setError(res.message || 'Invalid verification code.');
      }
    } catch (err: any) {
      setError(err.message || 'Error verifying MFA code.');
    } finally {
      setMfaChallengeLoading(false);
    }
  };

  const handleRequestForgotOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid registered email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await (await import('../services/api')).api.post<any>('/auth/forgot-password/request-otp', {
        email: forgotEmail.trim(),
      });

      if (res.success) {
        setForgotStep(2);
        setForgotSuccess(res.message || 'Password reset verification code dispatched to your email.');
        setForgotCooldown(60);
        const timer = setInterval(() => {
          setForgotCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setForgotError(res.message || 'Failed to dispatch reset code.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Error requesting reset code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotOtp || forgotOtp.trim().length !== 6) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 8) {
      setForgotError('Password must be at least 8 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await (await import('../services/api')).api.post<any>('/auth/forgot-password/reset', {
        email: forgotEmail.trim(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword,
        confirmPassword: forgotConfirmPassword,
      });

      if (res.success) {
        setForgotSuccess('Password reset successfully! You can now sign in with your new password.');
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotStep(1);
          setForgotOtp('');
          setForgotNewPassword('');
          setForgotConfirmPassword('');
          setMessage('Password reset successful. Please sign in.');
        }, 1500);
      } else {
        setForgotError(res.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'Error resetting password.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (studentPassword !== studentConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (studentPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!studentYearOfStudy) {
      setError('Please select your year of study.');
      return;
    }

    const cleanUsername = studentUsername.trim().toLowerCase().replace(/^@/, '');
    if (cleanUsername && !/^[a-zA-Z0-9_.]{3,30}$/.test(cleanUsername)) {
      setError('Username must be 3-30 characters long (letters, numbers, underscore, period. No spaces).');
      return;
    }

    setLoading(true);
    try {
      const res = await requestStudentOtp({
        fullName: studentFullName,
        username: cleanUsername || undefined,
        collegeName: studentCollegeName,
        department: studentDepartment,
        yearOfStudy: studentYearOfStudy,
        email: studentEmail,
        phoneNumber: studentPhone,
        password: studentPassword,
        confirmPassword: studentConfirmPassword,
      });

      if (res.success) {
        // Store pending verification safely in sessionStorage (Requirement 3)
        setPendingVerification({
          role: 'student',
          email: studentEmail,
          purpose: 'STUDENT_REGISTRATION',
          status: 'pending',
          registrationData: {
            fullName: studentFullName,
            username: cleanUsername || undefined,
            collegeName: studentCollegeName,
            department: studentDepartment,
            yearOfStudy: studentYearOfStudy,
            phoneNumber: studentPhone,
          },
          createdAt: Date.now(),
        });

        setOtpEmail(studentEmail);
        setOtpPurpose('STUDENT_REGISTRATION');
        setMode('otp');
        setMessage(res.message || 'Verification code dispatched to your email.');

        // Navigate to OTP Verification route without resetting page (Requirement 4, 5, 6)
        if (onNavigateTab) {
          onNavigateTab('verify-otp');
        } else {
          window.history.pushState(null, '', '/verify-otp');
        }
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCollegeRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (collegePassword !== collegeConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (collegePassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (isDomainMismatch) {
      setError(`Official email domain (@${emailDomainPart}) must match the official college domain (${enteredDomain}).`);
      return;
    }

    setLoading(true);
    try {
      const res = await requestCollegeOtp({
        collegeName,
        officialDomain: collegeOfficialDomain,
        location: collegeLocation,
        officialEmail: collegeEmail,
        contactNumber: collegePhone,
        password: collegePassword,
        confirmPassword: collegeConfirmPassword,
      });

      if (res.success) {
        // Store pending verification safely in sessionStorage (Requirement 3)
        setPendingVerification({
          role: 'college',
          email: collegeEmail,
          purpose: 'COLLEGE_REGISTRATION',
          status: 'pending',
          registrationData: {
            collegeName,
            officialDomain: collegeOfficialDomain,
            location: collegeLocation,
            phoneNumber: collegePhone,
          },
          createdAt: Date.now(),
        });

        setOtpEmail(collegeEmail);
        setOtpPurpose('COLLEGE_REGISTRATION');
        setMode('otp');
        setMessage(res.message || 'Verification code sent to official email.');

        // Navigate to OTP Verification route without resetting page (Requirement 4, 5, 6)
        if (onNavigateTab) {
          onNavigateTab('verify-otp');
        } else {
          window.history.pushState(null, '', '/verify-otp');
        }
      } else {
        if ((res as any).isDuplicateDomain) {
          setDuplicateCollegeDomain({
            domain: collegeOfficialDomain,
            collegeName: (res as any).existingCollegeName,
          });
          setRequestAdminName(collegeName ? `${collegeName} Representative` : '');
          setRequestAdminEmail(collegeEmail);
          setRequestAdminPhone(collegePhone);
        }
        setError(res.message || 'College registration failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestAdminLoading(true);
    setRequestAdminError(null);
    try {
      const res = await (await import('../services/api')).api.post<any>('/auth/college/request-admin-access', {
        officialDomain: duplicateCollegeDomain?.domain || collegeOfficialDomain,
        requesterName: requestAdminName.trim(),
        requesterEmail: requestAdminEmail.trim(),
        requesterPhone: requestAdminPhone.trim(),
        message: requestAdminMessage.trim(),
      });
      if (res.success) {
        setRequestAdminSuccess(res.message || 'Your request has been routed to the College Super Admin.');
        setTimeout(() => {
          setShowRequestAdminModal(false);
          setRequestAdminSuccess(null);
          setMode('login');
          setLoginEmail(requestAdminEmail);
          setMessage('Admin access request submitted! You can sign in once your request is approved.');
        }, 2200);
      } else {
        setRequestAdminError(res.message || 'Failed to submit request.');
      }
    } catch (err: any) {
      setRequestAdminError(err.message || 'Unable to submit request.');
    } finally {
      setRequestAdminLoading(false);
    }
  };

  const handleOtpSuccess = () => {
    clearPendingVerification();
    const isCollegeRole = role === 'college' || otpPurpose === 'COLLEGE_REGISTRATION';
    setMessage(
      isCollegeRole
        ? 'Email verified successfully! Institutional registration is pending accreditation review. Please sign in.'
        : 'Email verified successfully! Please sign in with your credentials.'
    );
    setMode('login');
    setLoginEmail(otpEmail);
    setLoginPassword('');
    setError(null);
    if (onNavigateTab) {
      onNavigateTab('auth');
    } else {
      window.history.pushState(null, '', '/login');
    }
  };

  const handleBackToEdit = () => {
    const pending = getPendingVerification();
    if (pending?.registrationData) {
      if (pending.role === 'student') {
        if (pending.registrationData.fullName) setStudentFullName(pending.registrationData.fullName);
        if (pending.registrationData.username) setStudentUsername(pending.registrationData.username);
        if (pending.registrationData.collegeName) setStudentCollegeName(pending.registrationData.collegeName);
        if (pending.registrationData.department) setStudentDepartment(pending.registrationData.department);
        if (pending.registrationData.yearOfStudy) setStudentYearOfStudy(pending.registrationData.yearOfStudy);
        if (pending.registrationData.phoneNumber) setStudentPhone(pending.registrationData.phoneNumber);
        if (pending.email) setStudentEmail(pending.email);
        setRole('student');
      } else {
        if (pending.registrationData.collegeName) setCollegeName(pending.registrationData.collegeName);
        if (pending.registrationData.officialDomain) setCollegeOfficialDomain(pending.registrationData.officialDomain);
        if (pending.registrationData.location) setCollegeLocation(pending.registrationData.location);
        if (pending.registrationData.phoneNumber) setCollegePhone(pending.registrationData.phoneNumber);
        if (pending.email) setCollegeEmail(pending.email);
        setRole('college');
      }
    }
    setMode('register');
    setError(null);
    setMessage(null);
    if (onNavigateTab) {
      onNavigateTab(role === 'college' ? 'register-college' : 'register');
    } else {
      window.history.pushState(null, '', role === 'college' ? '/register/college' : '/register');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4 sm:px-6 bg-[var(--bg)]">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-6 sm:p-8 shadow-xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary-color)] text-[var(--primary-text)] mx-auto flex items-center justify-center font-black text-2xl shadow-md mb-2.5">
            E
          </div>
          <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)]">
            EVENTHUB
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Inter-College Event Discovery & Verified Credentials Platform
          </p>
        </div>

        {/* Informational / Notice Alert */}
        {message && mode !== 'otp' && (
          <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && mode !== 'otp' && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}


        {/* Role Switcher (Student vs College) */}
        {mode !== 'otp' && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-color)] mb-5">
            <button
              type="button"
              onClick={() => {
                setRole('student');
                setError(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                role === 'student'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Student
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('college');
                setError(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                role === 'college'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> College
            </button>
          </div>
        )}

        {/* 1. LOGIN MODE */}
        {mode === 'login' && isMfaRequired && (
          <form onSubmit={handleVerifyMfaSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
              <div className="flex items-center gap-2 font-bold mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Multi-Factor Authentication Required
              </div>
              A secondary 6-digit verification code has been dispatched to <strong>{mfaChallengeEmail}</strong>.
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                6-Digit Security Code *
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={mfaChallengeOtp}
                onChange={(e) => setMfaChallengeOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full tracking-widest text-center font-mono font-bold p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-base text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
              />
            </div>

            <button
              type="submit"
              disabled={mfaChallengeLoading}
              className="w-full mt-2 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {mfaChallengeLoading ? 'Verifying Code...' : 'Verify Code & Complete Sign In'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMfaRequired(false);
                setMfaChallengeOtp('');
                setError(null);
              }}
              className="w-full py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer text-center"
            >
              Cancel & Back to Email Sign In
            </button>
          </form>
        )}

        {mode === 'login' && !isMfaRequired && (
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                {role === 'student' ? 'Student Email' : 'Official Institutional Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  name="user_login_email"
                  id="user_login_email"
                  autoComplete="off"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder={role === 'student' ? 'Enter your email address' : 'Enter official institutional email'}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[var(--text-primary)]">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(loginEmail || '');
                    setShowForgotPassword(true);
                  }}
                  className="text-[11px] font-semibold text-[var(--primary-color)] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  name="user_login_password"
                  id="user_login_password"
                  autoComplete="new-password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : `Sign In as ${role === 'student' ? 'Student' : 'College Admin'}`}
            </button>

            <div className="text-center pt-4 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMessage(null);
                  setMode('register');
                }}
                className="font-bold text-[var(--primary-color)] hover:underline cursor-pointer ml-1"
              >
                Register here
              </button>
            </div>
          </form>
        )}

        {/* 2. REGISTRATION MODE */}
        {mode === 'register' && (
          <div>
            {/* STUDENT REGISTRATION FORM */}
            {role === 'student' && (
              <form onSubmit={handleStudentRegister} className="space-y-3">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={studentFullName}
                    onChange={(e) => setStudentFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                  />
                </div>

                {/* Unique Username Handle */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Username (Unique Handle)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                      @
                    </span>
                    <input
                      type="text"
                      value={studentUsername}
                      onChange={(e) => setStudentUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                      placeholder="e.g. sureshm2006"
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Letters, numbers, underscore, period. No spaces. (Optional — will auto-generate if empty)
                  </p>
                </div>

                {/* College / University Name */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    College / University Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={studentCollegeName}
                    onChange={(e) => setStudentCollegeName(e.target.value)}
                    placeholder="Enter your college or university name"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                  />
                </div>

                {/* Department & Year in 2 Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      Department *
                    </label>
                    <input
                      type="text"
                      required
                      list="departments-list"
                      value={studentDepartment}
                      onChange={(e) => setStudentDepartment(e.target.value)}
                      placeholder="Enter or select your department"
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                    />
                    <datalist id="departments-list">
                      {COMMON_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      Year *
                    </label>
                    <select
                      required
                      value={studentYearOfStudy}
                      onChange={(e) => setStudentYearOfStudy(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                    >
                      <option value="">Select your year of study</option>
                      {YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="Enter your contact number"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                  />
                </div>

                {/* Password Fields with Eye Toggles & Mismatch Validation (Requirement 1) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      Create Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showStudentPassword ? 'text' : 'password'}
                        required
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        placeholder="Create a password"
                        className="w-full p-2.5 pr-9 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentPassword(!showStudentPassword)}
                        aria-label={showStudentPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showStudentConfirmPassword ? 'text' : 'password'}
                        required
                        value={studentConfirmPassword}
                        onChange={(e) => setStudentConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className={`w-full p-2.5 pr-9 rounded-xl border bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden ${
                          studentPasswordMismatch
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-[var(--border-color)] focus:border-[var(--primary-color)]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentConfirmPassword(!showStudentConfirmPassword)}
                        aria-label={showStudentConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {showStudentConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Mismatch Alert: ONLY when BOTH are entered and mismatched */}
                {studentPasswordMismatch && (
                  <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Passwords do not match.
                  </p>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || studentPasswordMismatch}
                  className="w-full mt-3 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending Verification Code...' : 'Register Student Account'}
                </button>

                {/* Sign In Link (Requirement 15) */}
                <div className="text-center pt-3 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMessage(null);
                      setMode('login');
                    }}
                    className="font-bold text-[var(--primary-color)] hover:underline cursor-pointer ml-1"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}

            {/* COLLEGE REGISTRATION FORM */}
            {role === 'college' && (
              <div className="space-y-3">
                {duplicateCollegeDomain && (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs">
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-800 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                      Domain Already Registered
                    </div>
                    <p className="text-[11px] leading-relaxed mb-2.5">
                      The domain <span className="font-mono font-semibold">{duplicateCollegeDomain.domain}</span> is already owned by{' '}
                      <strong>{duplicateCollegeDomain.collegeName || 'an existing college account'}</strong>.
                      To protect institutional integrity, second Super Admin accounts cannot be created automatically.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRequestAdminModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] font-bold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Request Admin Access
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setMessage('Please sign in with your institutional credentials.');
                          setMode('login');
                          setLoginEmail(collegeEmail);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer"
                      >
                        Sign In Instead
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCollegeRegister} className="space-y-3">
                {/* Institution Name */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Institution Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="Enter institution name"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                  />
                </div>

                {/* Official College Domain */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Official College Domain *
                  </label>
                  <input
                    type="text"
                    required
                    value={collegeOfficialDomain}
                    onChange={(e) => setCollegeOfficialDomain(e.target.value)}
                    placeholder="Enter official college domain"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    e.g. yourcollege.edu (institutional email domain must match this domain)
                  </p>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={collegeLocation}
                    onChange={(e) => setCollegeLocation(e.target.value)}
                    placeholder="Enter city and state"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                  />
                </div>

                {/* Official Institutional Email with Dynamic Domain Validation (Requirement 13) */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Official Institutional Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={collegeEmail}
                    onChange={(e) => setCollegeEmail(e.target.value)}
                    placeholder="Enter official institutional email"
                    className={`w-full p-2.5 rounded-xl border bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden ${
                      isDomainMismatch
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-[var(--border-color)] focus:border-[var(--primary-color)]'
                    }`}
                  />
                  {isDomainMismatch && (
                    <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Email domain (@{emailDomainPart}) must match official college domain ({enteredDomain}).
                    </p>
                  )}
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={collegePhone}
                    onChange={(e) => setCollegePhone(e.target.value)}
                    placeholder="Enter contact number"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                  />
                </div>

                {/* Password Fields with Eye Toggles & Mismatch Validation (Requirement 2) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      Create Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showCollegePassword ? 'text' : 'password'}
                        required
                        value={collegePassword}
                        onChange={(e) => setCollegePassword(e.target.value)}
                        placeholder="Create a password"
                        className="w-full p-2.5 pr-9 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCollegePassword(!showCollegePassword)}
                        aria-label={showCollegePassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {showCollegePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showCollegeConfirmPassword ? 'text' : 'password'}
                        required
                        value={collegeConfirmPassword}
                        onChange={(e) => setCollegeConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className={`w-full p-2.5 pr-9 rounded-xl border bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden ${
                          collegePasswordMismatch
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-[var(--border-color)] focus:border-[var(--primary-color)]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCollegeConfirmPassword(!showCollegeConfirmPassword)}
                        aria-label={showCollegeConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {showCollegeConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {collegePasswordMismatch && (
                  <p className="text-[11px] text-red-500 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Passwords do not match.
                  </p>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || collegePasswordMismatch || isDomainMismatch}
                  className="w-full mt-3 py-2.5 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending Verification Code...' : 'Register College Account'}
                </button>

                {/* Sign In Link (Requirement 15) */}
                <div className="text-center pt-3 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMessage(null);
                      setMode('login');
                    }}
                    className="font-bold text-[var(--primary-color)] hover:underline cursor-pointer ml-1"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            </div>
          )}
          </div>
        )}

        {/* 3. OTP VERIFICATION SCREEN (Requirement 5) */}
        {mode === 'otp' && (
          <OtpVerificationView
            email={otpEmail}
            purpose={otpPurpose}
            onVerifiedSuccess={handleOtpSuccess}
            onBackToEdit={handleBackToEdit}
          />
        )}
      </div>

      {/* Forgot Password Modal Dialog */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--primary-color)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Reset Account Password</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotError(null);
                  setForgotSuccess(null);
                }}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {forgotSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {forgotSuccess}
              </div>
            )}

            {forgotError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {forgotError}
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestForgotOtpSubmit} className="space-y-3">
                <p className="text-xs text-[var(--text-muted)]">
                  Enter your registered email address and we'll dispatch a secure 6-digit verification code.
                </p>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || forgotCooldown > 0}
                    className="px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? 'Dispatching...' : forgotCooldown > 0 ? `Wait ${forgotCooldown}s` : 'Send Reset Code'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                <p className="text-xs text-[var(--text-muted)]">
                  Enter the 6-digit code dispatched to <strong>{forgotEmail}</strong> and choose a new password.
                </p>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-36 tracking-widest text-center font-mono font-bold p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-sm text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    Change Email
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? 'Resetting...' : 'Verify & Set Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* REQUEST ADMIN ACCESS MODAL (Requirement 8) */}
      {showRequestAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setShowRequestAdminModal(false);
                setRequestAdminError(null);
                setRequestAdminSuccess(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Request Delegated Admin Access
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {duplicateCollegeDomain?.collegeName || 'Institutional Workspace'} ({duplicateCollegeDomain?.domain || collegeOfficialDomain})
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
              An institutional account for this domain already exists. Complete this request to notify the primary College Super Admin to authorize and invite your account.
            </p>

            {requestAdminSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {requestAdminSuccess}
              </div>
            )}

            {requestAdminError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {requestAdminError}
              </div>
            )}

            <form onSubmit={handleRequestAdminSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={requestAdminName}
                  onChange={(e) => setRequestAdminName(e.target.value)}
                  placeholder="e.g. Dr. Jane Smith"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Institutional Email *
                </label>
                <input
                  type="email"
                  required
                  value={requestAdminEmail}
                  onChange={(e) => setRequestAdminEmail(e.target.value)}
                  placeholder={`name@${duplicateCollegeDomain?.domain || 'college.ac.in'}`}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Contact Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={requestAdminPhone}
                  onChange={(e) => setRequestAdminPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Department / Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={requestAdminMessage}
                  onChange={(e) => setRequestAdminMessage(e.target.value)}
                  placeholder="e.g. Head of Computer Science Dept, organizing Inter-College Hackathon 2026."
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowRequestAdminModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestAdminLoading}
                  className="px-4 py-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-hover)] text-[var(--primary-text)] text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {requestAdminLoading ? 'Submitting...' : 'Send Request to Super Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

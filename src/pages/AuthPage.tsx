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
        setError(res.message || 'College registration failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to send verification code. Please try again.');
    } finally {
      setLoading(false);
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

        {/* One-Click Demo Accounts: Only in Dev/Demo Mode (Requirement 16) */}
        {isDev && mode === 'login' && (
          <div className="mb-5 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Developer Fast Sign-In
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  await switchAccount('student');
                  onSuccess();
                }}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-all text-left flex items-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[var(--primary-color)] shrink-0" />
                <div className="truncate">
                  <span className="block font-bold">Suresh</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Verified Student</span>
                </div>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await switchAccount('college-super');
                  onSuccess();
                }}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] transition-all text-left flex items-center gap-1.5 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <div className="truncate">
                  <span className="block font-bold">Apex Tech Admin</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Verified College</span>
                </div>
              </button>
            </div>
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
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                {role === 'student' ? 'Student Email' : 'Official Institutional Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder={role === 'student' ? 'Enter your email address' : 'Enter official institutional email'}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary-color)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
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
    </div>
  );
};

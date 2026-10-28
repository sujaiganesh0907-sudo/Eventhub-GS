import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { IUser, IStudentProfile, ICollege } from '../types';
import { api } from '../services/api';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  status: AuthStatus;
  user: IUser | null;
  studentProfile: IStudentProfile | null;
  college: ICollege | null;
  loading: boolean;
  isAuthenticated: boolean;
  isCollege: boolean;
  isStudent: boolean;
  hasAdminAccess: boolean;
  login: (email: string, password: string) => Promise<any>;
  requestStudentOtp: (data: any) => Promise<any>;
  requestCollegeOtp: (data: any) => Promise<any>;
  verifyOtp: (email: string, otp: string, purpose: 'STUDENT_REGISTRATION' | 'COLLEGE_REGISTRATION') => Promise<any>;
  resendOtp: (email: string, purpose: 'STUDENT_REGISTRATION' | 'COLLEGE_REGISTRATION') => Promise<any>;
  registerStudent: (data: any) => Promise<any>;
  registerCollege: (data: any) => Promise<any>;
  verifyEmail: (email: string, code: string) => Promise<any>;
  verifyMfaLogin: (email: string, otp: string) => Promise<any>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateStudentProfileLocal: (profile: Partial<IStudentProfile>) => void;
  updateCollegeProfileLocal: (college: Partial<ICollege>) => void;
  switchAccount: (role: 'student' | 'college-super') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [studentProfile, setStudentProfile] = useState<IStudentProfile | null>(null);
  const [college, setCollege] = useState<ICollege | null>(null);
  const [hasAdminMemberships, setHasAdminMemberships] = useState(false);
  const [status, setStatus] = useState<AuthStatus>(() => {
    // If token exists in storage at boot time, we start in 'loading' to restore session
    return localStorage.getItem('eventhub_token') ? 'loading' : 'unauthenticated';
  });

  const refreshInFlightRef = useRef(false);

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('eventhub_token');
    if (!token) {
      setUser(null);
      setStudentProfile(null);
      setCollege(null);
      setHasAdminMemberships(false);
      setStatus('unauthenticated');
      return;
    }

    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    try {
      const res = await api.get<any>('/auth/me');
      if (res.success && res.user) {
        if (res.college?._id || res.user.collegeId) {
          localStorage.setItem('eventhub_active_college', res.college?._id || res.user.collegeId);
        }
        setUser(res.user);
        setStudentProfile(res.studentProfile || null);
        setCollege(res.college || null);
        setHasAdminMemberships(Boolean(res.hasAdminMemberships));
        setStatus('authenticated');
      } else {
        localStorage.removeItem('eventhub_token');
        localStorage.removeItem('eventhub_refresh');
        localStorage.removeItem('eventhub_active_college');
        setUser(null);
        setStudentProfile(null);
        setCollege(null);
        setHasAdminMemberships(false);
        setStatus('unauthenticated');
      }
    } catch (err: any) {
      console.warn('Session verification notice:', err?.message || err);
      if (err?.status === 401) {
        localStorage.removeItem('eventhub_token');
        localStorage.removeItem('eventhub_refresh');
        localStorage.removeItem('eventhub_active_college');
        setUser(null);
        setStudentProfile(null);
        setCollege(null);
        setHasAdminMemberships(false);
        setStatus('unauthenticated');
      } else {
        setStatus((prev) => (prev === 'authenticated' ? 'authenticated' : 'unauthenticated'));
      }
    } finally {
      refreshInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Listen for session expiration event dispatched by api.ts when refresh token fails
  useEffect(() => {
    const handleSessionExpired = () => {
      localStorage.removeItem('eventhub_token');
      localStorage.removeItem('eventhub_refresh');
      localStorage.removeItem('eventhub_active_college');
      setUser(null);
      setStudentProfile(null);
      setCollege(null);
      setHasAdminMemberships(false);
      setStatus('unauthenticated');
    };

    window.addEventListener('eventhub:session_expired', handleSessionExpired);
    return () => window.removeEventListener('eventhub:session_expired', handleSessionExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<any>('/auth/login', { email, password });
    if (res.success && res.tokens?.accessToken) {
      localStorage.setItem('eventhub_token', res.tokens.accessToken);
      if (res.tokens?.refreshToken) {
        localStorage.setItem('eventhub_refresh', res.tokens.refreshToken);
      }
      if (res.college?._id || res.user?.collegeId) {
        localStorage.setItem('eventhub_active_college', res.college?._id || res.user.collegeId);
      } else {
        localStorage.removeItem('eventhub_active_college');
      }
      setUser(res.user);
      setStudentProfile(res.studentProfile || null);
      setCollege(res.college || null);
      setHasAdminMemberships(Boolean(res.hasAdminMemberships));
      setStatus('authenticated');
    }
    return res;
  };

  const requestStudentOtp = async (data: any) => {
    return api.post<any>('/auth/register/student/request-otp', data);
  };

  const requestCollegeOtp = async (data: any) => {
    return api.post<any>('/auth/register/college/request-otp', data);
  };

  const verifyOtp = async (email: string, otp: string, purpose: 'STUDENT_REGISTRATION' | 'COLLEGE_REGISTRATION') => {
    return api.post<any>('/auth/verify-otp', { email, otp, purpose });
  };

  const resendOtp = async (email: string, purpose: 'STUDENT_REGISTRATION' | 'COLLEGE_REGISTRATION') => {
    return api.post<any>('/auth/resend-otp', { email, purpose });
  };

  const registerStudent = async (data: any) => {
    return requestStudentOtp(data);
  };

  const registerCollege = async (data: any) => {
    return requestCollegeOtp(data);
  };

  const verifyEmail = async (email: string, code: string) => {
    return verifyOtp(email, code, 'STUDENT_REGISTRATION');
  };

  const verifyMfaLogin = async (email: string, otp: string) => {
    const res = await api.post<any>('/auth/mfa/verify-login', { email, otp });
    if (res.success && res.tokens?.accessToken) {
      localStorage.setItem('eventhub_token', res.tokens.accessToken);
      if (res.tokens?.refreshToken) {
        localStorage.setItem('eventhub_refresh', res.tokens.refreshToken);
      }
      setUser(res.user);
      setStudentProfile(res.studentProfile || null);
      setCollege(res.college || null);
      setHasAdminMemberships(Boolean(res.hasAdminMemberships));
      setStatus('authenticated');
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('eventhub_token');
    localStorage.removeItem('eventhub_refresh');
    localStorage.removeItem('eventhub_active_college');
    setUser(null);
    setStudentProfile(null);
    setCollege(null);
    setHasAdminMemberships(false);
    setStatus('unauthenticated');
  };

  const updateStudentProfileLocal = (updated: Partial<IStudentProfile>) => {
    setStudentProfile((prev) => (prev ? { ...prev, ...updated } : (updated as IStudentProfile)));
  };

  const updateCollegeProfileLocal = (updated: Partial<ICollege>) => {
    setCollege((prev) => (prev ? { ...prev, ...updated } : (updated as ICollege)));
  };

  const switchAccount = async (target: 'student' | 'college-super') => {
    localStorage.removeItem('eventhub_active_college');
    const res = await api.post<any>('/auth/quick-switch', { target });
    if (res.success && res.tokens?.accessToken) {
      localStorage.setItem('eventhub_token', res.tokens.accessToken);
      if (res.tokens.refreshToken) {
        localStorage.setItem('eventhub_refresh', res.tokens.refreshToken);
      }
      if (res.college?._id || res.user?.collegeId) {
        localStorage.setItem('eventhub_active_college', res.college?._id || res.user.collegeId);
      } else {
        localStorage.removeItem('eventhub_active_college');
      }
      setUser(res.user);
      setStudentProfile(res.studentProfile || null);
      setCollege(res.college || null);
      setHasAdminMemberships(Boolean(res.hasAdminMemberships));
      setStatus('authenticated');
    } else {
      throw new Error(res.message || 'Failed to switch account');
    }
  };

  const isAuthenticated = status === 'authenticated' && !!user;
  const isCollege = user?.role === 'College Super Admin' || user?.role === 'College Admin';
  const isStudent = user?.role === 'Student' || (!user && false);
  const hasAdminAccess = isCollege || hasAdminMemberships;
  const loading = status === 'loading';

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        studentProfile,
        college,
        loading,
        isAuthenticated,
        isCollege,
        isStudent,
        hasAdminAccess,
        login,
        requestStudentOtp,
        requestCollegeOtp,
        verifyOtp,
        resendOtp,
        registerStudent,
        registerCollege,
        verifyEmail,
        verifyMfaLogin,
        logout,
        refreshProfile,
        updateStudentProfileLocal,
        updateCollegeProfileLocal,
        switchAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

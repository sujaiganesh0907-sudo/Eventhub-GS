import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, IStudentProfile, ICollege } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: IUser | null;
  studentProfile: IStudentProfile | null;
  college: ICollege | null;
  loading: boolean;
  isAuthenticated: boolean;
  isCollege: boolean;
  isStudent: boolean;
  login: (email: string, password: string) => Promise<any>;
  requestStudentOtp: (data: any) => Promise<any>;
  requestCollegeOtp: (data: any) => Promise<any>;
  verifyOtp: (email: string, otp: string, purpose: 'STUDENT_REGISTRATION' | 'COLLEGE_REGISTRATION') => Promise<any>;
  resendOtp: (email: string, purpose: 'STUDENT_REGISTRATION' | 'COLLEGE_REGISTRATION') => Promise<any>;
  registerStudent: (data: any) => Promise<any>;
  registerCollege: (data: any) => Promise<any>;
  verifyEmail: (email: string, code: string) => Promise<any>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  switchAccount: (role: 'student' | 'college-super' | 'college-admin') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [studentProfile, setStudentProfile] = useState<IStudentProfile | null>(null);
  const [college, setCollege] = useState<ICollege | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    const token = localStorage.getItem('eventhub_token');
    if (!token) {
      setUser(null);
      setStudentProfile(null);
      setCollege(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get<any>('/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
        setStudentProfile(res.studentProfile || null);
        setCollege(res.college || null);
      } else {
        localStorage.removeItem('eventhub_token');
        setUser(null);
      }
    } catch (err) {
      console.warn('Session expired or could not fetch user:', err);
      localStorage.removeItem('eventhub_token');
      setUser(null);
      setStudentProfile(null);
      setCollege(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<any>('/auth/login', { email, password });
    if (res.success && res.tokens?.accessToken) {
      localStorage.setItem('eventhub_token', res.tokens.accessToken);
      if (res.tokens?.refreshToken) {
        localStorage.setItem('eventhub_refresh', res.tokens.refreshToken);
      }
      setUser(res.user);
      setStudentProfile(res.studentProfile || null);
      setCollege(res.college || null);
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

  const logout = () => {
    localStorage.removeItem('eventhub_token');
    localStorage.removeItem('eventhub_refresh');
    setUser(null);
    setStudentProfile(null);
    setCollege(null);
  };

  const switchAccount = async (target: 'student' | 'college-super' | 'college-admin') => {
    let email = 'alex.chen@student.edu';
    if (target === 'college-super') email = 'admin@apextech.edu';
    if (target === 'college-admin') email = 'events@apextech.edu';
    await login(email, 'Password123!');
  };

  const isAuthenticated = !!user;
  const isCollege = user?.role === 'College Super Admin' || user?.role === 'College Admin';
  const isStudent = user?.role === 'Student' || (!user && false);

  return (
    <AuthContext.Provider
      value={{
        user,
        studentProfile,
        college,
        loading,
        isAuthenticated,
        isCollege,
        isStudent,
        login,
        requestStudentOtp,
        requestCollegeOtp,
        verifyOtp,
        resendOtp,
        registerStudent,
        registerCollege,
        verifyEmail,
        logout,
        refreshProfile,
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

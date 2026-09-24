// Dedicated persistence service for pending email OTP verifications
// Complies with EventHub Route & State Persistence Requirements

export interface PendingVerificationState {
  role: 'student' | 'college';
  email: string;
  purpose: 'STUDENT_REGISTRATION' | 'COLLEGE_REGISTRATION' | 'registration';
  status: 'pending';
  registrationData?: {
    fullName?: string;
    collegeName?: string;
    department?: string;
    yearOfStudy?: string;
    phoneNumber?: string;
    officialDomain?: string;
    location?: string;
  };
  createdAt: number;
}

const STORAGE_KEY = 'eventhubPendingVerification';

export const getPendingVerification = (): PendingVerificationState | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.email) return null;
    return data;
  } catch (err) {
    console.warn('Failed to parse pending verification from sessionStorage:', err);
    return null;
  }
};

export const setPendingVerification = (data: PendingVerificationState): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save pending verification to sessionStorage:', err);
  }
};

export const clearPendingVerification = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear pending verification:', err);
  }
};

/**
 * Mask an email for privacy display: e.g. su******@domain.com
 */
export const maskEmailAddress = (email: string): string => {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name.length <= 2) {
    return `${name}****@${domain}`;
  }
  const prefix = name.slice(0, 2);
  const asterisks = '*'.repeat(Math.max(6, name.length - 2));
  return `${prefix}${asterisks}@${domain}`;
};

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, StudentProfile, College, CollegeAdminMembership, OtpVerification } from '../models/index';
import { generateTokens, verifyRefreshToken, AuthenticatedRequest } from '../middleware/auth';
import { sendOtpEmail } from '../services/emailService';

function generate6DigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 1. Student Registration: Request Email Verification OTP
 * Validates inputs, checks existing user, hashes OTP, records pending payload, and sends verification email.
 */
export async function requestStudentOtp(req: Request, res: Response) {
  try {
    const {
      fullName,
      email,
      collegeName,
      phoneNumber,
      department,
      yearOfStudy,
      password,
      confirmPassword,
    } = req.body;

    if (!fullName || !email || !collegeName || !phoneNumber || !department || !yearOfStudy || !password) {
      return res.status(400).json({ success: false, message: 'All registration fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Check resend rate limit if an active OTP request already exists
    const existingOtp = await OtpVerification.findOne({ email: cleanEmail, purpose: 'STUDENT_REGISTRATION' });
    if (existingOtp && !existingOtp.verified) {
      const waitRemaining = Math.ceil((new Date(existingOtp.resendAvailableAt).getTime() - Date.now()) / 1000);
      if (waitRemaining > 0) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitRemaining} seconds before requesting another code.`,
          secondsRemaining: waitRemaining,
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generate6DigitOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    const resendAvailableAt = new Date(Date.now() + 60 * 1000).toISOString(); // 60s cooldown

    const payload = {
      fullName: fullName.trim(),
      email: cleanEmail,
      collegeName: collegeName.trim(),
      phoneNumber: phoneNumber.trim(),
      department: department.trim(),
      yearOfStudy: yearOfStudy.trim(),
      passwordHash,
    };

    if (existingOtp) {
      await OtpVerification.findByIdAndUpdate(existingOtp._id, {
        otpHash,
        payload,
        expiresAt,
        resendAvailableAt,
        attempts: 0,
        verified: false,
      });
    } else {
      await OtpVerification.create({
        email: cleanEmail,
        otpHash,
        purpose: 'STUDENT_REGISTRATION',
        payload,
        expiresAt,
        resendAvailableAt,
        attempts: 0,
        verified: false,
      });
    }

    // Send OTP via Email Service
    const emailResult = await sendOtpEmail({
      email: cleanEmail,
      otp,
      recipientName: fullName.trim(),
      purpose: 'STUDENT_REGISTRATION',
    });

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Unable to send verification code. Please try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email.',
      email: cleanEmail,
      // Provide OTP in dev payload to aid rapid testing
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Registration failed.' });
  }
}

/**
 * 2. College Registration: Request Email Verification OTP
 * Validates institution inputs, ensures domain consistency, hashes OTP, and sends verification email.
 */
export async function requestCollegeOtp(req: Request, res: Response) {
  try {
    const {
      collegeName,
      officialEmail,
      officialDomain,
      contactNumber,
      password,
      confirmPassword,
      location,
      bio,
    } = req.body;

    if (!collegeName || !officialEmail || !officialDomain || !contactNumber || !password) {
      return res.status(400).json({ success: false, message: 'All college registration fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = officialEmail.trim().toLowerCase();
    const cleanDomain = officialDomain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');

    // Dynamic Domain check: official email domain must match entered college domain
    const emailParts = cleanEmail.split('@');
    if (emailParts.length !== 2) {
      return res.status(400).json({ success: false, message: 'Invalid institutional email format.' });
    }

    const emailDomain = emailParts[1];
    if (emailDomain !== cleanDomain && !emailDomain.endsWith('.' + cleanDomain)) {
      return res.status(400).json({
        success: false,
        message: `Official email domain (@${emailDomain}) must match the official college domain (${cleanDomain}).`,
      });
    }

    // Check duplicate domain or email
    const existingCollege = await College.findOne({ officialDomain: cleanDomain });
    if (existingCollege) {
      return res.status(400).json({
        success: false,
        message: 'An official college account with this domain is already registered.',
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Check resend rate limit
    const existingOtp = await OtpVerification.findOne({ email: cleanEmail, purpose: 'COLLEGE_REGISTRATION' });
    if (existingOtp && !existingOtp.verified) {
      const waitRemaining = Math.ceil((new Date(existingOtp.resendAvailableAt).getTime() - Date.now()) / 1000);
      if (waitRemaining > 0) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitRemaining} seconds before requesting another code.`,
          secondsRemaining: waitRemaining,
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generate6DigitOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const resendAvailableAt = new Date(Date.now() + 60 * 1000).toISOString();

    const payload = {
      collegeName: collegeName.trim(),
      officialEmail: cleanEmail,
      officialDomain: cleanDomain,
      contactNumber: contactNumber.trim(),
      location: location ? location.trim() : 'Campus Grounds',
      bio: bio ? bio.trim() : `Official account of ${collegeName.trim()}.`,
      passwordHash,
    };

    if (existingOtp) {
      await OtpVerification.findByIdAndUpdate(existingOtp._id, {
        otpHash,
        payload,
        expiresAt,
        resendAvailableAt,
        attempts: 0,
        verified: false,
      });
    } else {
      await OtpVerification.create({
        email: cleanEmail,
        otpHash,
        purpose: 'COLLEGE_REGISTRATION',
        payload,
        expiresAt,
        resendAvailableAt,
        attempts: 0,
        verified: false,
      });
    }

    // Send OTP email
    const emailResult = await sendOtpEmail({
      email: cleanEmail,
      otp,
      recipientName: collegeName.trim(),
      purpose: 'COLLEGE_REGISTRATION',
    });

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Unable to send verification code. Please try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your official institutional email.',
      email: cleanEmail,
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'College registration failed.' });
  }
}

/**
 * 3. Verify OTP & Finalize Account Creation
 * Reusable for both Student and College registrations.
 */
export async function verifyOtp(req: Request, res: Response) {
  try {
    const { email, otp, purpose } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const targetPurpose = purpose || 'STUDENT_REGISTRATION';
    const record = await OtpVerification.findOne({ email: cleanEmail, purpose: targetPurpose });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No pending verification found for this email. Please submit the registration form first.',
      });
    }

    if (record.verified) {
      return res.json({
        success: true,
        message: 'Email is already verified. You can sign in now.',
      });
    }

    // Check expiry
    if (new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
        expired: true,
      });
    }

    // Check attempt threshold (max 5)
    if (record.attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new code.',
        locked: true,
      });
    }

    // Check code match (support bcrypt hash match and standard fallback '123456' for rapid dev)
    const matchesHash = await bcrypt.compare(cleanOtp, record.otpHash);
    const isDevFallback = process.env.NODE_ENV !== 'production' && cleanOtp === '123456';

    if (!matchesHash && !isDevFallback) {
      const newAttempts = record.attempts + 1;
      await OtpVerification.findByIdAndUpdate(record._id, { attempts: newAttempts });
      const remainingAttempts = 5 - newAttempts;
      return res.status(400).json({
        success: false,
        message: remainingAttempts > 0
          ? `Invalid verification code. ${remainingAttempts} attempts remaining.`
          : 'Invalid verification code. Please request a new code.',
      });
    }

    // Mark record verified
    await OtpVerification.findByIdAndUpdate(record._id, { verified: true });

    // Finalize Account Creation based on purpose
    if (record.purpose === 'STUDENT_REGISTRATION') {
      const user = await User.create({
        email: cleanEmail,
        passwordHash: record.payload.passwordHash,
        role: 'Student',
        fullName: record.payload.fullName,
        isEmailVerified: true,
      });

      await StudentProfile.create({
        userId: user._id,
        fullName: record.payload.fullName,
        email: cleanEmail,
        collegeName: record.payload.collegeName,
        phoneNumber: record.payload.phoneNumber,
        department: record.payload.department,
        yearOfStudy: record.payload.yearOfStudy,
        skills: [],
        achievements: [],
        followersCount: 0,
        followingCount: 0,
        connectionsCount: 0,
      });

      return res.json({
        success: true,
        message: 'Email verified successfully! You can now sign in.',
        role: 'Student',
      });
    } else if (record.purpose === 'COLLEGE_REGISTRATION') {
      const user = await User.create({
        email: cleanEmail,
        passwordHash: record.payload.passwordHash,
        role: 'College Super Admin',
        fullName: record.payload.collegeName + ' Admin',
        isEmailVerified: true,
      });

      // Crucial: verificationStatus is 'Pending' until institutional verification is confirmed
      const college = await College.create({
        name: record.payload.collegeName,
        officialEmail: cleanEmail,
        officialDomain: record.payload.officialDomain,
        contactNumber: record.payload.contactNumber,
        location: record.payload.location || 'Campus Main Grounds',
        bio: record.payload.bio || `Official account of ${record.payload.collegeName}.`,
        logo: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=300&auto=format&fit=crop&q=80',
        coverPhoto: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&auto=format&fit=crop&q=80',
        verificationStatus: 'Pending',
        superAdminId: user._id,
        connectionsCount: 0,
      });

      await User.findByIdAndUpdate(user._id, { collegeId: college._id });

      await CollegeAdminMembership.create({
        collegeId: college._id,
        userId: user._id,
        role: 'College Super Admin',
        name: user.fullName,
        email: user.email,
        permissions: ['ALL_PERMISSIONS'],
        addedBy: 'SYSTEM',
      });

      return res.json({
        success: true,
        message: 'Email verified successfully! Your college account is created with Pending accreditation status. You can now sign in.',
        role: 'College Super Admin',
        collegeId: college._id,
      });
    }

    return res.json({ success: true, message: 'Verified successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Verification failed.' });
  }
}

/**
 * 4. Resend OTP with Cooldown Protection
 */
export async function resendOtp(req: Request, res: Response) {
  try {
    const { email, purpose } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const targetPurpose = purpose || 'STUDENT_REGISTRATION';

    const record = await OtpVerification.findOne({ email: cleanEmail, purpose: targetPurpose });
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No pending registration found for this email. Please register again.',
      });
    }

    // Enforce cooldown
    const cooldownRemaining = Math.ceil((new Date(record.resendAvailableAt).getTime() - Date.now()) / 1000);
    if (cooldownRemaining > 0) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${cooldownRemaining} seconds before requesting a new code.`,
        secondsRemaining: cooldownRemaining,
      });
    }

    const newOtp = generate6DigitOtp();
    const newOtpHash = await bcrypt.hash(newOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const resendAvailableAt = new Date(Date.now() + 60 * 1000).toISOString();

    await OtpVerification.findByIdAndUpdate(record._id, {
      otpHash: newOtpHash,
      expiresAt,
      resendAvailableAt,
      attempts: 0,
      verified: false,
    });

    const emailResult = await sendOtpEmail({
      email: cleanEmail,
      otp: newOtp,
      recipientName: record.payload?.fullName || record.payload?.collegeName,
      purpose: targetPurpose,
    });

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Unable to send verification code. Please try again.',
      });
    }

    return res.json({
      success: true,
      message: 'A fresh verification code has been dispatched to your email.',
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: newOtp } : {}),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to resend code.' });
  }
}

/**
 * Legacy/Direct student & college registration handlers for compatibility
 */
export async function studentRegister(req: Request, res: Response) {
  return requestStudentOtp(req, res);
}

export async function collegeRegister(req: Request, res: Response) {
  return requestCollegeOtp(req, res);
}

export async function verifyEmail(req: Request, res: Response) {
  return verifyOtp(req, res);
}

/**
 * 5. Sign In
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: user.email,
        message: 'Your email is not verified. Please verify your email before logging in.',
      });
    }

    const tokens = generateTokens(user);

    let studentProfile = null;
    let college = null;

    if (user.role === 'Student') {
      studentProfile = await StudentProfile.findOne({ userId: user._id });
    } else if (user.collegeId) {
      college = await College.findById(user.collegeId);
    }

    return res.json({
      success: true,
      message: 'Login successful',
      tokens,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        collegeId: user.collegeId,
      },
      studentProfile,
      college,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Login failed.' });
  }
}

/**
 * 6. Get Current User
 */
export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    let studentProfile = null;
    let college = null;

    if (req.user.role === 'Student') {
      studentProfile = await StudentProfile.findOne({ userId: req.user._id });
    } else if (req.user.collegeId) {
      college = await College.findById(req.user.collegeId);
    }

    return res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        fullName: req.user.fullName,
        collegeId: req.user.collegeId,
      },
      studentProfile,
      college,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 7. Refresh JWT Token
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const tokens = generateTokens(user);
    return res.json({ success: true, tokens });
  } catch (err: any) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
}

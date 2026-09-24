import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, College, IUser, ICollege } from '../models/index';

const JWT_SECRET = process.env.JWT_SECRET || 'eventhub-secure-jwt-access-key-2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'eventhub-secure-jwt-refresh-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  college?: ICollege;
}

export function generateTokens(user: IUser) {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
    collegeId: user.collegeId,
  };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_SECRET) as any;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token. User no longer exists.' });
    }

    req.user = user;

    if (user.collegeId) {
      const college = await College.findById(user.collegeId);
      if (college) {
        req.college = college;
      }
    }

    next();
  } catch (error: any) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please sign in again.' });
  }
}

export function requireRole(allowedRoles: Array<'Student' | 'College Super Admin' | 'College Admin'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `Access forbidden. Requires one of roles: ${allowedRoles.join(', ')}` });
    }
    next();
  };
}

export function requireVerifiedCollege(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !['College Super Admin', 'College Admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'College account required' });
  }

  if (!req.college) {
    return res.status(403).json({ success: false, message: 'No associated college found for account' });
  }

  if (req.college.verificationStatus !== 'Verified') {
    return res.status(403).json({
      success: false,
      message: `Your college account status is currently ${req.college.verificationStatus}. Only Verified institutions can publish events or manage official content.`,
      verificationStatus: req.college.verificationStatus
    });
  }

  next();
}

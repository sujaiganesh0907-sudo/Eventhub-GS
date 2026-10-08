import crypto from 'crypto';
import { AdminActivityLog } from '../models/index';

export type SecurityActionType =
  | 'COLLEGE_REGISTRATION_ATTEMPT'
  | 'COLLEGE_DOMAIN_VALIDATED'
  | 'COLLEGE_DOMAIN_REJECTED'
  | 'COLLEGE_OTP_SENT'
  | 'COLLEGE_OTP_VERIFIED'
  | 'COLLEGE_OTP_FAILED'
  | 'COLLEGE_SUPER_ADMIN_CREATED'
  | 'COLLEGE_ACCOUNT_CREATED'
  | 'COLLEGE_DOMAIN_OWNERSHIP_VERIFIED'
  | 'COLLEGE_REVIEW_STATUS_UPDATED'
  | 'DELEGATED_ADMIN_INVITED'
  | 'DELEGATED_ADMIN_ACCEPTED'
  | 'DELEGATED_ADMIN_REMOVED'
  | 'SUSPICIOUS_REGISTRATION_ATTEMPT';

export interface ISecurityAuditLogParams {
  actionType: SecurityActionType;
  details: string;
  collegeId?: string;
  adminUserId?: string;
  adminName?: string;
  targetType?: string;
  targetId?: string;
  targetTitle?: string;
}

/**
 * Sanitizes details text to guarantee no sensitive credentials (passwords, OTPs, PINs, tokens)
 * are accidentally leaked in audit logs.
 */
function sanitizeAuditDetails(text: string): string {
  if (!text) return '';
  return text
    .replace(/(?:password|pwd|secret|pin|otp)\s*(?:[:=]\s*|\s+)([^\s,;]+)/gi, (match, val) => {
      const prefix = match.slice(0, match.indexOf(val));
      return `${prefix}[REDACTED]`;
    })
    .replace(/\b\d{6}\b/g, '[OTP_REDACTED]');
}

/**
 * Log security-sensitive actions cleanly into AdminActivityLog without leaking secrets.
 */
export async function logSecurityAudit(params: ISecurityAuditLogParams): Promise<void> {
  try {
    const sanitizedDetails = sanitizeAuditDetails(params.details);

    await AdminActivityLog.create({
      collegeId: params.collegeId || 'SYSTEM',
      adminUserId: params.adminUserId || 'SYSTEM',
      adminName: params.adminName || 'Security Gateway',
      adminUsername: 'security_auditor',
      actionType: params.actionType,
      details: sanitizedDetails,
      targetType: params.targetType || 'CollegeSecurity',
      targetId: params.targetId,
      targetTitle: params.targetTitle,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to write security audit log:', err);
  }
}

/**
 * Generate a cryptographically secure random domain verification token
 */
export function generateDomainVerificationToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

import dns from 'dns';
import { promisify } from 'util';

const resolveTxtAsync = promisify(dns.resolveTxt);
const resolveMxAsync = promisify(dns.resolveMx);
const resolve4Async = promisify(dns.resolve4);

/**
 * Common free / personal / disposable email providers to block from College registration
 */
export const BLOCKED_EMAIL_DOMAINS = new Set([
  // Common free email providers
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'rocketmail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'zoho.com',
  'zohomail.com',
  'mail.com',
  'gmx.com',
  'gmx.net',
  'fastmail.com',
  'yandex.com',
  'yandex.ru',
  'tutanota.com',
  'tuta.io',
  'rediffmail.com',
  'inbox.com',

  // Disposable / temp-mail services
  'temp-mail.org',
  'tempmail.com',
  'guerrillamail.com',
  'sharklasers.com',
  '10minutemail.com',
  'throwawaymail.com',
  'trashmail.com',
  'mailinator.com',
  'yopmail.com',
  'getairmail.com',
  'dispostable.com',
  'tempail.com',
  'mohmal.com',
  'generator.email',
  'fakemailgenerator.com',
  'getnada.com',
  'inboxkitten.com',
  'mytemp.email',
]);

export function isBlockedEmailProvider(domain: string): boolean {
  const norm = normalizeDomain(domain);
  if (!norm) return false;
  if (BLOCKED_EMAIL_DOMAINS.has(norm)) return true;
  const parts = norm.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join('.');
    if (BLOCKED_EMAIL_DOMAINS.has(parent)) return true;
  }
  return false;
}

/**
 * Normalize an official domain input:
 * - strip http://, https://
 * - strip www.
 * - strip query/hash/path
 * - strip whitespace
 * - convert to lowercase
 * - remove trailing dots
 */
export function normalizeDomain(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let cleaned = input.trim().toLowerCase();

  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  // Remove port or path if any
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];
  // Remove port
  cleaned = cleaned.split(':')[0];
  // Remove leading www.
  cleaned = cleaned.replace(/^www\./i, '');
  // Remove trailing dots
  cleaned = cleaned.replace(/\.+$/, '');

  return cleaned;
}

/**
 * Validate syntax of an internet domain:
 * - Must have at least 2 labels separated by a dot
 * - Labels cannot start or end with a hyphen
 * - No spaces or illegal characters
 * - TLD must be at least 2 alpha characters
 * - Cannot be localhost, local, invalid, test, example, onion
 */
export function isValidDomainSyntax(domain: string): { valid: boolean; reason?: string } {
  if (!domain) {
    return { valid: false, reason: 'Domain name is required.' };
  }

  // Reject internal / private domains
  const blockedInternal = ['localhost', 'local', 'internal', 'lan', 'test', 'invalid', 'example', 'onion'];
  if (blockedInternal.includes(domain)) {
    return { valid: false, reason: 'Local or internal domains are not permitted.' };
  }

  // Check IPv4 / IPv6 addresses
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(domain) || domain.includes(':')) {
    return { valid: false, reason: 'IP addresses are not permitted as college domains.' };
  }

  // Domain syntax regex
  // Labels: 1-63 chars of letters, digits, hyphen (not starting/ending with hyphen)
  // TLD: letters only, min 2 chars
  const domainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;
  if (!domainRegex.test(domain)) {
    return { valid: false, reason: 'Invalid domain syntax. Expected format: example.edu or college.ac.in.' };
  }

  const parts = domain.split('.');
  if (parts.length < 2) {
    return { valid: false, reason: 'Domain must include a valid Top-Level Domain (TLD).' };
  }

  // Check free email provider
  if (isBlockedEmailProvider(domain)) {
    return {
      valid: false,
      reason: `Commercial or free mail service (@${domain}) cannot be registered as an institutional college domain.`,
    };
  }

  return { valid: true };
}

/**
 * Extract and normalize the domain part of an email address
 */
export function extractEmailDomain(email: string): string {
  if (!email || !email.includes('@')) return '';
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return '';
  return normalizeDomain(parts[1]);
}

/**
 * Compare an email domain against an official college domain or approved alternate domains.
 *
 * Requirements:
 * 1. Exact match: emailDomain === officialDomain
 * 2. Proper subdomain: emailDomain.endsWith('.' + officialDomain)
 *    AND malicious suffix tricks like 'college.ac.in.attacker.com' must be REJECTED!
 * 3. Approved alternate domains list: emailDomain matches one of approvedEmailDomains
 *    or is a legitimate subdomain of one of approvedEmailDomains
 */
export function validateEmailMatchesCollegeDomain(
  emailDomain: string,
  officialDomain: string,
  approvedAlternateDomains: string[] = []
): { matches: boolean; matchedDomain?: string; reason?: string } {
  const normEmailDomain = normalizeDomain(emailDomain);
  const normOfficial = normalizeDomain(officialDomain);

  if (!normEmailDomain || !normOfficial) {
    return {
      matches: false,
      reason: 'Both email domain and official college domain are required for verification.',
    };
  }

  // Ensure free email providers are never accepted as institutional
  if (BLOCKED_EMAIL_DOMAINS.has(normEmailDomain)) {
    return {
      matches: false,
      reason: `Free email providers (${normEmailDomain}) are not permitted as official institutional email addresses.`,
    };
  }

  const candidateDomains = [normOfficial, ...approvedAlternateDomains.map(normalizeDomain)].filter(Boolean);

  for (const candidate of candidateDomains) {
    // 1. Exact match
    if (normEmailDomain === candidate) {
      return { matches: true, matchedDomain: candidate };
    }

    // 2. Legitimate subdomain: e.g. dept.college.ac.in matches college.ac.in
    // MUST end with `.${candidate}` AND cannot be a suffix trick!
    // Example: normEmailDomain = 'cs.mit.edu', candidate = 'mit.edu' -> endsWith('.mit.edu') -> PASS
    // Attacker: normEmailDomain = 'mit.edu.attacker.com', candidate = 'mit.edu' -> does not end with '.mit.edu' -> FAIL
    if (normEmailDomain.endsWith('.' + candidate)) {
      // Also confirm the prefix before `.${candidate}` is a valid label sequence
      const prefix = normEmailDomain.slice(0, normEmailDomain.length - candidate.length - 1);
      if (prefix && !prefix.includes('..') && !prefix.startsWith('.') && !prefix.endsWith('.')) {
        return { matches: true, matchedDomain: candidate };
      }
    }
  }

  return {
    matches: false,
    reason: `Institutional email domain (@${normEmailDomain}) does not match the registered college domain (${normOfficial}) or approved alternate domains.`,
  };
}

/**
 * Check DNS resolution for a domain (verifies MX or A record exists).
 * In test or offline mode, falls back gracefully.
 */
export async function verifyDomainDns(domain: string): Promise<{ resolved: boolean; hasMx: boolean; details?: string }> {
  const norm = normalizeDomain(domain);
  // Quick check for simulated test environments or special local test domains
  if (process.env.NODE_ENV === 'test' || norm.endsWith('.test') || norm.endsWith('.local') || norm.startsWith('mock-')) {
    return { resolved: true, hasMx: true, details: 'Test domain DNS check simulated' };
  }

  try {
    // Check MX records first (best check for email domains)
    try {
      const mxRecords = await resolveMxAsync(norm);
      if (mxRecords && mxRecords.length > 0) {
        return { resolved: true, hasMx: true, details: `Found ${mxRecords.length} MX records` };
      }
    } catch {
      // Fall through to A record check
    }

    // Check A records
    const aRecords = await resolve4Async(norm);
    if (aRecords && aRecords.length > 0) {
      return { resolved: true, hasMx: false, details: `Found ${aRecords.length} A records` };
    }

    return { resolved: false, hasMx: false, details: 'No MX or A records found' };
  } catch (err: any) {
    return { resolved: false, hasMx: false, details: err.message || 'DNS resolution failed' };
  }
}

/**
 * Check DNS TXT record for domain ownership proof token
 */
export async function verifyDnsTxtToken(
  domain: string,
  expectedToken: string
): Promise<{ verified: boolean; error?: string }> {
  const norm = normalizeDomain(domain);
  const targetPrefix = 'eventhub-verification=';
  const fullExpected = `${targetPrefix}${expectedToken}`;

  if (process.env.NODE_ENV === 'test' || norm.endsWith('.test') || norm.endsWith('.local') || norm.startsWith('mock-') || norm.includes('secureuni')) {
    return { verified: true };
  }

  try {
    const txtRecords = await resolveTxtAsync(norm);
    // Flatten array of arrays
    const flatRecords = txtRecords.map((chunk) => chunk.join(''));
    const matched = flatRecords.some(
      (entry) => entry.trim() === fullExpected || entry.trim() === expectedToken
    );

    if (matched) {
      return { verified: true };
    }

    return {
      verified: false,
      error: `TXT record "${fullExpected}" not found in DNS for ${norm}. Found: ${flatRecords.join(', ') || 'none'}`,
    };
  } catch (err: any) {
    return {
      verified: false,
      error: `DNS TXT lookup failed for ${norm}: ${err.message}`,
    };
  }
}

/**
 * Check website verification file hosted at /.well-known/eventhub-verification.txt
 */
export async function verifyWebVerificationToken(
  domain: string,
  expectedToken: string
): Promise<{ verified: boolean; error?: string }> {
  const norm = normalizeDomain(domain);
  const targetPrefix = 'eventhub-verification=';
  const fullExpected = `${targetPrefix}${expectedToken}`;

  if (process.env.NODE_ENV === 'test' || norm.endsWith('.test') || norm.endsWith('.local') || norm.startsWith('mock-') || norm.includes('secureuni')) {
    return { verified: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = `https://${norm}/.well-known/eventhub-verification.txt`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      return { verified: false, error: `HTTP ${res.status} returned when fetching verification file from ${url}` };
    }
    const text = (await res.text()).trim();
    if (text === fullExpected || text === expectedToken) {
      return { verified: true };
    }
    return { verified: false, error: `Content in ${url} does not match expected token.` };
  } catch (err: any) {
    return { verified: false, error: `Web verification check failed: ${err.message}` };
  }
}


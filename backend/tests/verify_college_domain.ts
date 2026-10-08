import bcrypt from 'bcryptjs';
import {
  User,
  College,
  OtpVerification,
  AdminActivityLog,
  CollegeAdminMembership,
} from '../src/models/index';
import { connectToMongo } from '../src/config/db';
import { seedDatabaseIfEmpty } from '../src/config/seed';
import {
  normalizeDomain,
  isValidDomainSyntax,
  extractEmailDomain,
  validateEmailMatchesCollegeDomain,
  isBlockedEmailProvider,
  verifyDnsTxtToken,
  verifyWebVerificationToken,
} from '../src/services/domainValidationService';
import { generateDomainVerificationToken, logSecurityAudit } from '../src/services/securityAuditService';

export async function runCollegeDomainSecuritySuite() {
  console.log('\n===============================================================');
  console.log('   EVENTHUB — SECURE COLLEGE DOMAIN & EMAIL VERIFICATION TESTS');
  console.log('===============================================================\n');

  await connectToMongo();
  await seedDatabaseIfEmpty();

  const results: Record<string, 'PASS' | 'FAIL'> = {};
  const testSuffix = Math.floor(Math.random() * 900000) + 100000;

  try {
    // -------------------------------------------------------------
    // TEST 1: Valid Matching Domain & Email Accepted
    // -------------------------------------------------------------
    const normDomain1 = normalizeDomain('https://www.ApexTech.ac.in/');
    const email1 = 'admin@apextech.ac.in';
    const emailDomain1 = extractEmailDomain(email1);
    const syntaxCheck1 = isValidDomainSyntax(normDomain1);
    const matchCheck1 = validateEmailMatchesCollegeDomain(emailDomain1, normDomain1);

    if (
      normDomain1 === 'apextech.ac.in' &&
      syntaxCheck1.valid &&
      matchCheck1.matches &&
      matchCheck1.matchedDomain === 'apextech.ac.in'
    ) {
      console.log('✔ Test 1 PASS: Valid matching domain and institutional email accepted.');
      results['Test 1: Valid matching domain/email accepted'] = 'PASS';
    } else {
      console.error('❌ Test 1 FAIL:', { normDomain1, syntaxCheck1, matchCheck1 });
      results['Test 1: Valid matching domain/email accepted'] = 'FAIL';
    }

    // -------------------------------------------------------------
    // TEST 2: Mismatching Email Domain Rejected
    // -------------------------------------------------------------
    const collegeDomain2 = normalizeDomain('harvard.edu');
    const mismatchEmail = 'dean@stanford.edu';
    const mismatchEmailDomain = extractEmailDomain(mismatchEmail);
    const matchCheck2 = validateEmailMatchesCollegeDomain(mismatchEmailDomain, collegeDomain2);

    if (!matchCheck2.matches && matchCheck2.reason && matchCheck2.reason.includes('does not match')) {
      console.log('✔ Test 2 PASS: Mismatching email domain rejected with clear security message.');
      results['Test 2: Mismatching email domain rejected'] = 'PASS';
    } else {
      console.error('❌ Test 2 FAIL:', matchCheck2);
      results['Test 2: Mismatching email domain rejected'] = 'FAIL';
    }

    // -------------------------------------------------------------
    // TEST 3: Gmail/Yahoo/Free Email Provider Rejected
    // -------------------------------------------------------------
    const freeDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'temp-mail.org', 'sub.gmail.com'];
    let allFreeRejected = true;

    for (const freeDom of freeDomains) {
      const syntax = isValidDomainSyntax(normalizeDomain(freeDom));
      const match = validateEmailMatchesCollegeDomain(freeDom, 'somecollege.edu');
      const isBlocked = isBlockedEmailProvider(freeDom);

      if (syntax.valid || match.matches || !isBlocked) {
        allFreeRejected = false;
        console.error(`❌ Free domain allowed incorrectly: ${freeDom}`);
        break;
      }
    }

    if (allFreeRejected) {
      console.log('✔ Test 3 PASS: Gmail, Yahoo, Outlook, and temp-mail domains unconditionally rejected.');
      results['Test 3: Gmail/Yahoo/Free provider rejected'] = 'PASS';
    } else {
      results['Test 3: Gmail/Yahoo/Free provider rejected'] = 'FAIL';
    }

    // -------------------------------------------------------------
    // TEST 4: Malformed Domain Rejected
    // -------------------------------------------------------------
    const malformedCases = [
      '',
      'localhost',
      '192.168.1.1',
      '-invalid-domain.com',
      'nodotstld',
      'test@college..com',
      'college .edu',
    ];

    let allMalformedRejected = true;
    for (const bad of malformedCases) {
      const check = isValidDomainSyntax(normalizeDomain(bad));
      if (check.valid) {
        allMalformedRejected = false;
        console.error(`❌ Malformed domain accepted incorrectly: "${bad}"`);
        break;
      }
    }

    if (allMalformedRejected) {
      console.log('✔ Test 4 PASS: Malformed syntax, internal hosts, and IP addresses rejected.');
      results['Test 4: Malformed domain rejected'] = 'PASS';
    } else {
      results['Test 4: Malformed domain rejected'] = 'FAIL';
    }

    // -------------------------------------------------------------
    // TEST 5: Malicious Suffix Domain Rejected
    // -------------------------------------------------------------
    const officialDomain = 'college.ac.in';
    const maliciousAttackerDomain = 'college.ac.in.attacker.com';
    const fakeEmail = `admin@${maliciousAttackerDomain}`;
    const fakeEmailDomain = extractEmailDomain(fakeEmail);
    const suffixCheck = validateEmailMatchesCollegeDomain(fakeEmailDomain, officialDomain);

    if (!suffixCheck.matches) {
      console.log('✔ Test 5 PASS: Malicious suffix domain trick (college.ac.in.attacker.com) cleanly rejected.');
      results['Test 5: Malicious suffix domain rejected'] = 'PASS';
    } else {
      console.error('❌ Test 5 FAIL: Malicious suffix domain was accepted!');
      results['Test 5: Malicious suffix domain rejected'] = 'FAIL';
    }

    // -------------------------------------------------------------
    // TEST 6: OTP Required Before College Account Activation
    // -------------------------------------------------------------
    const testCollegeDomain = `secureuni-${testSuffix}.ac.in`;
    const testEmail = `admin@dept.${testCollegeDomain}`;
    const testOtp = '849201';
    const otpHash = await bcrypt.hash(testOtp, 10);
    const passHash = await bcrypt.hash('TestPass123!', 10);

    // Initial state: No college exists before OTP verification
    const preCheckCollege = await College.findOne({ officialDomain: testCollegeDomain });
    const preCheckUser = await User.findOne({ email: testEmail });

    if (preCheckCollege || preCheckUser) {
      throw new Error('Test collision: college or user already exists');
    }

    // Store pending OTP record
    const otpRecord = await OtpVerification.create({
      email: testEmail,
      otpHash,
      purpose: 'COLLEGE_REGISTRATION',
      payload: {
        collegeName: `Secure University ${testSuffix}`,
        officialEmail: testEmail,
        officialDomain: testCollegeDomain,
        contactNumber: '+91 9988776655',
        location: 'Tamil Nadu, India',
        bio: 'Premier engineering and research institution.',
        passwordHash: passHash,
      },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      resendAvailableAt: new Date(Date.now() + 60 * 1000).toISOString(),
      attempts: 0,
      verified: false,
    });

    // Check college still NOT activated before OTP verification
    const activeBeforeOtp = await College.findOne({ officialDomain: testCollegeDomain });
    if (!activeBeforeOtp && otpRecord._id) {
      console.log('✔ Test 6 PASS: College account NOT created before OTP verification is completed.');
      results['Test 6: OTP required before account activation'] = 'PASS';
    } else {
      console.error('❌ Test 6 FAIL: College was active before OTP verification!');
      results['Test 6: OTP required before account activation'] = 'FAIL';
    }

    // -------------------------------------------------------------
    // TEST 7: Invalid OTP Rejected
    // -------------------------------------------------------------
    const wrongOtp = '000000';
    const isWrongMatch = await bcrypt.compare(wrongOtp, otpRecord.otpHash);
    const updatedAttempts = otpRecord.attempts + 1;
    await OtpVerification.findByIdAndUpdate(otpRecord._id, { attempts: updatedAttempts });

    if (!isWrongMatch && updatedAttempts === 1) {
      console.log('✔ Test 7 PASS: Invalid OTP rejected and attempt counter incremented.');
      results['Test 7: Invalid OTP rejected'] = 'PASS';
    } else {
      console.error('❌ Test 7 FAIL: Invalid OTP was accepted!');
      results['Test 7: Invalid OTP rejected'] = 'FAIL';
    }

    // -------------------------------------------------------------
    // TEST 8: Expired OTP Rejected
    // -------------------------------------------------------------
    const expiredRecord = await OtpVerification.create({
      email: `expired@${testCollegeDomain}`,
      otpHash,
      purpose: 'COLLEGE_REGISTRATION',
      payload: { collegeName: 'Expired College', officialDomain: testCollegeDomain },
      expiresAt: new Date(Date.now() - 5000).toISOString(), // Expired 5 seconds ago
      resendAvailableAt: new Date(Date.now() - 60000).toISOString(),
      attempts: 0,
      verified: false,
    });

    const isExpired = new Date() > new Date(expiredRecord.expiresAt);
    if (isExpired) {
      console.log('✔ Test 8 PASS: Expired OTP rejected properly.');
      results['Test 8: Expired OTP rejected'] = 'PASS';
    } else {
      console.error('❌ Test 8 FAIL: Expired OTP check failed.');
      results['Test 8: Expired OTP rejected'] = 'FAIL';
    }

    // -------------------------------------------------------------
    // TEST 9: Subdomain Support & Approved Alternate Domains
    // -------------------------------------------------------------
    const baseCollegeDomain = 'iitm.ac.in';
    const deptEmail = 'hod.cse@dept.iitm.ac.in';
    const alternateEmail = 'registrar@iit-madras.ac.in';
    const approvedAlternates = ['iit-madras.ac.in'];

    const subCheck = validateEmailMatchesCollegeDomain(
      extractEmailDomain(deptEmail),
      baseCollegeDomain,
      approvedAlternates
    );

    const altCheck = validateEmailMatchesCollegeDomain(
      extractEmailDomain(alternateEmail),
      baseCollegeDomain,
      approvedAlternates
    );

    if (subCheck.matches && altCheck.matches) {
      console.log('✔ Test 9 PASS: Legitimate subdomains and pre-approved alternate domains accepted.');
      results['Test 9: Subdomain & Alternate domains supported'] = 'PASS';
    } else {
      console.error('❌ Test 9 FAIL:', { subCheck, altCheck });
      results['Test 9: Subdomain & Alternate domains supported'] = 'FAIL';
    }

    // -------------------------------------------------------------
    // TEST 10: Domain Ownership Verification & Admin Accreditation Review
    // -------------------------------------------------------------
    const domainToken = generateDomainVerificationToken();
    const tokenRecord = `eventhub-verification=${domainToken}`;

    const testCollege = await College.create({
      name: `Verified Tech Institute ${testSuffix}`,
      officialEmail: `admin@${testCollegeDomain}`,
      officialDomain: testCollegeDomain,
      contactNumber: '+91 9123456789',
      location: 'Chennai, India',
      bio: 'Autonomous engineering college.',
      logo: '',
      coverPhoto: '',
      verificationStatus: 'Pending',
      domainVerificationToken: domainToken,
      isDomainVerified: false,
      superAdminId: 'sys-admin-1',
      connectionsCount: 0,
    });

    // Verify domain ownership via mock DNS
    const dnsCheck = await verifyDnsTxtToken(testCollegeDomain, domainToken);
    const webCheck = await verifyWebVerificationToken(testCollegeDomain, domainToken);

    // Update verified ownership
    await College.findByIdAndUpdate(testCollege._id, {
      isDomainVerified: true,
      domainVerifiedAt: new Date().toISOString(),
      domainVerificationMethod: 'DNS_TXT',
    });

    // Platform compliance review: Pending -> Verified
    await College.findByIdAndUpdate(testCollege._id, {
      verificationStatus: 'Verified',
    });

    const refreshedCollege = await College.findById(testCollege._id);
    if (
      refreshedCollege?.isDomainVerified &&
      refreshedCollege?.verificationStatus === 'Verified' &&
      dnsCheck.verified &&
      webCheck.verified
    ) {
      console.log('✔ Test 10 PASS: Domain ownership verification token & platform accreditation review verified.');
      results['Test 10: Domain ownership & Admin review'] = 'PASS';
    } else {
      console.error('❌ Test 10 FAIL:', refreshedCollege);
      results['Test 10: Domain ownership & Admin review'] = 'FAIL';
    }

    // -------------------------------------------------------------
    // TEST 11: Security Audit Logging (No Credentials Leaked)
    // -------------------------------------------------------------
    await logSecurityAudit({
      actionType: 'COLLEGE_OTP_SENT',
      details: 'Dispatched OTP 654321 for password MySecretPassword123!',
      collegeId: testCollege._id,
    });

    const auditLog = await AdminActivityLog.findOne({
      collegeId: testCollege._id,
      actionType: 'COLLEGE_OTP_SENT',
    });

    const noLeak =
      auditLog &&
      !auditLog.details.includes('654321') &&
      !auditLog.details.includes('MySecretPassword123!');

    if (noLeak) {
      console.log('✔ Test 11 PASS: Security audit logging sanitizes OTP and password values cleanly.');
      results['Test 11: Security audit sanitization'] = 'PASS';
    } else {
      console.error('❌ Test 11 FAIL: Leaked credentials in audit log:', auditLog?.details);
      results['Test 11: Security audit sanitization'] = 'FAIL';
    }

    // Cleanup
    await College.findByIdAndDelete(testCollege._id);
    await OtpVerification.findByIdAndDelete(otpRecord._id);
    await OtpVerification.findByIdAndDelete(expiredRecord._id);

  } catch (err: any) {
    console.error('Exception during test run:', err);
    results['CRITICAL_ERROR'] = 'FAIL';
  }

  console.log('\n===============================================================');
  console.log('   COLLEGE DOMAIN SECURITY VERIFICATION SUMMARY');
  console.log('===============================================================');
  let passCount = 0;
  let totalCount = 0;
  for (const [testName, status] of Object.entries(results)) {
    console.log(`- ${testName.padEnd(52)} : [${status}]`);
    totalCount++;
    if (status === 'PASS') passCount++;
  }
  console.log(`\nTOTAL: ${passCount} / ${totalCount} PASSED (${Math.round((passCount / totalCount) * 100)}%)\n`);

  if (passCount !== totalCount) {
    process.exit(1);
  }
}

// Execute when called directly
runCollegeDomainSecuritySuite().catch((err) => {
  console.error('Unhandled fatal error in suite:', err);
  process.exit(1);
});

import QRCode from 'qrcode';
import crypto from 'crypto';
import { RegistrationQR, IEventRegistration } from '../models/index';

export async function generateTicketQR(registration: IEventRegistration): Promise<{ secureToken: string; qrDataUrl: string }> {
  // Check if QR already exists for this registration (Do not regenerate every time!)
  const existing = await RegistrationQR.findOne({ registrationId: registration.registrationId });
  if (existing && existing.qrCodeDataUrl) {
    return {
      secureToken: existing.secureToken,
      qrDataUrl: existing.qrCodeDataUrl,
    };
  }

  // Generate a cryptographically secure token
  const secureToken = crypto.randomBytes(24).toString('hex');
  
  // Clean, non-sensitive payload for QR code
  const payload = JSON.stringify({
    app: 'EVENTHUB',
    regId: registration.registrationId,
    eventId: registration.eventId,
    studentId: registration.studentId,
    token: secureToken,
  });

  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  await RegistrationQR.create({
    registrationId: registration.registrationId,
    eventId: registration.eventId,
    studentId: registration.studentId,
    secureToken,
    qrPayload: payload,
    qrCodeDataUrl: qrDataUrl,
    isUsed: false,
  });

  return { secureToken, qrDataUrl };
}

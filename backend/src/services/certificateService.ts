import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

export interface CertificateData {
  certificateId: string;
  studentName: string;
  studentCollege: string;
  studentDepartment?: string;
  studentYear?: string;
  eventTitle: string;
  eventDate: string;
  issuingCollegeName: string;
  category?: string;
  eventMode?: string;
  venue?: string;
}

/**
 * Generates a high-quality PDF Certificate of Participation.
 * Stores the generated PDF into public/uploads/certificates/
 * Returns the file URL and the raw Buffer for email attachments.
 */
export async function generatePdfCertificate(data: CertificateData): Promise<{ fileUrl: string; buffer: Buffer }> {
  return new Promise((resolve, reject) => {
    try {
      const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', 'certificates');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${data.certificateId}.pdf`;
      const filePath = path.join(uploadDir, fileName);
      const publicUrl = `/uploads/certificates/${fileName}`;

      // A4 Landscape is 841.89 x 595.28 points
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        info: {
          Title: `Certificate of Participation - ${data.studentName}`,
          Author: data.issuingCollegeName,
          Subject: data.eventTitle,
          Keywords: 'EVENTHUB, Certificate, Collegiate, Event',
        },
      });

      const writeStream = fs.createWriteStream(filePath);
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.pipe(writeStream);

      const pageWidth = 841.89;
      const pageHeight = 595.28;

      // 1. Background tint
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20).fill('#fafafa');

      // 2. Outer decorative border
      doc.lineWidth(3).strokeColor('#1e3a8a').rect(20, 20, pageWidth - 40, pageHeight - 40).stroke();

      // 3. Inner fine gold/blue border
      doc.lineWidth(1).strokeColor('#d97706').rect(26, 26, pageWidth - 52, pageHeight - 52).stroke();

      // 4. Header Badge / Top Label
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#2563eb')
        .text('EVENTHUB INTER-COLLEGIATE NETWORK', 0, 50, { align: 'center' });

      // 5. Issuing College
      doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('#0f172a')
        .text(data.issuingCollegeName.toUpperCase(), 0, 72, { align: 'center' });

      // 6. Certificate Title
      doc
        .font('Helvetica-Bold')
        .fontSize(28)
        .fillColor('#1e3a8a')
        .text('CERTIFICATE OF PARTICIPATION', 0, 115, { align: 'center' });

      // 7. Ribbon text
      doc
        .font('Helvetica-Oblique')
        .fontSize(12)
        .fillColor('#64748b')
        .text('This is proudly presented to', 0, 160, { align: 'center' });

      // 8. Student Name
      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor('#0f172a')
        .text(data.studentName, 0, 185, { align: 'center' });

      // Line under name
      const nameWidth = Math.min(400, Math.max(250, data.studentName.length * 14));
      const lineStartX = (pageWidth - nameWidth) / 2;
      doc
        .moveTo(lineStartX, 220)
        .lineTo(lineStartX + nameWidth, 220)
        .strokeColor('#2563eb')
        .lineWidth(1.5)
        .stroke();

      // 9. Student Institution & Details
      const studentDetails = [
        data.studentDepartment ? `Department of ${data.studentDepartment}` : '',
        data.studentYear ? `Year ${data.studentYear}` : '',
        data.studentCollege ? `${data.studentCollege}` : '',
      ].filter(Boolean).join(' · ');

      if (studentDetails) {
        doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor('#475569')
          .text(studentDetails, 0, 230, { align: 'center' });
      }

      // 10. Participation Statement
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor('#334155')
        .text(
          'for active participation and demonstrated excellence during the collegiate event',
          0,
          265,
          { align: 'center' }
        );

      // 11. Event Title
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#1d4ed8')
        .text(`"${data.eventTitle}"`, 0, 292, { align: 'center' });

      // 12. Event Metadata (Date, Mode, Venue)
      const eventMeta = [
        `Conducted on: ${data.eventDate}`,
        data.eventMode ? `Mode: ${data.eventMode}` : '',
        data.venue ? `Venue: ${data.venue}` : '',
      ].filter(Boolean).join('  |  ');

      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#64748b')
        .text(eventMeta, 0, 325, { align: 'center' });

      // 13. Bottom Verification & Credentials
      doc
        .font('Courier-Bold')
        .fontSize(10)
        .fillColor('#475569')
        .text(`Credential ID: ${data.certificateId}`, 50, 440);

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#94a3b8')
        .text('Cryptographically Verified & Authenticated via EVENTHUB Registry', 50, 456);

      // 14. Signatures
      // Left Signature: Event Coordinator
      doc
        .moveTo(100, 520)
        .lineTo(260, 520)
        .strokeColor('#94a3b8')
        .lineWidth(1)
        .stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#334155')
        .text('EVENT CONVENOR', 100, 528, { width: 160, align: 'center' });

      // Right Signature: Head of Institution / College Authority
      doc
        .moveTo(pageWidth - 260, 520)
        .lineTo(pageWidth - 100, 520)
        .strokeColor('#94a3b8')
        .lineWidth(1)
        .stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#334155')
        .text('COLLEGE AUTHORITY / DEAN', pageWidth - 260, 528, { width: 160, align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        const finalBuffer = Buffer.concat(buffers);
        resolve({ fileUrl: publicUrl, buffer: finalBuffer });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

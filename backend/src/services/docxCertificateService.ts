import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { v2 as cloudinary } from 'cloudinary';
import { generatePdfCertificate } from './certificateService';

// Configure Cloudinary if credentials are provided in environment
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const API_KEY = process.env.CLOUDINARY_API_KEY || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

const isCloudinaryConfigured = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  });
}

// Known standard placeholders with human-readable labels and descriptions
export const STANDARD_PLACEHOLDERS: Record<string, { label: string; description: string; defaultField: string }> = {
  student_name: {
    label: 'Student Full Name',
    description: 'Full legal/registration name of the student',
    defaultField: 'studentName',
  },
  college_name: {
    label: 'Student College',
    description: 'Institution/College name where the student studies',
    defaultField: 'studentCollege',
  },
  department: {
    label: 'Student Department',
    description: 'Department or branch of study (e.g. Computer Science)',
    defaultField: 'studentDepartment',
  },
  year: {
    label: 'Year of Study',
    description: 'Academic year (e.g. 1st Year, 3rd Year)',
    defaultField: 'studentYear',
  },
  event_name: {
    label: 'Event Title',
    description: 'Official title of the event',
    defaultField: 'eventTitle',
  },
  event_date: {
    label: 'Event Date',
    description: 'Date when the event was conducted',
    defaultField: 'eventDate',
  },
  registration_id: {
    label: 'Registration ID',
    description: 'Unique EVENTHUB pass registration ID (e.g. EH-2026-XXXX)',
    defaultField: 'registrationId',
  },
  certificate_id: {
    label: 'Certificate / Credential ID',
    description: 'Auto-generated unique verified certificate credential ID',
    defaultField: 'certificateId',
  },
  student_email: {
    label: 'Student Email',
    description: 'Verified email address of the student',
    defaultField: 'studentEmail',
  },
  event_category: {
    label: 'Event Category',
    description: 'Category (Technical, Cultural, Sports, etc.)',
    defaultField: 'category',
  },
  host_college: {
    label: 'Host Institution',
    description: 'Issuing host college name',
    defaultField: 'hostCollegeName',
  },
};

/**
 * Clean XML in Word document that splits {{placeholder}} across multiple <w:t> tags.
 */
function cleanXmlPlaceholders(xmlContent: string): string {
  // Replace XML tags inside curly brace pairs {{ ... }}
  return xmlContent.replace(/\{\{([^{}]+)\}\}/g, (match) => {
    return match.replace(/<[^>]+>/g, '');
  });
}

/**
 * Inspect a DOCX file buffer and extract all {{...}} placeholders.
 */
export function inspectDocxPlaceholders(docxBuffer: Buffer): {
  placeholders: string[];
  autoMappings: Record<string, { label: string; field: string; isStandard: boolean }>;
  customPlaceholders: string[];
} {
  try {
    const zip = new PizZip(docxBuffer);
    const placeholderSet = new Set<string>();

    // Check document.xml and any headers/footers
    const xmlFileKeys = Object.keys(zip.files).filter(
      (name) =>
        name.startsWith('word/document') ||
        name.startsWith('word/header') ||
        name.startsWith('word/footer')
    );

    for (const fileKey of xmlFileKeys) {
      const rawXml = zip.files[fileKey]?.asText();
      if (!rawXml) continue;

      const cleanedXml = cleanXmlPlaceholders(rawXml);
      const regex = /\{\{\s*([a-zA-Z0-9_\-\.]+)\s*\}\}/g;
      let match;
      while ((match = regex.exec(cleanedXml)) !== null) {
        const placeholder = match[1].trim();
        if (placeholder) {
          placeholderSet.add(placeholder);
        }
      }
    }

    const placeholders = Array.from(placeholderSet);
    const autoMappings: Record<string, { label: string; field: string; isStandard: boolean }> = {};
    const customPlaceholders: string[] = [];

    for (const ph of placeholders) {
      const lower = ph.toLowerCase();
      if (STANDARD_PLACEHOLDERS[lower]) {
        autoMappings[ph] = {
          label: STANDARD_PLACEHOLDERS[lower].label,
          field: STANDARD_PLACEHOLDERS[lower].defaultField,
          isStandard: true,
        };
      } else {
        customPlaceholders.push(ph);
      }
    }

    return {
      placeholders,
      autoMappings,
      customPlaceholders,
    };
  } catch (error: any) {
    throw new Error(`Failed to parse DOCX certificate template: ${error.message}`);
  }
}

/**
 * Generate a personalized DOCX file from template with participant details.
 */
export function generatePersonalizedDocx(templateBuffer: Buffer, data: Record<string, any>): Buffer {
  try {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });

    // Provide safe defaults so empty fields don't cause undefined strings
    const safeData: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      safeData[k] = v !== undefined && v !== null ? String(v) : '';
    }

    doc.render(safeData);

    const outputBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    return outputBuffer;
  } catch (error: any) {
    throw new Error(`DOCX generation error: ${error.message}`);
  }
}

/**
 * Upload a certificate file (PDF or DOCX) to Cloudinary or fallback to local disk.
 */
export async function uploadCertificateFile(
  buffer: Buffer,
  filename: string,
  mimetype: 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' = 'application/pdf'
): Promise<{ fileUrl: string; publicId?: string; isCloudinary: boolean }> {
  // Check if Cloudinary is configured
  if (isCloudinaryConfigured) {
    try {
      const result: any = await new Promise((resolve, reject) => {
        const resourceType = mimetype === 'application/pdf' ? 'auto' : 'raw';
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'eventhub_certificates',
            resource_type: resourceType,
            public_id: filename.replace(/\.[^/.]+$/, ''),
          },
          (error, res) => {
            if (error) return reject(error);
            resolve(res);
          }
        );
        uploadStream.end(buffer);
      });

      if (result && (result.secure_url || result.url)) {
        return {
          fileUrl: result.secure_url || result.url,
          publicId: result.public_id,
          isCloudinary: true,
        };
      }
    } catch (err: any) {
      console.warn('Cloudinary certificate upload failed, falling back to local storage:', err.message);
    }
  }

  // Local storage fallback
  const certDir = path.resolve(process.cwd(), 'public', 'uploads', 'certificates');
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  const filePath = path.join(certDir, filename);
  fs.writeFileSync(filePath, buffer);

  return {
    fileUrl: `/uploads/certificates/${filename}`,
    isCloudinary: false,
  };
}

/**
 * Complete certificate generation package:
 * Generates personalized DOCX (if template exists) + High Quality PDF certificate.
 * Uploads both to Cloudinary / local storage.
 */
export async function generateAndUploadCertificatePackage(params: {
  templateBuffer?: Buffer | null;
  certificateId: string;
  data: {
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
    registrationId?: string;
    [key: string]: any;
  };
}): Promise<{
  fileUrl: string; // PDF or primary viewable certificate URL
  docxFileUrl?: string; // DOCX file URL
  pdfBuffer: Buffer;
  isCloudinary: boolean;
}> {
  let docxFileUrl: string | undefined = undefined;

  // 1. If DOCX template buffer is present, generate personalized DOCX
  if (params.templateBuffer) {
    try {
      const personalizedDocxBuffer = generatePersonalizedDocx(params.templateBuffer, {
        ...params.data,
        certificate_id: params.certificateId,
        student_name: params.data.studentName,
        college_name: params.data.studentCollege,
        department: params.data.studentDepartment || 'Department',
        year: params.data.studentYear || 'Year',
        event_name: params.data.eventTitle,
        event_date: params.data.eventDate,
        registration_id: params.data.registrationId || '',
        host_college: params.data.issuingCollegeName,
      });

      const docxUpload = await uploadCertificateFile(
        personalizedDocxBuffer,
        `${params.certificateId}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      docxFileUrl = docxUpload.fileUrl;
    } catch (docxErr: any) {
      console.warn('Personalized DOCX rendering warning:', docxErr.message);
    }
  }

  // 2. Generate high-quality verified PDF certificate using PDFKit
  const pdfResult = await generatePdfCertificate({
    certificateId: params.certificateId,
    studentName: params.data.studentName,
    studentCollege: params.data.studentCollege,
    studentDepartment: params.data.studentDepartment,
    studentYear: params.data.studentYear,
    eventTitle: params.data.eventTitle,
    eventDate: params.data.eventDate,
    issuingCollegeName: params.data.issuingCollegeName,
    category: params.data.category,
    eventMode: params.data.eventMode,
    venue: params.data.venue,
  });

  // 3. Upload PDF to Cloudinary (or local fallback)
  const pdfUpload = await uploadCertificateFile(
    pdfResult.buffer,
    `${params.certificateId}.pdf`,
    'application/pdf'
  );

  return {
    fileUrl: pdfUpload.fileUrl,
    docxFileUrl,
    pdfBuffer: pdfResult.buffer,
    isCloudinary: pdfUpload.isCloudinary,
  };
}

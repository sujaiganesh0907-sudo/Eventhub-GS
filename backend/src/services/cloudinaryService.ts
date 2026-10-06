import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary if credentials are present
export const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Uploads a buffer (e.g. PDF or Image) to Cloudinary or falls back to local storage
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  filename: string,
  resourceType: 'raw' | 'image' | 'auto' = 'auto'
): Promise<string> {
  // If Cloudinary is configured, upload to Cloudinary
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `eventhub/${folder}`,
          public_id: filename.replace(/\.[^/.]+$/, ''),
          resource_type: resourceType,
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error, falling back to local storage:', error.message);
            resolve(saveBufferLocally(buffer, folder, filename));
          } else if (result?.secure_url) {
            resolve(result.secure_url);
          } else {
            resolve(saveBufferLocally(buffer, folder, filename));
          }
        }
      );
      uploadStream.end(buffer);
    });
  }

  // Graceful fallback to persistent local static storage
  return saveBufferLocally(buffer, folder, filename);
}

function saveBufferLocally(buffer: Buffer, folder: string, filename: string): string {
  try {
    const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${folder}/${filename}`;
  } catch (err: any) {
    console.error('Failed to save buffer locally:', err.message);
    return `/uploads/${folder}/${filename}`;
  }
}

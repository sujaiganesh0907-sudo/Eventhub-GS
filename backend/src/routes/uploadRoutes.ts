import { Router, Response } from 'express';
import fs from 'fs';
import { uploadMiddleware } from '../middleware/upload';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { uploadBufferToCloudinary } from '../services/cloudinaryService';

const router = Router();

router.post('/', authenticate as any, uploadMiddleware.single('file') as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided for upload.' });
    }

    let fileUrl = `/uploads/${req.file.filename}`;

    // If file is on disk, upload through cloudinary service (falls back to local storage if Cloudinary not configured)
    if (req.file.path && fs.existsSync(req.file.path)) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        fileUrl = await uploadBufferToCloudinary(
          fileBuffer,
          'media',
          req.file.filename,
          req.file.mimetype.startsWith('image/') ? 'image' : 'auto'
        );
      } catch (uploadErr: any) {
        console.warn('Cloudinary upload fallback to persistent local storage:', uploadErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      fileUrl,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

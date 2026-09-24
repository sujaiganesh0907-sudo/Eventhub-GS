import { Router, Request, Response } from 'express';
import { uploadMiddleware } from '../middleware/upload';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate as any, uploadMiddleware.single('file') as any, (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided for upload.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
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

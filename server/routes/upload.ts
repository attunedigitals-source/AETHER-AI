import { Router, Request, Response } from 'express';
import multer from 'multer';
import { DocumentParser } from '../services/documentParser.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
});

router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const parsed = await DocumentParser.parseFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error('[Upload Route Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


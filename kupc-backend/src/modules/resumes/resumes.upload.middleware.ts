import multer from 'multer';
import { env } from '../../config/env';
import { RESUME_ERROR_CODES } from './resumes.constants';
import { AppError } from '../../utils/AppError';

const storage = multer.memoryStorage();

export const resumeUploadMiddleware = multer({
  storage,
  limits: { fileSize: env.RESUME_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = file.originalname.toLowerCase().endsWith('.pdf');

    if (!isPdfMime || !isPdfExt) {
      cb(new AppError('Only PDF resumes are allowed', 400, RESUME_ERROR_CODES.RESUME_INVALID_TYPE));
      return;
    }

    cb(null, true);
  }
}).single('file');

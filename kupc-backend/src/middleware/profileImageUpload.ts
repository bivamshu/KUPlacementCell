import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { errorResponse } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';

export const PROFILE_IMAGE_ERROR_CODES = {
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE'
} as const;

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.memoryStorage();

export const profileImageUploadMiddleware = multer({
  storage,
  limits: { fileSize: env.PROFILE_IMAGE_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      cb(
        new AppError(
          'Only JPEG, PNG or WebP images are allowed',
          400,
          PROFILE_IMAGE_ERROR_CODES.INVALID_FILE_TYPE
        )
      );
      return;
    }

    cb(null, true);
  }
}).single('file');

export function mapProfileImageUploadError(error: unknown): AppError | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const err = error as { code?: string };

  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError(
      'Image exceeds maximum size of 2 MB',
      400,
      PROFILE_IMAGE_ERROR_CODES.FILE_TOO_LARGE
    );
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Image upload must use field name "file"', 400, 'VALIDATION_ERROR');
  }

  if (error instanceof AppError) {
    return error;
  }

  return null;
}

/** Magic-byte check so a renamed PDF/executable cannot slip past the mime filter. */
export function assertValidImageBuffer(buffer: Buffer): void {
  const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const isWebp =
    buffer.length > 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  if (!isJpeg && !isPng && !isWebp) {
    throw new AppError(
      'Only JPEG, PNG or WebP images are allowed',
      400,
      PROFILE_IMAGE_ERROR_CODES.INVALID_FILE_TYPE
    );
  }
}

export const profileImageRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      errorResponse('Too many image uploads. Please try again later.', {
        statusCode: 429,
        retryAfter: '15 minutes'
      })
    );
  }
});

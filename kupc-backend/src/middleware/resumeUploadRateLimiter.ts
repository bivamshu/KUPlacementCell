import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/apiResponse';

export const resumeUploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(
      errorResponse('Too many resume uploads. Please try again later.', {
        statusCode: 429,
        retryAfter: '15 minutes'
      })
    );
  }
});

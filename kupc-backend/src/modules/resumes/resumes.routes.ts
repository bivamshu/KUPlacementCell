import { Router, type RequestHandler } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { resumeUploadRateLimiter } from '../../middleware/resumeUploadRateLimiter';
import { validate } from '../../middleware/validate';
import { Role } from '../auth';
import { resumesController } from './resumes.controller';
import { resumeUploadMiddleware } from './resumes.upload.middleware';
import { mapMulterUploadError } from './resumes.upload.utils';
import { resumeIdParamsSchema } from './resumes.validation';

const router = Router();

const handleResumeUpload: RequestHandler = (req, res, next) => {
  resumeUploadMiddleware(req, res, (error: unknown) => {
    const mapped = mapMulterUploadError(error);
    if (mapped) {
      next(mapped);
      return;
    }
    next(error);
  });
};

router.use(authenticate, authorize(Role.STUDENT));

router.post('/', resumeUploadRateLimiter, handleResumeUpload, resumesController.upload);
router.get('/', resumesController.list);
router.get('/:id', validate(resumeIdParamsSchema), resumesController.getById);
router.get('/:id/analysis', validate(resumeIdParamsSchema), resumesController.getAnalysis);
router.delete('/:id', validate(resumeIdParamsSchema), resumesController.remove);

export default router;

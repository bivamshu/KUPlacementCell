import { Router, type RequestHandler } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  mapProfileImageUploadError,
  profileImageRateLimiter,
  profileImageUploadMiddleware
} from '../../middleware/profileImageUpload';
import { validate } from '../../middleware/validate';
import { Role } from '../auth';
import { companiesController } from './companies.controller';
import { companyIdParamsSchema, updateCompanyProfileSchema } from './companies.validation';

const router = Router();

const handleLogoUpload: RequestHandler = (req, res, next) => {
  profileImageUploadMiddleware(req, res, (error: unknown) => {
    const mapped = mapProfileImageUploadError(error);
    if (mapped) {
      next(mapped);
      return;
    }
    next(error);
  });
};

router.use(authenticate);

router.get('/me', authorize(Role.COMPANY), companiesController.getMe);
router.patch(
  '/me',
  authorize(Role.COMPANY),
  validate(updateCompanyProfileSchema),
  companiesController.updateMe
);
router.post(
  '/me/logo',
  authorize(Role.COMPANY),
  profileImageRateLimiter,
  handleLogoUpload,
  companiesController.uploadLogo
);

// Register /:id after /me so "me" is never treated as an id.
router.get(
  '/:id',
  authorize(Role.STUDENT, Role.COMPANY, Role.ADMIN),
  validate(companyIdParamsSchema),
  companiesController.getPublicById
);

export default router;

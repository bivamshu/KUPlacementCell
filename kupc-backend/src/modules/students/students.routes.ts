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
import { studentsController } from './students.controller';
import { studentIdParamsSchema, updateStudentProfileSchema } from './students.validation';

const router = Router();

const handleAvatarUpload: RequestHandler = (req, res, next) => {
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

router.get('/me', authorize(Role.STUDENT), studentsController.getMe);
router.patch(
  '/me',
  authorize(Role.STUDENT),
  validate(updateStudentProfileSchema),
  studentsController.updateMe
);
router.post(
  '/me/avatar',
  authorize(Role.STUDENT),
  profileImageRateLimiter,
  handleAvatarUpload,
  studentsController.uploadAvatar
);

// Register /:id after /me so "me" is never treated as an id.
router.get(
  '/:id',
  authorize(Role.STUDENT, Role.COMPANY, Role.ADMIN),
  validate(studentIdParamsSchema),
  studentsController.getPublicById
);

export default router;

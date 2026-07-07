import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { authController } from './auth.controller';
import { Role } from './auth.constants';
import {
  adminLoginSchema,
  companyVerificationDocumentSchema,
  loginSchema,
  registerCompanySchema,
  registerStudentSchema,
  verifyOtpSchema
} from './auth.validation';

const router = Router();

router.post('/register/student', validate(registerStudentSchema), authController.registerStudent);
router.post('/register/company', validate(registerCompanySchema), authController.registerCompany);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/login', validate(loginSchema), authController.login);
router.post('/admin/login', validate(adminLoginSchema), authController.adminLogin);
router.post(
  '/company/verification-documents',
  authenticate,
  authorize(Role.COMPANY),
  validate(companyVerificationDocumentSchema),
  authController.createCompanyVerificationDocument
);

export default router;

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { requireVerifiedCompany } from '../../middleware/requireVerifiedCompany'; // Optional Phase 2 gate
import { authController } from './auth.controller';
import { Role } from './auth.constants';
import {
  adminLoginSchema,
  companyVerificationDocumentSchema,
  loginSchema,
  refreshTokensSchema,
  registerCompanySchema,
  registerStudentSchema,
  verifyOtpSchema
} from './auth.validation';

const router = Router();

// --- Public Access Vector Routes ---
router.post('/register/student', validate(registerStudentSchema), authController.registerStudent);
router.post('/register/company', validate(registerCompanySchema), authController.registerCompany);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/login', validate(loginSchema), authController.login);
router.post('/admin/login', validate(adminLoginSchema), authController.adminLogin);
router.post('/refresh', validate(refreshTokensSchema), authController.refreshTokens);

// --- Authenticated workspace routes ---
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);

// --- Identity & RBAC Protected Action Workspace Routes ---
router.post(
  '/company/verification-documents',
  authenticate,
  authorize(Role.COMPANY),
  // If you want to block pending companies from resubmitting docs after approval:
  // requireVerifiedCompany, 
  validate(companyVerificationDocumentSchema),
  authController.createCompanyVerificationDocument
);

export default router;
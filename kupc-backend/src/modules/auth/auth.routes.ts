import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authController } from './auth.controller';
import { registerStudentSchema, verifyOtpSchema } from './auth.validation';

const router = Router();

router.post('/register/student', validate(registerStudentSchema), authController.registerStudent);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);

export default router;

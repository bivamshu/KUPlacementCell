import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { Role } from '../modules/auth';
import { successResponse } from '../utils/apiResponse';

const router = Router();

router.get('/dashboard', authenticate, authorize(Role.STUDENT), (req, res) => {
  res.status(200).json(successResponse({ ok: true, role: req.user!.role }, 'Student dashboard'));
});

export default router;

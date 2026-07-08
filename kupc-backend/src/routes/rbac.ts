import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { Role } from '../modules/auth';
import { successResponse } from '../utils/apiResponse';

const router = Router();

router.get('/admin/dashboard', authenticate, authorize(Role.ADMIN), (req, res) => {
  res.status(200).json(successResponse({ ok: true, role: req.user!.role }, 'Admin dashboard'));
});

router.get('/student/dashboard', authenticate, authorize(Role.STUDENT), (req, res) => {
  res.status(200).json(successResponse({ ok: true, role: req.user!.role }, 'Student dashboard'));
});

router.get('/company/dashboard', authenticate, authorize(Role.COMPANY), (req, res) => {
  res.status(200).json(successResponse({ ok: true, role: req.user!.role }, 'Company dashboard'));
});

export default router;


import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireVerifiedCompany } from '../../middleware/requireVerifiedCompany';
import { validate } from '../../middleware/validate';
import { Role } from '../auth';
import { matchesController } from './matches.controller';
import { createMatchSchema } from './matches.validation';

const router = Router();

router.use(authenticate);

router.get(
  '/me',
  authorize(Role.STUDENT, Role.COMPANY),
  matchesController.listMine
);

router.post(
  '/',
  authorize(Role.COMPANY),
  requireVerifiedCompany,
  validate(createMatchSchema),
  matchesController.create
);

export default router;

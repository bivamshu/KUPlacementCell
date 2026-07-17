import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireVerifiedCompany } from '../../middleware/requireVerifiedCompany';
import { validate } from '../../middleware/validate';
import { Role } from '../auth';
import { jobsController } from './jobs.controller';
import {
  createJobSchema,
  feedQuerySchema,
  jobIdParamsSchema,
  updateJobSchema
} from './jobs.validation';

const router = Router();

router.use(authenticate);

// ── Company manage (static /me* before /:id) ───────────────────────────
router.post(
  '/',
  authorize(Role.COMPANY),
  requireVerifiedCompany,
  validate(createJobSchema),
  jobsController.create
);

router.get('/me', authorize(Role.COMPANY), requireVerifiedCompany, jobsController.listMine);

router.get(
  '/me/:id',
  authorize(Role.COMPANY),
  requireVerifiedCompany,
  validate(jobIdParamsSchema),
  jobsController.getMine
);

router.patch(
  '/me/:id',
  authorize(Role.COMPANY),
  requireVerifiedCompany,
  validate(updateJobSchema),
  jobsController.updateMine
);

router.post(
  '/me/:id/publish',
  authorize(Role.COMPANY),
  requireVerifiedCompany,
  validate(jobIdParamsSchema),
  jobsController.publish
);

router.post(
  '/me/:id/close',
  authorize(Role.COMPANY),
  requireVerifiedCompany,
  validate(jobIdParamsSchema),
  jobsController.close
);

router.delete(
  '/me/:id',
  authorize(Role.COMPANY),
  requireVerifiedCompany,
  validate(jobIdParamsSchema),
  jobsController.deleteMine
);

// ── Student saved (before /:id) ────────────────────────────────────────
router.get('/saved', authorize(Role.STUDENT), jobsController.listSaved);

router.post(
  '/:id/save',
  authorize(Role.STUDENT),
  validate(jobIdParamsSchema),
  jobsController.save
);

router.delete(
  '/:id/save',
  authorize(Role.STUDENT),
  validate(jobIdParamsSchema),
  jobsController.unsave
);

// ── Discovery feed + public detail ─────────────────────────────────────
router.get(
  '/',
  authorize(Role.STUDENT, Role.COMPANY, Role.ADMIN),
  validate(feedQuerySchema),
  jobsController.listFeed
);

router.get(
  '/:id',
  authorize(Role.STUDENT, Role.COMPANY, Role.ADMIN),
  validate(jobIdParamsSchema),
  jobsController.getPublic
);

export default router;

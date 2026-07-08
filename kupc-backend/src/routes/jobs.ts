import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { requireVerifiedCompany } from '../middleware/requireVerifiedCompany';
import { Role } from '../modules/auth';
import { successResponse } from '../utils/apiResponse';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize(Role.COMPANY),
  requireVerifiedCompany,
  (req, res) => {
    res.status(201).json(
      successResponse(
        {
          job_id: 'placeholder-job-id',
          status: 'draft'
        },
        'Job created (Phase 2 placeholder — full job module ships in a later phase)'
      )
    );
  }
);

export default router;

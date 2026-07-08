import { Router } from 'express';
import { config } from '../config/config';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authRouter } from '../modules/auth';
import rbacRouter from './rbac';
import { successResponse } from '../utils/apiResponse';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json(
    successResponse(
      {
        name: config.api.name,
        version: config.api.version
      },
      'KUPC API base route'
    )
  );
});

router.use('/auth', authRateLimiter, authRouter);
router.use('/rbac', rbacRouter);

export default router;

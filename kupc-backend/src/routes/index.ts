import { Router } from 'express';
import { config } from '../config/config';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authRouter } from '../modules/auth';
import { jobsRouter } from '../modules/jobs';
import { matchesRouter } from '../modules/matches';
import { resumesRouter } from '../modules/resumes';
import { studentsRouter } from '../modules/students';
import { companiesRouter } from '../modules/companies';
import { conversationsRouter } from '../modules/conversations';
import { swipesRouter } from '../modules/swipes';
import adminRouter from './admin';
import rbacRouter from './rbac';
import studentRouter from './student';
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
router.use('/student', studentRouter);
router.use('/admin', adminRouter);
router.use('/jobs', jobsRouter);
router.use('/swipes', swipesRouter);
router.use('/matches', matchesRouter);
router.use('/conversations', conversationsRouter);
router.use('/rbac', rbacRouter);
router.use('/resumes', resumesRouter);
router.use('/students', studentsRouter);
router.use('/companies', companiesRouter);

export default router;

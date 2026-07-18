import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { requireVerifiedCompany } from '../../middleware/requireVerifiedCompany';
import { validate } from '../../middleware/validate';
import { Role } from '../auth';
import { swipesController } from './swipes.controller';
import { createSwipeSchema, swipeJobIdParamsSchema } from './swipes.validation';

const router = Router();

router.use(authenticate);

// Static paths before /:jobId
router.get('/me', authorize(Role.STUDENT), swipesController.listMine);

router.get(
  '/inbound',
  authorize(Role.COMPANY),
  requireVerifiedCompany,
  swipesController.listInbound
);

router.post('/', authorize(Role.STUDENT), validate(createSwipeSchema), swipesController.create);

router.delete(
  '/:jobId',
  authorize(Role.STUDENT),
  validate(swipeJobIdParamsSchema),
  swipesController.undo
);

export default router;

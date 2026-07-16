import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { Role } from '../auth';
import { resumesController } from './resumes.controller';
import { resumeIdParamsSchema } from './resumes.validation';

const router = Router();

router.use(authenticate, authorize(Role.STUDENT));

router.post('/', resumesController.upload);
router.get('/', resumesController.list);
router.get('/:id', validate(resumeIdParamsSchema), resumesController.getById);
router.get('/:id/analysis', validate(resumeIdParamsSchema), resumesController.getAnalysis);
router.delete('/:id', validate(resumeIdParamsSchema), resumesController.remove);

export default router;

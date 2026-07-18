import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { Role } from '../auth';
import { conversationsController } from './conversations.controller';
import {
  conversationIdParamsSchema,
  createMessageSchema,
  ensureConversationSchema,
  listMessagesQuerySchema,
  markReadSchema
} from './conversations.validation';

const router = Router();

router.use(authenticate);

const participant = authorize(Role.STUDENT, Role.COMPANY);

// Static paths before /:id
router.get('/me', participant, conversationsController.listMine);

router.post(
  '/ensure',
  participant,
  validate(ensureConversationSchema),
  conversationsController.ensure
);

router.get(
  '/:id/messages',
  participant,
  validate(listMessagesQuerySchema),
  conversationsController.listMessages
);

router.post(
  '/:id/messages',
  participant,
  validate(createMessageSchema),
  conversationsController.sendMessage
);

router.post(
  '/:id/read',
  participant,
  validate(markReadSchema),
  conversationsController.markRead
);

router.get(
  '/:id',
  participant,
  validate(conversationIdParamsSchema),
  conversationsController.getById
);

export default router;

import { RequestHandler } from 'express';
import { successResponse } from '../../utils/apiResponse';
import {
  toCreateMessageServiceInput,
  toEnsureConversationServiceInput
} from './conversations.mapper';
import { conversationsService } from './conversations.service';
import type { CreateMessageBody, EnsureConversationBody } from './conversations.validation';

function viewerFromReq(req: { user?: { id: string; role: import('../auth').Role } }) {
  return {
    id: req.user!.id,
    role: req.user!.role
  };
}

export const conversationsController = {
  listMine: (async (req, res, next) => {
    try {
      const data = await conversationsService.listMine(viewerFromReq(req));
      res.status(200).json(successResponse(data, 'Conversations retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  ensure: (async (req, res, next) => {
    try {
      const input = toEnsureConversationServiceInput(req.body as EnsureConversationBody);
      const data = await conversationsService.ensure(viewerFromReq(req), input);
      res.status(200).json(successResponse(data, 'Conversation ready'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  getById: (async (req, res, next) => {
    try {
      const data = await conversationsService.getById(
        viewerFromReq(req),
        req.params.id as string
      );
      res.status(200).json(successResponse(data, 'Conversation retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  listMessages: (async (req, res, next) => {
    try {
      const query = req.query as { limit?: number; before?: string };
      const data = await conversationsService.listMessages(
        viewerFromReq(req),
        req.params.id as string,
        query
      );
      res.status(200).json(successResponse(data, 'Messages retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  sendMessage: (async (req, res, next) => {
    try {
      const input = toCreateMessageServiceInput(req.body as CreateMessageBody);
      const data = await conversationsService.sendMessage(
        viewerFromReq(req),
        req.params.id as string,
        input
      );
      res.status(201).json(successResponse(data, 'Message sent'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  markRead: (async (req, res, next) => {
    try {
      const data = await conversationsService.markRead(
        viewerFromReq(req),
        req.params.id as string
      );
      res.status(200).json(successResponse(data, 'Messages marked read'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
};

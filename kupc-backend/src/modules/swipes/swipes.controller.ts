import { RequestHandler } from 'express';
import { successResponse } from '../../utils/apiResponse';
import { toCreateSwipeServiceInput } from './swipes.mapper';
import { swipesService } from './swipes.service';
import type { CreateSwipeBody } from './swipes.validation';

export const swipesController = {
  create: (async (req, res, next) => {
    try {
      const input = toCreateSwipeServiceInput(req.body as CreateSwipeBody);
      const data = await swipesService.create(req.user!.id, input);
      res.status(201).json(successResponse(data, 'Swipe recorded'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  undo: (async (req, res, next) => {
    try {
      const data = await swipesService.undo(req.user!.id, req.params.jobId as string);
      res.status(200).json(successResponse(data, 'Swipe undone'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  listMine: (async (req, res, next) => {
    try {
      const data = await swipesService.listMine(req.user!.id);
      res.status(200).json(successResponse(data, 'Swipes retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  listInbound: (async (req, res, next) => {
    try {
      const data = await swipesService.listInbound(req.user!.id);
      res.status(200).json(successResponse(data, 'Inbound swipes retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
};

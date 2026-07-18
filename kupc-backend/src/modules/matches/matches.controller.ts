import { RequestHandler } from 'express';
import { successResponse } from '../../utils/apiResponse';
import { toCreateMatchServiceInput } from './matches.mapper';
import { matchesService } from './matches.service';
import type { CreateMatchBody } from './matches.validation';

export const matchesController = {
  create: (async (req, res, next) => {
    try {
      const input = toCreateMatchServiceInput(req.body as CreateMatchBody);
      const data = await matchesService.create(req.user!.id, input);
      res.status(201).json(successResponse(data, 'Match created'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  listMine: (async (req, res, next) => {
    try {
      const data = await matchesService.listMine({
        id: req.user!.id,
        role: req.user!.role
      });
      res.status(200).json(successResponse(data, 'Matches retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
};

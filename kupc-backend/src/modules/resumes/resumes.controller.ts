import { RequestHandler } from 'express';
import { successResponse } from '../../utils/apiResponse';
import { resumesService } from './resumes.service';

export const resumesController = {
  upload: (async (req, res, next) => {
    try {
      const data = await resumesService.upload(req.user!.id);
      res.status(202).json(successResponse(data, 'Resume upload accepted'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  list: (async (req, res, next) => {
    try {
      const data = await resumesService.list(req.user!.id);
      res.status(200).json(successResponse(data, 'Resumes retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  getById: (async (req, res, next) => {
    try {
      const data = await resumesService.getById(req.user!.id, req.params.id as string);
      res.status(200).json(successResponse(data, 'Resume retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  getAnalysis: (async (req, res, next) => {
    try {
      const data = await resumesService.getAnalysis(req.user!.id, req.params.id as string);
      res.status(200).json(successResponse(data, 'Analysis retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  remove: (async (req, res, next) => {
    try {
      await resumesService.delete(req.user!.id, req.params.id as string);
      res.status(200).json(successResponse({ deleted: true }, 'Resume deleted'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
};

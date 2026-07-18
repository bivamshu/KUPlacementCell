import { RequestHandler } from 'express';
import { successResponse } from '../../utils/apiResponse';
import { toCreateJobServiceInput, toUpdateJobServiceInput } from './jobs.mapper';
import { jobsService } from './jobs.service';
import type { JobListQuery } from './jobs.types';
import type { CreateJobBody, UpdateJobBody } from './jobs.validation';

export const jobsController = {
  create: (async (req, res, next) => {
    try {
      const input = toCreateJobServiceInput(req.body as CreateJobBody);
      const data = await jobsService.create(req.user!.id, input);
      res.status(201).json(successResponse(data, 'Job created'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  listMine: (async (req, res, next) => {
    try {
      const data = await jobsService.listMine(req.user!.id);
      res.status(200).json(successResponse(data, 'Company jobs retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  getMine: (async (req, res, next) => {
    try {
      const data = await jobsService.getMine(req.user!.id, req.params.id as string);
      res.status(200).json(successResponse(data, 'Job retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  updateMine: (async (req, res, next) => {
    try {
      const input = toUpdateJobServiceInput(req.body as UpdateJobBody);
      const data = await jobsService.updateMine(req.user!.id, req.params.id as string, input);
      res.status(200).json(successResponse(data, 'Job updated'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  publish: (async (req, res, next) => {
    try {
      const data = await jobsService.publish(req.user!.id, req.params.id as string);
      res.status(200).json(successResponse(data, 'Job published'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  close: (async (req, res, next) => {
    try {
      const data = await jobsService.close(req.user!.id, req.params.id as string);
      res.status(200).json(successResponse(data, 'Job closed'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  deleteMine: (async (req, res, next) => {
    try {
      await jobsService.deleteMine(req.user!.id, req.params.id as string);
      res.status(200).json(successResponse({ deleted: true }, 'Job deleted'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  listFeed: (async (req, res, next) => {
    try {
      const data = await jobsService.listFeed(
        { id: req.user!.id, role: req.user!.role },
        req.query as unknown as JobListQuery
      );
      res.status(200).json(successResponse(data, 'Open jobs retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  getPublic: (async (req, res, next) => {
    try {
      const data = await jobsService.getPublic(req.params.id as string, {
        id: req.user!.id,
        role: req.user!.role
      });
      res.status(200).json(successResponse(data, 'Job retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  save: (async (req, res, next) => {
    try {
      const data = await jobsService.save(req.user!.id, req.params.id as string);
      res.status(200).json(successResponse(data, 'Job saved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  unsave: (async (req, res, next) => {
    try {
      const data = await jobsService.unsave(req.user!.id, req.params.id as string);
      res.status(200).json(successResponse(data, 'Job unsaved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  listSaved: (async (req, res, next) => {
    try {
      const data = await jobsService.listSaved(req.user!.id);
      res.status(200).json(successResponse(data, 'Saved jobs retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
};

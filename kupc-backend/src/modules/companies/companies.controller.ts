import { RequestHandler } from 'express';
import { successResponse } from '../../utils/apiResponse';
import { toUpdateCompanyProfileInput } from './companies.mapper';
import { companiesService } from './companies.service';
import type { UpdateCompanyProfileBody } from './companies.validation';

export const companiesController = {
  getMe: (async (req, res, next) => {
    try {
      const data = await companiesService.getMe(req.user!.id);
      res.status(200).json(successResponse(data, 'Company profile retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  updateMe: (async (req, res, next) => {
    try {
      const input = toUpdateCompanyProfileInput(req.body as UpdateCompanyProfileBody);
      const data = await companiesService.updateMe(req.user!.id, input);
      res.status(200).json(successResponse(data, 'Company profile updated'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  uploadLogo: (async (req, res, next) => {
    try {
      const data = await companiesService.uploadLogo(req.user!.id, req.file);
      res.status(200).json(successResponse(data, 'Logo updated'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  getPublicById: (async (req, res, next) => {
    try {
      const data = await companiesService.getPublicById(req.params.id as string);
      res.status(200).json(successResponse(data, 'Company profile retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
};

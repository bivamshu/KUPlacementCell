import { RequestHandler } from 'express';
import { successResponse } from '../../utils/apiResponse';
import { toUpdateStudentProfileInput } from './students.mapper';
import { studentsService } from './students.service';
import type { UpdateStudentProfileBody } from './students.validation';

export const studentsController = {
  getMe: (async (req, res, next) => {
    try {
      const data = await studentsService.getMe(req.user!.id);
      res.status(200).json(successResponse(data, 'Student profile retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  updateMe: (async (req, res, next) => {
    try {
      const input = toUpdateStudentProfileInput(req.body as UpdateStudentProfileBody);
      const data = await studentsService.updateMe(req.user!.id, input);
      res.status(200).json(successResponse(data, 'Student profile updated'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  uploadAvatar: (async (req, res, next) => {
    try {
      const data = await studentsService.uploadAvatar(req.user!.id, req.file);
      res.status(200).json(successResponse(data, 'Avatar updated'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,

  getPublicById: (async (req, res, next) => {
    try {
      const data = await studentsService.getPublicById(req.params.id as string);
      res.status(200).json(successResponse(data, 'Student profile retrieved'));
    } catch (error) {
      next(error);
    }
  }) as RequestHandler
};

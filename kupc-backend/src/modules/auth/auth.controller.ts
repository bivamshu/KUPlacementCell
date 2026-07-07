import { RequestHandler } from 'express';
import { successResponse } from '../../utils/apiResponse';
import { authService } from './auth.service';

export const authController = {
  registerStudent: (async (req, res, next) => {
    try {
      const result = await authService.registerStudent(req.body);
      res.status(200).json(successResponse(result, 'Student OTP sent'));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  verifyOtp: (async (req, res, next) => {
    try {
      const result = await authService.verifyStudentOtp(req.body, {
        ipAddress: req.ip,
        deviceInfo: req.get('user-agent')
      });

      res.status(200).json(successResponse(result, 'Student verified'));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler
};

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
  }) satisfies RequestHandler,

  registerCompany: (async (req, res, next) => {
    try {
      const result = await authService.registerCompany(req.body);
      res.status(200).json(successResponse(result, 'Company registration submitted'));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  createCompanyVerificationDocument: (async (req, res, next) => {
    try {
      const result = await authService.createCompanyVerificationDocument(req.user!.id, req.body);
      res.status(200).json(successResponse(result, 'Company verification document submitted'));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  login: (async (req, res, next) => {
    try {
      const result = await authService.login(req.body, {
        ipAddress: req.ip,
        deviceInfo: req.get('user-agent')
      });

      res.status(200).json(successResponse(result, 'Login successful'));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  adminLogin: (async (req, res, next) => {
    try {
      const result = await authService.adminLogin(req.body, {
        ipAddress: req.ip,
        deviceInfo: req.get('user-agent')
      });

      res.status(200).json(successResponse(result, 'Admin login successful'));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler
};

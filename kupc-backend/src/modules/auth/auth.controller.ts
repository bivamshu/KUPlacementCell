import { RequestHandler } from 'express';
import { successResponse } from '../../utils/apiResponse';
import { AppError, UnauthorizedError } from '../../utils/AppError';
import { authService } from './auth.service';
import { AUTH_ERROR_CODES } from './auth.constants';

export const authController = {
  me: (async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Missing token', 401, AUTH_ERROR_CODES.MISSING_TOKEN);
      }

      const result = await authService.getMe(req.user);
      res.status(200).json(successResponse(result, 'Authenticated user'));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

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
  }) satisfies RequestHandler,

  refreshTokens: (async (req, res, next) => {
    try {
      // 1. Extract the token from the request payload body
      const providedRefreshToken = req.body.refresh_token;

      // 2. Delegate the rotation tracking algorithm to the service context
      const result = await authService.refreshTokens(providedRefreshToken, {
        ipAddress: req.ip,
        deviceInfo: req.get('user-agent'),
      });

      // 3. Dispatch the brand new rotated keypairs back down the transport channel
      res.status(200).json(successResponse(result, 'Tokens refreshed successfully'));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  logout: (async (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token');
      }

      const result = await authService.logout(req.user, req.body);
      res.status(200).json(successResponse(result, 'Logout successful'));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  logoutAll: (async (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError(AUTH_ERROR_CODES.MISSING_TOKEN, 'Missing token');
      }

      const result = await authService.logoutAll(req.user);
      res.status(200).json(successResponse(result, 'Logged out of all devices'));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler
};

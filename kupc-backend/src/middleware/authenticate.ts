import { RequestHandler } from 'express';
import { AppError } from '../utils/AppError';

export const authenticate: RequestHandler = (req, res, next) => {
  next(new AppError('Authentication middleware is not implemented yet', 501));
};

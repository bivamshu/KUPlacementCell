import { ErrorRequestHandler } from 'express';
import { config } from '../config/config';
import { AppError } from '../utils/AppError';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const isKnownError = err instanceof AppError;
  const statusCode = isKnownError ? err.statusCode : 500;
  const message = isKnownError ? err.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    data: null,
    message,
    error: {
      statusCode,
      isOperational: isKnownError ? err.isOperational : false,
      stack: config.env === 'development' ? err.stack : undefined
    }
  });
};

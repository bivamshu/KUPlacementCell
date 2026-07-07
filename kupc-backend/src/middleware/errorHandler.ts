import { ErrorRequestHandler } from 'express';
import { config } from '../config/config';
import { AppError } from '../utils/AppError';
import { errorResponse } from '../utils/apiResponse';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const isKnownError = err instanceof AppError;
  const statusCode = isKnownError ? err.statusCode : 500;
  const message = isKnownError ? err.message : 'Internal server error';

  res.status(statusCode).json(
    errorResponse(message, {
      code: isKnownError ? err.code : 'INTERNAL_SERVER_ERROR',
      statusCode,
      isOperational: isKnownError ? err.isOperational : false,
      stack: config.env === 'development' ? err.stack : undefined
    })
  );
};

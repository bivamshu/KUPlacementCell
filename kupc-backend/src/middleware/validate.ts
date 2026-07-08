import { RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import { AUTH_ERROR_CODES } from '../modules/auth';
import { AppError } from '../utils/AppError';

type RequestSchemaOutput = {
  body?: unknown;
  query?: unknown;
  params?: unknown;
};

export const validate = (schema: ZodSchema<RequestSchemaOutput>): RequestHandler => {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!result.success) {
      const hasKuEmailDomainError = result.error.issues.some((issue) => issue.message === 'Email must use the KU institutional domain');
      const code = hasKuEmailDomainError ? AUTH_ERROR_CODES.INVALID_EMAIL_DOMAIN : 'VALIDATION_ERROR';

      next(new AppError('Request validation failed', 400, code));
      return;
    }

    if (result.data.body !== undefined) {
      req.body = result.data.body;
    }

    // Express 5 exposes some request properties via accessors; mutate objects instead of reassigning.
    if (result.data.query !== undefined && typeof req.query === 'object' && req.query !== null) {
      Object.assign(req.query as any, result.data.query);
    }

    if (result.data.params !== undefined && typeof req.params === 'object' && req.params !== null) {
      Object.assign(req.params as any, result.data.params);
    }

    next();
  };
};

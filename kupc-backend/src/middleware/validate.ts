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

    req.body = result.data.body ?? req.body;
    req.query = (result.data.query ?? req.query) as typeof req.query;
    req.params = (result.data.params ?? req.params) as typeof req.params;

    next();
  };
};

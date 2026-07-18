import { RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import { AUTH_ERROR_CODES } from '../modules/auth';
import { ValidationError } from '../utils/AppError';

type RequestSchemaOutput = {
  body?: unknown;
  query?: unknown;
  params?: unknown;
};

/**
 * Express 5 rebuilds `req.query` / `req.params` from the URL on every access.
 * Mutating the object from a prior read (Object.assign) is discarded — replace
 * the property so coerced defaults (e.g. feed limit/offset) survive.
 */
function replaceRequestProperty(req: object, key: 'query' | 'params', value: unknown): void {
  Object.defineProperty(req, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}

export const validate = (schema: ZodSchema<RequestSchemaOutput>): RequestHandler => {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!result.success) {
      const hasKuEmailDomainError = result.error.issues.some(
        (issue) => issue.message === 'Email must use the KU institutional domain'
      );
      const code = hasKuEmailDomainError ? AUTH_ERROR_CODES.INVALID_EMAIL_DOMAIN : 'VALIDATION_ERROR';

      next(new ValidationError(code, 'Request validation failed'));
      return;
    }

    if (result.data.body !== undefined) {
      req.body = result.data.body;
    }

    if (result.data.query !== undefined) {
      replaceRequestProperty(req, 'query', result.data.query);
    }

    if (result.data.params !== undefined) {
      replaceRequestProperty(req, 'params', result.data.params);
    }

    next();
  };
};

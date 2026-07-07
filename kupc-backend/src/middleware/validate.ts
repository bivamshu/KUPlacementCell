import { RequestHandler } from 'express';
import { ZodSchema } from 'zod';
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
      next(new AppError('Request validation failed', 400));
      return;
    }

    req.body = result.data.body ?? req.body;
    req.query = (result.data.query ?? req.query) as typeof req.query;
    req.params = (result.data.params ?? req.params) as typeof req.params;

    next();
  };
};

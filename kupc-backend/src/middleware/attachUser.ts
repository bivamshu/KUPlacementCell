import { RequestHandler } from 'express';

export const attachUser: RequestHandler = (req, res, next) => {
  next();
};

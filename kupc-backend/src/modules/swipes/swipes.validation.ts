import { z } from 'zod';
import { SWIPE_DIRECTIONS } from './swipes.constants';

const directionSchema = z.enum(SWIPE_DIRECTIONS);

export const createSwipeSchema = z.object({
  body: z
    .object({
      job_id: z.string().uuid(),
      direction: directionSchema
    })
    .strip(),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const swipeJobIdParamsSchema = z.object({
  params: z
    .object({
      jobId: z.string().uuid()
    })
    .strip(),
  body: z.object({}).optional(),
  query: z.object({}).optional()
});

export type CreateSwipeBody = {
  job_id: string;
  direction: (typeof SWIPE_DIRECTIONS)[number];
};

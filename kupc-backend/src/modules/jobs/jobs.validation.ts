import { z } from 'zod';
import { JOB_FEED_DEFAULT_LIMIT, JOB_FEED_MAX_LIMIT, JOB_TYPES } from './jobs.constants';

const jobTypeSchema = z.enum(JOB_TYPES);

const optionalNullableString = (max: number) =>
  z
    .union([z.string().trim().min(1).max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === '' || value === null) return null;
      return value;
    });

const optionalNullableJobType = z
  .union([jobTypeSchema, z.literal(''), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === '' || value === null) return null;
    return value;
  });

const optionalNullableCgpa = z
  .union([z.number(), z.null()])
  .optional()
  .refine((value) => value === undefined || value === null || (value >= 0 && value <= 4), {
    message: 'min_cgpa must be between 0 and 4'
  });

export const jobIdParamsSchema = z.object({
  params: z
    .object({
      id: z.string().uuid()
    })
    .strip(),
  body: z.object({}).optional(),
  query: z.object({}).optional()
});

/**
 * POST /jobs body — snake_case HTTP fields.
 * Status is never client-settable on create (service defaults to draft).
 */
export const createJobSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(2).max(120),
      description: z.string().trim().min(20).max(10_000),
      location: optionalNullableString(200),
      job_type: optionalNullableJobType,
      min_cgpa: optionalNullableCgpa
    })
    .strip(),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

/**
 * PATCH /jobs/me/:id body — status only via publish/close endpoints.
 */
export const updateJobSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(2).max(120).optional(),
      description: z.string().trim().min(20).max(10_000).optional(),
      location: optionalNullableString(200),
      job_type: optionalNullableJobType,
      min_cgpa: optionalNullableCgpa
    })
    .strip()
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one job field is required'
    }),
  query: z.object({}).optional(),
  params: z
    .object({
      id: z.string().uuid()
    })
    .strip()
});

export const feedQuerySchema = z.object({
  query: z
    .object({
      q: z.string().trim().min(1).max(200).optional(),
      job_type: jobTypeSchema.optional(),
      location: z.string().trim().min(1).max(200).optional(),
      min_cgpa: z.coerce.number().min(0).max(4).optional(),
      limit: z.coerce.number().int().min(1).max(JOB_FEED_MAX_LIMIT).optional(),
      offset: z.coerce.number().int().min(0).optional()
    })
    .strip()
    .transform((query) => ({
      ...query,
      limit: query.limit ?? JOB_FEED_DEFAULT_LIMIT,
      offset: query.offset ?? 0
    })),
  body: z.object({}).optional(),
  params: z.object({}).optional()
});

export type CreateJobBody = {
  title: string;
  description: string;
  location?: string | null;
  job_type?: (typeof JOB_TYPES)[number] | null;
  min_cgpa?: number | null;
};

export type UpdateJobBody = {
  title?: string;
  description?: string;
  location?: string | null;
  job_type?: (typeof JOB_TYPES)[number] | null;
  min_cgpa?: number | null;
};

import { z } from 'zod';

export const resumeIdParamsSchema = z.object({
  params: z
    .object({
      id: z.string().uuid()
    })
    .strip()
});

/** Multipart body is empty for now; file validation lands in Milestone 3 */
export const uploadResumeSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});
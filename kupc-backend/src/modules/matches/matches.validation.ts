import { z } from 'zod';

export const createMatchSchema = z.object({
  body: z
    .object({
      job_id: z.string().uuid(),
      student_id: z.string().uuid()
    })
    .strip(),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export type CreateMatchBody = {
  job_id: string;
  student_id: string;
};

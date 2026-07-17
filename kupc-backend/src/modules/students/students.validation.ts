import { z } from 'zod';

const optionalNullableString = (max: number) =>
  z
    .union([z.string().trim().min(1).max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === '' || value === null) return null;
      return value;
    });

export const studentIdParamsSchema = z.object({
  params: z
    .object({
      id: z.string().uuid()
    })
    .strip()
});

/**
 * PATCH /students/me body — snake_case HTTP fields (auth/resumes convention).
 * Empty string clears nullable text fields. cgpa must be 0–4 when provided.
 */
export const updateStudentProfileSchema = z.object({
  body: z
    .object({
      full_name: z.string().trim().min(2).max(100).optional(),
      phone: optionalNullableString(30),
      degree: optionalNullableString(100),
      bio: optionalNullableString(2000),
      department: optionalNullableString(100),
      cgpa: z
        .union([z.number(), z.null()])
        .optional()
        .refine((value) => value === undefined || value === null || (value >= 0 && value <= 4), {
          message: 'cgpa must be between 0 and 4'
        }),
      graduation_year: z
        .union([z.number().int().min(2000).max(2100), z.null()])
        .optional()
    })
    .strip()
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one profile field is required'
    }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

/** Partial PATCH body after Zod transforms (snake_case HTTP fields). */
export type UpdateStudentProfileBody = {
  full_name?: string;
  phone?: string | null;
  degree?: string | null;
  bio?: string | null;
  department?: string | null;
  cgpa?: number | null;
  graduation_year?: number | null;
};
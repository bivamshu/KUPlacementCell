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

const optionalNullableUrl = z
  .union([z.string().url().max(500), z.literal(''), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === '' || value === null) return null;
    return value;
  });

export const companyIdParamsSchema = z.object({
  params: z
    .object({
      id: z.string().uuid()
    })
    .strip()
});

/**
 * PATCH /companies/me body — snake_case HTTP fields.
 * verification_status / verified_at / logo_url are stripped: verification is
 * admin-only (Phase 2 RPC) and logo lands via the B3 upload endpoint.
 */
export const updateCompanyProfileSchema = z.object({
  body: z
    .object({
      company_name: z.string().trim().min(2).max(150).optional(),
      website: optionalNullableUrl,
      industry: optionalNullableString(100),
      description: optionalNullableString(2000)
    })
    .strip()
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one profile field is required'
    }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
});

/** Partial PATCH body after Zod transforms (snake_case HTTP fields). */
export type UpdateCompanyProfileBody = {
  company_name?: string;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
};

export type CompanyVerificationStatus = 'pending' | 'approved' | 'rejected';

/** Own-profile response (GET/PATCH /companies/me) — includes verification state. */
export type CompanyProfileDto = {
  id: string;
  company_name: string;
  website: string | null;
  industry: string | null;
  description: string | null;
  logo_url: string | null;
  verification_status: CompanyVerificationStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Public card (GET /companies/:id) — approved companies only; no verification internals. */
export type CompanyPublicCardDto = {
  id: string;
  company_name: string;
  website: string | null;
  industry: string | null;
  description: string | null;
  logo_url: string | null;
  created_at: string;
};

/** Service/repository update shape (camelCase). verification_status is never settable here. */
export type UpdateCompanyProfileInput = {
  companyName?: string;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
};

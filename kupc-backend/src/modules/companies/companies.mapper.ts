import type { CompanyRecord } from '../../database/companies.repository';
import type {
  CompanyProfileDto,
  CompanyPublicCardDto,
  UpdateCompanyProfileInput
} from './companies.types';
import type { UpdateCompanyProfileBody } from './companies.validation';

export function toCompanyProfileDto(company: CompanyRecord): CompanyProfileDto {
  return {
    id: company.id,
    company_name: company.company_name,
    website: company.website,
    industry: company.industry,
    description: company.description,
    logo_url: company.logo_url,
    verification_status: company.verification_status,
    verified_at: company.verified_at,
    created_at: company.created_at,
    updated_at: company.updated_at
  };
}

export function toCompanyPublicCardDto(company: CompanyRecord): CompanyPublicCardDto {
  return {
    id: company.id,
    company_name: company.company_name,
    website: company.website,
    industry: company.industry,
    description: company.description,
    logo_url: company.logo_url,
    created_at: company.created_at
  };
}

/** Map validated snake_case PATCH body → camelCase service input. */
export function toUpdateCompanyProfileInput(body: UpdateCompanyProfileBody): UpdateCompanyProfileInput {
  const input: UpdateCompanyProfileInput = {};

  if (body.company_name !== undefined) input.companyName = body.company_name;
  if (body.website !== undefined) input.website = body.website;
  if (body.industry !== undefined) input.industry = body.industry;
  if (body.description !== undefined) input.description = body.description;

  return input;
}

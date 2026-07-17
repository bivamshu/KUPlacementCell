import { AppError } from '../../utils/AppError';
import { COMPANY_ERROR_CODES } from './companies.constants';

export function companyNotFoundError(message = 'Company not found'): AppError {
  return new AppError(message, 404, COMPANY_ERROR_CODES.COMPANY_NOT_FOUND);
}

export function companyProfileForbiddenError(message = 'Company profile access forbidden'): AppError {
  return new AppError(message, 403, COMPANY_ERROR_CODES.COMPANY_PROFILE_FORBIDDEN);
}

export function invalidCompanyPayloadError(message = 'Invalid company profile payload'): AppError {
  return new AppError(message, 400, COMPANY_ERROR_CODES.INVALID_PROFILE_PAYLOAD);
}

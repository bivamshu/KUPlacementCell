import { apiRequest } from './client';
import type { CompanyProfile, CompanyPublicCard, UpdateCompanyProfileBody } from './types';

export const companiesApi = {
  getMe() {
    return apiRequest<CompanyProfile>('/companies/me', { method: 'GET' });
  },

  updateMe(body: UpdateCompanyProfileBody) {
    return apiRequest<CompanyProfile>('/companies/me', {
      method: 'PATCH',
      body,
    });
  },

  uploadLogo(file: File) {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<CompanyProfile>('/companies/me/logo', {
      method: 'POST',
      body: form,
    });
  },

  getPublicById(id: string) {
    return apiRequest<CompanyPublicCard>(`/companies/${id}`, { method: 'GET' });
  },
};

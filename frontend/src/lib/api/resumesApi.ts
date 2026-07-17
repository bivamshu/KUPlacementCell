import { apiRequest } from './client';
import type { ResumeAnalysis, ResumeListItem, UploadResumeResponse } from './types';

export const resumesApi = {
  upload(file: File) {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<UploadResumeResponse>('/resumes', {
      method: 'POST',
      body: form,
    });
  },

  list() {
    return apiRequest<ResumeListItem[]>('/resumes', { method: 'GET' });
  },

  getById(id: string) {
    return apiRequest<ResumeListItem>(`/resumes/${id}`, { method: 'GET' });
  },

  getAnalysis(id: string) {
    return apiRequest<ResumeAnalysis>(`/resumes/${id}/analysis`, { method: 'GET' });
  },

  remove(id: string) {
    return apiRequest<{ deleted: true }>(`/resumes/${id}`, { method: 'DELETE' });
  },
};

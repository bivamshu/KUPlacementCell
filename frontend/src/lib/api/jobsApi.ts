import { apiRequest } from './client';
import type {
  CreateJobBody,
  JobDto,
  JobFeedCard,
  JobFeedQuery,
  SavedToggleResult,
  UpdateJobBody,
} from './types';

function toQuery(params?: JobFeedQuery): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.job_type) search.set('job_type', params.job_type);
  if (params.location) search.set('location', params.location);
  if (params.min_cgpa !== undefined) search.set('min_cgpa', String(params.min_cgpa));
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const jobsApi = {
  // ── Company manage (B2) ──────────────────────────────────────────────
  create(body: CreateJobBody) {
    return apiRequest<JobDto>('/jobs', { method: 'POST', body });
  },

  listMine() {
    return apiRequest<JobDto[]>('/jobs/me', { method: 'GET' });
  },

  getMine(id: string) {
    return apiRequest<JobDto>(`/jobs/me/${id}`, { method: 'GET' });
  },

  updateMine(id: string, body: UpdateJobBody) {
    return apiRequest<JobDto>(`/jobs/me/${id}`, { method: 'PATCH', body });
  },

  publish(id: string) {
    return apiRequest<JobDto>(`/jobs/me/${id}/publish`, { method: 'POST' });
  },

  close(id: string) {
    return apiRequest<JobDto>(`/jobs/me/${id}/close`, { method: 'POST' });
  },

  remove(id: string) {
    return apiRequest<{ deleted: true }>(`/jobs/me/${id}`, { method: 'DELETE' });
  },

  // ── Discovery (B3) ───────────────────────────────────────────────────
  listFeed(query?: JobFeedQuery) {
    return apiRequest<JobFeedCard[]>(`/jobs${toQuery(query)}`, { method: 'GET' });
  },

  getById(id: string) {
    return apiRequest<JobFeedCard>(`/jobs/${id}`, { method: 'GET' });
  },

  // ── Saved jobs (B4) ──────────────────────────────────────────────────
  save(id: string) {
    return apiRequest<SavedToggleResult>(`/jobs/${id}/save`, { method: 'POST' });
  },

  unsave(id: string) {
    return apiRequest<SavedToggleResult>(`/jobs/${id}/save`, { method: 'DELETE' });
  },

  listSaved() {
    return apiRequest<JobFeedCard[]>('/jobs/saved', { method: 'GET' });
  },
};

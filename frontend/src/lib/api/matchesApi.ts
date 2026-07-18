import { apiRequest } from './client';
import type { CreateMatchBody, MatchDto } from './types';

export const matchesApi = {
  create(body: CreateMatchBody) {
    return apiRequest<MatchDto>('/matches', { method: 'POST', body });
  },

  listMine() {
    return apiRequest<MatchDto[]>('/matches/me', { method: 'GET' });
  },
};

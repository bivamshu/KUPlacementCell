import { apiRequest } from './client';
import type {
  CreateSwipeBody,
  InboundSwipeDto,
  SwipeDto,
  SwipeUndoResult,
} from './types';

export const swipesApi = {
  create(body: CreateSwipeBody) {
    return apiRequest<SwipeDto>('/swipes', { method: 'POST', body });
  },

  /** Optional history — backend may still return 501 NOT_IMPLEMENTED. */
  listMine() {
    return apiRequest<SwipeDto[]>('/swipes/me', { method: 'GET' });
  },

  undo(jobId: string) {
    return apiRequest<SwipeUndoResult>(`/swipes/${jobId}`, { method: 'DELETE' });
  },

  listInbound() {
    return apiRequest<InboundSwipeDto[]>('/swipes/inbound', { method: 'GET' });
  },
};

import { swipeNotImplementedError } from './swipes.errors';
import type { CreateSwipeServiceInput, InboundSwipeDto, SwipeDto } from './swipes.types';

/**
 * Phase 7 B1 — contracts only. B2 records swipes; B3 undo; B4 inbound list.
 */
export const swipesService = {
  async create(_studentId: string, _input: CreateSwipeServiceInput): Promise<SwipeDto> {
    throw swipeNotImplementedError();
  },

  async undo(_studentId: string, _jobId: string): Promise<{ deleted: true }> {
    throw swipeNotImplementedError();
  },

  async listMine(_studentId: string): Promise<SwipeDto[]> {
    throw swipeNotImplementedError();
  },

  async listInbound(_companyUserId: string): Promise<InboundSwipeDto[]> {
    throw swipeNotImplementedError();
  }
};

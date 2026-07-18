import { Role } from '../auth';
import { matchNotImplementedError } from './matches.errors';
import type { CreateMatchServiceInput, MatchDto } from './matches.types';

export type MatchViewer = {
  id: string;
  role: Role;
};

/**
 * Phase 7 B1 — contracts only. B4 creates matches; B5 lists them.
 */
export const matchesService = {
  async create(_companyUserId: string, _input: CreateMatchServiceInput): Promise<MatchDto> {
    throw matchNotImplementedError();
  },

  async listMine(_viewer: MatchViewer): Promise<MatchDto[]> {
    throw matchNotImplementedError();
  }
};

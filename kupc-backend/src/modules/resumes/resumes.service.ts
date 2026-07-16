import { AppError } from '../../utils/AppError';
import { RESUME_ERROR_CODES } from './resumes.constants';
import type { AnalysisResponse, ResumeListItem, UploadResumeResponse } from './resumes.types';

export const resumesService = {
  async upload(_studentId: string): Promise<UploadResumeResponse> {
    throw new AppError('Resume upload not implemented yet', 501, 'NOT_IMPLEMENTED');
  },

  async list(_studentId: string): Promise<ResumeListItem[]> {
    throw new AppError('Resume list not implemented yet', 501, 'NOT_IMPLEMENTED');
  },

  async getById(_studentId: string, _resumeId: string): Promise<ResumeListItem> {
    throw new AppError('Resume get not implemented yet', 501, RESUME_ERROR_CODES.RESUME_NOT_FOUND);
  },

  async getAnalysis(_studentId: string, _resumeId: string): Promise<AnalysisResponse> {
    throw new AppError('Analysis get not implemented yet', 501, RESUME_ERROR_CODES.ANALYSIS_NOT_FOUND);
  },

  async delete(_studentId: string, _resumeId: string): Promise<void> {
    throw new AppError('Resume delete not implemented yet', 501, 'NOT_IMPLEMENTED');
  }
};

import { randomUUID } from 'crypto';
import type { Express } from 'express';
import { buildResumeObjectPath, resumeStorage } from '../../config/resumeStorage';
import { resumesRepository } from '../../database/resumes.repository';
import { enqueueResumeAnalysis } from '../../queues/resumeAnalysis.queue';
import { AppError } from '../../utils/AppError';
import { AnalysisStatus, RESUME_ERROR_CODES } from './resumes.constants';
import type { AnalysisResponse, ResumeListItem, UploadResumeResponse } from './resumes.types';
import { assertValidPdfBuffer, sanitizeResumeFileName } from './resumes.upload.utils';

export const resumesService = {
  async upload(studentId: string, file?: Express.Multer.File): Promise<UploadResumeResponse> {
    if (!file) {
      throw new AppError('Resume file is required', 400, 'VALIDATION_ERROR');
    }

    assertValidPdfBuffer(file.buffer);

    const resumeId = randomUUID();
    const fileName = sanitizeResumeFileName(file.originalname);
    const objectPath = buildResumeObjectPath(studentId, resumeId, fileName);

    try {
      await resumeStorage.uploadPdf(objectPath, file.buffer);
    } catch {
      throw new AppError('Failed to store resume file', 500, 'STORAGE_UPLOAD_FAILED');
    }

    try {
      const resume = await resumesRepository.create({
        id: resumeId,
        studentId,
        fileUrl: objectPath,
        fileName
      });

      const analysis = await resumesRepository.createAnalysis({
        resumeId: resume.id,
        status: AnalysisStatus.PENDING
      });

      await enqueueResumeAnalysis({
        resumeId: resume.id,
        analysisId: analysis.id,
        studentId
      });

      return {
        resumeId: resume.id,
        analysisId: analysis.id,
        status: 'pending'
      };
    } catch (error) {
      await resumeStorage.deleteObject(objectPath).catch(() => undefined);
      throw error;
    }
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

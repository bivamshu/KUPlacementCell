import { randomUUID } from 'crypto';
import type { Express } from 'express';
import { buildResumeObjectPath, resumeStorage } from '../../config/resumeStorage';
import type { ResumeRecord } from '../../database/resumes.repository';
import { resumesRepository } from '../../database/resumes.repository';
import { studentsRepository } from '../../database/students.repository';
import { enqueueResumeAnalysis } from '../../queues/resumeAnalysis.queue';
import { AppError } from '../../utils/AppError';
import { AnalysisStatus, RESUME_ERROR_CODES } from './resumes.constants';
import { toAnalysisResponse, toResumeListItem } from './resumes.mapper';
import type { AnalysisResponse, ResumeListItem, UploadResumeResponse } from './resumes.types';
import { assertValidPdfBuffer, sanitizeResumeFileName } from './resumes.upload.utils';

async function requireOwnedResume(studentId: string, resumeId: string): Promise<ResumeRecord> {
  const resume = await resumesRepository.findById(resumeId);

  if (!resume || resume.student_id !== studentId) {
    throw new AppError('Resume not found', 404, RESUME_ERROR_CODES.RESUME_NOT_FOUND);
  }

  return resume;
}

async function getActiveResumeId(studentId: string): Promise<string | null> {
  const student = await studentsRepository.findById(studentId);
  return student?.resume_id ?? null;
}

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

  async list(studentId: string): Promise<ResumeListItem[]> {
    const [resumes, activeResumeId] = await Promise.all([
      resumesRepository.listByStudent(studentId),
      getActiveResumeId(studentId)
    ]);

    return resumes.map((resume) => toResumeListItem(resume, activeResumeId));
  },

  async getById(studentId: string, resumeId: string): Promise<ResumeListItem> {
    const resume = await requireOwnedResume(studentId, resumeId);
    const activeResumeId = await getActiveResumeId(studentId);
    return toResumeListItem(resume, activeResumeId);
  },

  async getAnalysis(studentId: string, resumeId: string): Promise<AnalysisResponse> {
    await requireOwnedResume(studentId, resumeId);

    const analysis = await resumesRepository.findAnalysisByResumeId(resumeId);

    if (!analysis) {
      throw new AppError('Analysis not found', 404, RESUME_ERROR_CODES.ANALYSIS_NOT_FOUND);
    }

    return toAnalysisResponse(analysis);
  },

  async delete(studentId: string, resumeId: string): Promise<void> {
    const resume = await requireOwnedResume(studentId, resumeId);

    try {
      await resumeStorage.deleteObject(resume.file_url);
    } catch {
      throw new AppError('Failed to delete resume file', 500, 'STORAGE_DELETE_FAILED');
    }

    await resumesRepository.deleteById(resumeId);
  }
};

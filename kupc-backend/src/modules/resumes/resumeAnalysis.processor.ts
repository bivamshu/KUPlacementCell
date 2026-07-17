import { UnrecoverableError } from 'bullmq';
import { resumesRepository } from '../../database/resumes.repository';
import { AnalysisStatus } from './resumes.constants';
import type { ResumeAnalysisJobPayload } from '../../queues/resumeAnalysis.types';

export async function processResumeAnalysisJob(payload: ResumeAnalysisJobPayload): Promise<void> {
  const analysis = await resumesRepository.findAnalysisById(payload.analysisId);

  if (!analysis) {
    throw new UnrecoverableError(`Analysis ${payload.analysisId} not found`);
  }

  if (analysis.status === AnalysisStatus.COMPLETED) {
    return;
  }

  const resume = await resumesRepository.findById(payload.resumeId);

  if (!resume) {
    throw new UnrecoverableError(`Resume ${payload.resumeId} not found`);
  }

  if (resume.student_id !== payload.studentId) {
    throw new UnrecoverableError('Resume does not belong to the job studentId');
  }

  if (analysis.status === AnalysisStatus.PENDING) {
    await resumesRepository.updateAnalysisStatus(payload.analysisId, AnalysisStatus.PROCESSING);
  }

  // Milestones 5–7: download PDF, extract text, OpenAI scoring, persist result, set active resume.
}

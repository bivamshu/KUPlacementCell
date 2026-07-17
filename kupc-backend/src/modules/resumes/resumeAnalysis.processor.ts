import { UnrecoverableError } from 'bullmq';
import { resumeStorage } from '../../config/resumeStorage';
import { resumesRepository } from '../../database/resumes.repository';
import { studentsRepository } from '../../database/students.repository';
import type { ResumeAnalysisJobPayload } from '../../queues/resumeAnalysis.types';
import { AnalysisStatus } from './resumes.constants';
import { OpenAiAnalysisError, ResumeEmptyTextError } from './resumes.errors';
import { extractTextFromPdf } from './resumes.extract';
import { analyzeResumeText } from './resumes.openai';

export async function processResumeAnalysisJob(payload: ResumeAnalysisJobPayload): Promise<void> {
  const analysis = await resumesRepository.findAnalysisById(payload.analysisId);

  if (!analysis) {
    throw new UnrecoverableError(`Analysis ${payload.analysisId} not found`);
  }

  const resume = await resumesRepository.findById(payload.resumeId);

  if (!resume) {
    throw new UnrecoverableError(`Resume ${payload.resumeId} not found`);
  }

  if (resume.student_id !== payload.studentId) {
    throw new UnrecoverableError('Resume does not belong to the job studentId');
  }

  if (analysis.status === AnalysisStatus.COMPLETED) {
    await studentsRepository.setActiveResume(payload.studentId, payload.resumeId);
    return;
  }

  if (analysis.status === AnalysisStatus.PENDING) {
    await resumesRepository.updateAnalysisStatus(payload.analysisId, AnalysisStatus.PROCESSING);
  }

  try {
    const pdfBuffer = await resumeStorage.downloadPdf(resume.file_url);
    const text = await extractTextFromPdf(pdfBuffer);
    const aiResult = await analyzeResumeText(text);

    await resumesRepository.completeAnalysis(payload.analysisId, {
      atsScore: aiResult.ats_score.total_score,
      grade: aiResult.ats_score.grade,
      scoreBreakdown: aiResult.ats_score.breakdown,
      extractedSkills: aiResult.extracted_skills,
      summary: aiResult.summary,
      strengths: aiResult.strengths,
      suggestions: aiResult.suggestions,
      issuesIdentified: aiResult.issues_identified,
      rawResponse: aiResult.rawResponse,
      model: aiResult.model
    });

    await studentsRepository.setActiveResume(payload.studentId, payload.resumeId);
  } catch (error) {
    if (error instanceof ResumeEmptyTextError) {
      throw new UnrecoverableError(`${error.code}: ${error.message}`);
    }

    if (error instanceof OpenAiAnalysisError && !error.retryable) {
      throw new UnrecoverableError(error.message);
    }

    throw error;
  }
}

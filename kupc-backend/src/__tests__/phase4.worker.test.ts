import { UnrecoverableError } from 'bullmq';
import { AnalysisStatus, RESUME_ERROR_CODES } from '../modules/resumes/resumes.constants';
import { processResumeAnalysisJob } from '../modules/resumes/resumeAnalysis.processor';
import { resumesRepository } from '../database/resumes.repository';
import { studentsRepository } from '../database/students.repository';
import { resumeStorage } from '../config/resumeStorage';
import { extractTextFromPdf } from '../modules/resumes/resumes.extract';
import { analyzeResumeText } from '../modules/resumes/resumes.openai';

jest.mock('../database/resumes.repository', () => ({
  resumesRepository: {
    findAnalysisById: jest.fn(),
    findById: jest.fn(),
    updateAnalysisStatus: jest.fn(),
    completeAnalysis: jest.fn()
  }
}));

jest.mock('../database/students.repository', () => ({
  studentsRepository: {
    setActiveResume: jest.fn()
  }
}));

jest.mock('../config/resumeStorage', () => ({
  resumeStorage: {
    downloadPdf: jest.fn()
  }
}));

jest.mock('../modules/resumes/resumes.extract', () => ({
  extractTextFromPdf: jest.fn()
}));

jest.mock('../modules/resumes/resumes.openai', () => ({
  analyzeResumeText: jest.fn()
}));

const payload = {
  resumeId: 'resume-id',
  analysisId: 'analysis-id',
  studentId: 'student-id'
};

const aiResult = {
  ats_score: {
    total_score: 72,
    grade: 'B',
    breakdown: [{ category: 'skills', label: 'Skills', score: 18, max_score: 25 }]
  },
  extracted_skills: {
    languages: ['Python'],
    frameworks: [],
    databases: [],
    cloud: [],
    data_ml: [],
    other: []
  },
  summary: 'Good resume',
  strengths: ['Clear layout'],
  suggestions: [],
  issues_identified: [],
  model: 'gpt-4o-mini',
  rawResponse: { mocked: true }
};

describe('Phase 4 Milestone 4–7 - resume analysis processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resumeStorage.downloadPdf as jest.Mock).mockResolvedValue(Buffer.from('%PDF-1.4'));
    (extractTextFromPdf as jest.Mock).mockResolvedValue('a'.repeat(120));
    (analyzeResumeText as jest.Mock).mockResolvedValue(aiResult);
    (resumesRepository.completeAnalysis as jest.Mock).mockResolvedValue({
      id: payload.analysisId,
      status: AnalysisStatus.COMPLETED
    });
    (studentsRepository.setActiveResume as jest.Mock).mockResolvedValue({
      id: payload.studentId,
      resume_id: payload.resumeId
    });
  });

  it('ensures active resume when analysis is already completed (idempotent)', async () => {
    (resumesRepository.findAnalysisById as jest.Mock).mockResolvedValue({
      id: payload.analysisId,
      status: AnalysisStatus.COMPLETED
    });
    (resumesRepository.findById as jest.Mock).mockResolvedValue({
      id: payload.resumeId,
      student_id: payload.studentId,
      file_url: 'student-id/resume-id/resume.pdf'
    });

    await processResumeAnalysisJob(payload);

    expect(studentsRepository.setActiveResume).toHaveBeenCalledWith(
      payload.studentId,
      payload.resumeId
    );
    expect(resumeStorage.downloadPdf).not.toHaveBeenCalled();
  });

  it('runs extract → OpenAI → completeAnalysis pipeline', async () => {
    (resumesRepository.findAnalysisById as jest.Mock).mockResolvedValue({
      id: payload.analysisId,
      status: AnalysisStatus.PENDING
    });
    (resumesRepository.findById as jest.Mock).mockResolvedValue({
      id: payload.resumeId,
      student_id: payload.studentId,
      file_url: 'student-id/resume-id/resume.pdf'
    });

    await processResumeAnalysisJob(payload);

    expect(resumesRepository.updateAnalysisStatus).toHaveBeenCalledWith(
      payload.analysisId,
      AnalysisStatus.PROCESSING
    );
    expect(resumeStorage.downloadPdf).toHaveBeenCalledWith('student-id/resume-id/resume.pdf');
    expect(extractTextFromPdf).toHaveBeenCalled();
    expect(analyzeResumeText).toHaveBeenCalled();
    expect(resumesRepository.completeAnalysis).toHaveBeenCalledWith(
      payload.analysisId,
      expect.objectContaining({
        atsScore: 72,
        grade: 'B',
        model: 'gpt-4o-mini'
      })
    );
    expect(studentsRepository.setActiveResume).toHaveBeenCalledWith(
      payload.studentId,
      payload.resumeId
    );
  });

  it('does not re-mark processing analysis', async () => {
    (resumesRepository.findAnalysisById as jest.Mock).mockResolvedValue({
      id: payload.analysisId,
      status: AnalysisStatus.PROCESSING
    });
    (resumesRepository.findById as jest.Mock).mockResolvedValue({
      id: payload.resumeId,
      student_id: payload.studentId,
      file_url: 'path/to/resume.pdf'
    });

    await processResumeAnalysisJob(payload);

    expect(resumesRepository.updateAnalysisStatus).not.toHaveBeenCalled();
    expect(resumesRepository.completeAnalysis).toHaveBeenCalled();
  });

  it('throws UnrecoverableError when analysis is missing', async () => {
    (resumesRepository.findAnalysisById as jest.Mock).mockResolvedValue(null);

    await expect(processResumeAnalysisJob(payload)).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it('throws UnrecoverableError when resume student mismatch', async () => {
    (resumesRepository.findAnalysisById as jest.Mock).mockResolvedValue({
      id: payload.analysisId,
      status: AnalysisStatus.PENDING
    });
    (resumesRepository.findById as jest.Mock).mockResolvedValue({
      id: payload.resumeId,
      student_id: 'other-student',
      file_url: 'path/to/resume.pdf'
    });

    await expect(processResumeAnalysisJob(payload)).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it('maps empty PDF text to non-retryable UnrecoverableError', async () => {
    (resumesRepository.findAnalysisById as jest.Mock).mockResolvedValue({
      id: payload.analysisId,
      status: AnalysisStatus.PENDING
    });
    (resumesRepository.findById as jest.Mock).mockResolvedValue({
      id: payload.resumeId,
      student_id: payload.studentId,
      file_url: 'path/to/resume.pdf'
    });

    const { ResumeEmptyTextError } = jest.requireActual('../modules/resumes/resumes.errors') as typeof import('../modules/resumes/resumes.errors');
    (extractTextFromPdf as jest.Mock).mockRejectedValue(new ResumeEmptyTextError());

    await expect(processResumeAnalysisJob(payload)).rejects.toMatchObject({
      message: expect.stringContaining(RESUME_ERROR_CODES.RESUME_EMPTY_TEXT)
    });
    expect(studentsRepository.setActiveResume).not.toHaveBeenCalled();
  });
});

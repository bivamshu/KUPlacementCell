import { UnrecoverableError } from 'bullmq';
import { AnalysisStatus } from '../modules/resumes/resumes.constants';
import { processResumeAnalysisJob } from '../modules/resumes/resumeAnalysis.processor';
import { resumesRepository } from '../database/resumes.repository';

jest.mock('../database/resumes.repository', () => ({
  resumesRepository: {
    findAnalysisById: jest.fn(),
    findById: jest.fn(),
    updateAnalysisStatus: jest.fn()
  }
}));

const payload = {
  resumeId: 'resume-id',
  analysisId: 'analysis-id',
  studentId: 'student-id'
};

describe('Phase 4 Milestone 4 - resume analysis processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no-ops when analysis is already completed (idempotent)', async () => {
    (resumesRepository.findAnalysisById as jest.Mock).mockResolvedValue({
      id: payload.analysisId,
      status: AnalysisStatus.COMPLETED
    });

    await processResumeAnalysisJob(payload);

    expect(resumesRepository.findById).not.toHaveBeenCalled();
    expect(resumesRepository.updateAnalysisStatus).not.toHaveBeenCalled();
  });

  it('marks pending analysis as processing', async () => {
    (resumesRepository.findAnalysisById as jest.Mock).mockResolvedValue({
      id: payload.analysisId,
      status: AnalysisStatus.PENDING
    });
    (resumesRepository.findById as jest.Mock).mockResolvedValue({
      id: payload.resumeId,
      student_id: payload.studentId
    });
    (resumesRepository.updateAnalysisStatus as jest.Mock).mockResolvedValue({
      id: payload.analysisId,
      status: AnalysisStatus.PROCESSING
    });

    await processResumeAnalysisJob(payload);

    expect(resumesRepository.updateAnalysisStatus).toHaveBeenCalledWith(
      payload.analysisId,
      AnalysisStatus.PROCESSING
    );
  });

  it('does not re-mark processing analysis', async () => {
    (resumesRepository.findAnalysisById as jest.Mock).mockResolvedValue({
      id: payload.analysisId,
      status: AnalysisStatus.PROCESSING
    });
    (resumesRepository.findById as jest.Mock).mockResolvedValue({
      id: payload.resumeId,
      student_id: payload.studentId
    });

    await processResumeAnalysisJob(payload);

    expect(resumesRepository.updateAnalysisStatus).not.toHaveBeenCalled();
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
      student_id: 'other-student'
    });

    await expect(processResumeAnalysisJob(payload)).rejects.toBeInstanceOf(UnrecoverableError);
  });
});

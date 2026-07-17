jest.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'production',
    RESUME_ANALYSIS_JOB_ATTEMPTS: 3,
    RESUME_ANALYSIS_BACKOFF_MS: 5_000
  }
}));

jest.mock('../config/redis', () => ({
  isRedisConfigured: jest.fn(),
  createRedisConnection: jest.fn()
}));

const mockAdd = jest.fn();

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: mockAdd
  }))
}));

import { isRedisConfigured } from '../config/redis';
import { enqueueResumeAnalysis } from '../queues/resumeAnalysis.queue';
import { RESUME_ANALYSIS_JOB_NAME } from '../queues/resumeAnalysis.constants';
import { RESUME_ERROR_CODES } from '../modules/resumes/resumes.constants';

describe('Phase 4 Milestone 4 - resume analysis queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws RESUME_QUEUE_UNAVAILABLE in production when Redis is not configured', async () => {
    (isRedisConfigured as jest.Mock).mockReturnValue(false);

    await expect(
      enqueueResumeAnalysis({
        resumeId: 'resume-id',
        analysisId: 'analysis-id',
        studentId: 'student-id'
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: RESUME_ERROR_CODES.RESUME_QUEUE_UNAVAILABLE
    });
  });

  it('enqueues analyze job with analysisId as jobId when Redis is configured', async () => {
    (isRedisConfigured as jest.Mock).mockReturnValue(true);

    const payload = {
      resumeId: 'resume-id',
      analysisId: 'analysis-id',
      studentId: 'student-id'
    };

    await enqueueResumeAnalysis(payload);

    expect(mockAdd).toHaveBeenCalledWith(RESUME_ANALYSIS_JOB_NAME, payload, {
      jobId: payload.analysisId
    });
  });
});

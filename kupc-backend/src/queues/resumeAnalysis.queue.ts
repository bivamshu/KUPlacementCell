import { Queue } from 'bullmq';
import { createRedisConnection, isRedisConfigured } from '../config/redis';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { RESUME_ERROR_CODES } from '../modules/resumes/resumes.constants';
import { RESUME_ANALYSIS_JOB_NAME, RESUME_ANALYSIS_QUEUE_NAME } from './resumeAnalysis.constants';
import type { ResumeAnalysisJobPayload } from './resumeAnalysis.types';

let queue: Queue<ResumeAnalysisJobPayload> | null = null;

function getQueue(): Queue<ResumeAnalysisJobPayload> {
  if (!queue) {
    queue = new Queue<ResumeAnalysisJobPayload>(RESUME_ANALYSIS_QUEUE_NAME, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        attempts: env.RESUME_ANALYSIS_JOB_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: env.RESUME_ANALYSIS_BACKOFF_MS
        },
        removeOnComplete: 100,
        removeOnFail: 500
      }
    });
  }

  return queue;
}

export async function enqueueResumeAnalysis(payload: ResumeAnalysisJobPayload): Promise<void> {
  if (!isRedisConfigured()) {
    if (env.NODE_ENV === 'production') {
      throw new AppError(
        'Resume analysis queue is unavailable',
        503,
        RESUME_ERROR_CODES.RESUME_QUEUE_UNAVAILABLE
      );
    }

    return;
  }

  await getQueue().add(RESUME_ANALYSIS_JOB_NAME, payload, {
    jobId: payload.analysisId
  });
}

export async function closeResumeAnalysisQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}

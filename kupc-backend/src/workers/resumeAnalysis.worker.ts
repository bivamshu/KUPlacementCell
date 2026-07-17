import { Job, Worker } from 'bullmq';
import dotenv from 'dotenv';
import { createRedisConnection } from '../config/redis';
import { env } from '../config/env';
import { resumesRepository } from '../database/resumes.repository';
import { processResumeAnalysisJob } from '../modules/resumes/resumeAnalysis.processor';
import { RESUME_ANALYSIS_QUEUE_NAME } from '../queues/resumeAnalysis.constants';
import type { ResumeAnalysisJobPayload } from '../queues/resumeAnalysis.types';

dotenv.config();

function log(message: string, extra?: Record<string, unknown>): void {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : '';
  console.log(`[resume-analysis-worker] ${message}${suffix}`);
}

async function handleJob(job: Job<ResumeAnalysisJobPayload>): Promise<void> {
  log('Job received', { jobId: job.id, ...job.data });
  await processResumeAnalysisJob(job.data);
  log('Job orchestration complete', { jobId: job.id, analysisId: job.data.analysisId });
}

async function markAnalysisFailed(analysisId: string, message: string): Promise<void> {
  try {
    await resumesRepository.failAnalysis(analysisId, message);
  } catch (error) {
    log('Failed to mark analysis as failed', {
      analysisId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function startWorker(): Promise<Worker<ResumeAnalysisJobPayload>> {
  if (!env.REDIS_URL) {
    throw new Error('REDIS_URL is required to run the resume analysis worker');
  }

  const worker = new Worker<ResumeAnalysisJobPayload>(RESUME_ANALYSIS_QUEUE_NAME, handleJob, {
    connection: createRedisConnection(),
    concurrency: env.RESUME_ANALYSIS_QUEUE_CONCURRENCY
  });

  worker.on('failed', async (job, error) => {
    if (!job) {
      return;
    }

    const attempts = job.opts.attempts ?? env.RESUME_ANALYSIS_JOB_ATTEMPTS;
    const isFinalAttempt = job.attemptsMade >= attempts;

    log('Job failed', {
      jobId: job.id,
      attemptsMade: job.attemptsMade,
      isFinalAttempt,
      error: error.message
    });

    if (isFinalAttempt) {
      await markAnalysisFailed(job.data.analysisId, error.message);
    }
  });

  worker.on('error', (error) => {
    log('Worker error', { error: error.message });
  });

  log('Worker started', { concurrency: env.RESUME_ANALYSIS_QUEUE_CONCURRENCY });

  return worker;
}

async function main(): Promise<void> {
  const worker = await startWorker();

  const shutdown = async (signal: string) => {
    log(`Received ${signal}, shutting down`);
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

main().catch((error) => {
  console.error('[resume-analysis-worker] Fatal error:', error);
  process.exit(1);
});

export const JOB_TYPES = ['internship', 'full_time', 'part_time'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ['open', 'closed', 'draft'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_ERROR_CODES = {
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  JOB_FORBIDDEN: 'JOB_FORBIDDEN',
  INVALID_JOB_PAYLOAD: 'INVALID_JOB_PAYLOAD',
  INVALID_JOB_TRANSITION: 'INVALID_JOB_TRANSITION',
  SAVED_JOB_NOT_FOUND: 'SAVED_JOB_NOT_FOUND',
  /** Scaffold placeholder until Milestone B2/B3/B4 implement the handler. */
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED'
} as const;

export type JobErrorCode = (typeof JOB_ERROR_CODES)[keyof typeof JOB_ERROR_CODES];

export const JOB_FEED_DEFAULT_LIMIT = 20;
export const JOB_FEED_MAX_LIMIT = 50;

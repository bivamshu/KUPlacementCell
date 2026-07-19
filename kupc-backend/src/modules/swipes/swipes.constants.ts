export const SWIPE_DIRECTIONS = ['left', 'right'] as const;
export type SwipeDirection = (typeof SWIPE_DIRECTIONS)[number];

/** Undo window in seconds for `DELETE /swipes/:jobId` (Phase 7 B3). */
export const SWIPE_UNDO_WINDOW_SECONDS = 30;

export const SWIPE_ERROR_CODES = {
  SWIPE_NOT_FOUND: 'SWIPE_NOT_FOUND',
  SWIPE_CONFLICT: 'SWIPE_CONFLICT',
  SWIPE_JOB_NOT_OPEN: 'SWIPE_JOB_NOT_OPEN',
  SWIPE_UNDO_EXPIRED: 'SWIPE_UNDO_EXPIRED',
  INVALID_SWIPE_PAYLOAD: 'INVALID_SWIPE_PAYLOAD',
  /** Scaffold placeholder until Milestone B2+ implement the handler. */
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED'
} as const;

export type SwipeErrorCode = (typeof SWIPE_ERROR_CODES)[keyof typeof SWIPE_ERROR_CODES];

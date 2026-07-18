export const MATCH_ERROR_CODES = {
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
  MATCH_FORBIDDEN: 'MATCH_FORBIDDEN',
  MATCH_CONFLICT: 'MATCH_CONFLICT',
  INVALID_MATCH_PAYLOAD: 'INVALID_MATCH_PAYLOAD',
  /** Scaffold placeholder until Milestone B4/B5 implement the handler. */
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED'
} as const;

export type MatchErrorCode = (typeof MATCH_ERROR_CODES)[keyof typeof MATCH_ERROR_CODES];

export const AnalysisStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed'
} as const;
 
export type AnalysisStatus = (typeof AnalysisStatus)[keyof typeof AnalysisStatus];

export const RESUME_ERROR_CODES = {
    RESUME_NOT_FOUND: 'RESUME_NOT_FOUND',
    RESUME_FORBIDDEN: 'RESUME_FORBIDDEN',
    RESUME_INVALID_TYPE: 'RESUME_INVALID_TYPE',
    RESUME_TOO_LARGE: 'RESUME_TOO_LARGE',
    RESUME_EMPTY_TEXT: 'RESUME_EMPTY_TEXT',
    ANALYSIS_NOT_FOUND: 'ANALYSIS_NOT_FOUND',
    ANALYSIS_NOT_READY: 'ANALYSIS_NOT_READY',
    RESUME_QUEUE_UNAVAILABLE: 'RESUME_QUEUE_UNAVAILABLE'
} as const;


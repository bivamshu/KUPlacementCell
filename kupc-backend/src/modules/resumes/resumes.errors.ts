import { RESUME_ERROR_CODES } from './resumes.constants';

export class ResumeEmptyTextError extends Error {
  readonly code = RESUME_ERROR_CODES.RESUME_EMPTY_TEXT;

  constructor(message = 'PDF yielded no extractable text') {
    super(message);
    this.name = 'ResumeEmptyTextError';
  }
}

export class OpenAiAnalysisError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = 'OpenAiAnalysisError';
    this.retryable = retryable;
  }
}

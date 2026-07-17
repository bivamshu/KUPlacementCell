import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly body: unknown;

  constructor(message: string, statusCode: number, code = 'API_ERROR', body: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.body = body;
  }

  static fromEnvelope(statusCode: number, message: string, error: unknown): ApiError {
    const body = (error ?? {}) as ApiErrorBody;
    return new ApiError(
      body.message ?? message ?? 'Request failed',
      body.statusCode ?? statusCode,
      body.code ?? 'API_ERROR',
      error
    );
  }
}

export const SESSION_EXPIRED_EVENT = 'kupc:session-expired';

export function emitSessionExpired(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
}

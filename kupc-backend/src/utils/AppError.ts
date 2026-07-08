export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number, code = 'APP_ERROR', isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(code: string, message = 'Unauthorized') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(code: string, message = 'Forbidden') {
    super(message, 403, code);
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message = 'Request validation failed') {
    super(message, 400, code);
  }
}

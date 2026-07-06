export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  message: string;
  error: unknown | null;
};

export function successResponse<T>(data: T, message = 'Success'): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    error: null
  };
}

export function errorResponse(message: string, error: unknown = null): ApiResponse<null> {
  return {
    success: false,
    data: null,
    message,
    error
  };
}

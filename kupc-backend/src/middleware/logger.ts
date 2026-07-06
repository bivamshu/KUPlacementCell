import morgan from 'morgan';

/**
 * Logs each HTTP request with method, URL, status code, and response time.
 */
export const requestLogger = morgan('dev');

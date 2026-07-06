import express, { Request, Response } from 'express';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import { notFound } from './middleware/notFound';

const app = express();

// Standard parsed body middleware so Express handles JSON payloads natively
app.use(express.json());

// Log incoming requests during development and API testing
app.use(requestLogger);

// 1. Root Route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello KUPC');
});

// 2. Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK'
  });
});

// Convert unmatched routes into a controlled 404 error
app.use(notFound);

// Global error middleware must be registered after all routes
app.use(errorHandler);

export default app;

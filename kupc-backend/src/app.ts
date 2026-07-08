import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import { notFound } from './middleware/notFound';
import { securityMiddleware } from './middleware/security';
import { swaggerSpec } from './config/swagger';
import apiV1Router from './routes';
import { successResponse } from './utils/apiResponse';

const app = express();

// Set secure HTTP headers before handling requests
app.use(securityMiddleware);

// Allow the Vite frontend to call this API and reject other browser origins
app.use(corsMiddleware);

// Standard parsed body middleware so Express handles JSON payloads natively
app.use(express.json());

// Log incoming requests during development and API testing
app.use(requestLogger);

// 1. Root Route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json(successResponse({ name: 'KUPC API' }, 'Welcome to KUPC'));
});

// 2. Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json(
    successResponse(
      {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      'KUPC API is healthy'
    )
  );
});

// Versioned API routes
app.use('/api/v1', apiV1Router);

// Phase 2 OpenAPI docs (exit checklist: every auth endpoint documented)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Convert unmatched routes into a controlled 404 error
app.use(notFound);

// Global error middleware must be registered after all routes
app.use(errorHandler);

export default app;

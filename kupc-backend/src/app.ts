import express, { Request, Response } from 'express';
import { requestLogger } from './middleware/logger';

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

export default app;

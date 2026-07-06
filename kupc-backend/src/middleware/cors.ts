import cors, { CorsOptions } from 'cors';
import { config } from '../config/config';
import { AppError } from '../utils/AppError';

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || config.cors.allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError(`CORS policy does not allow origin: ${origin}`, 403));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

export const corsMiddleware = cors(corsOptions);

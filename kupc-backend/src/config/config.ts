import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT) || 5000;
const env = process.env.NODE_ENV || 'development';

export const config = {
  port,
  env,
  api: {
    name: 'KUPC API',
    version: '1.0.0'
  },
  cors: {
    allowedOrigins: ['http://localhost:5173']
  }
};

import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT) || 5000;
const env = process.env.NODE_ENV || 'development';

export const config = {
  port,
  env
};

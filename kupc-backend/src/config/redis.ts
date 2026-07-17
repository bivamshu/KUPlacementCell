import Redis from 'ioredis';
import { env } from './env';

/** BullMQ requires maxRetriesPerRequest: null on dedicated connections. */
export function createRedisConnection(): Redis {
  if (!env.REDIS_URL) {
    throw new Error('REDIS_URL is required for Redis-backed queue operations');
  }

  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
}

export function isRedisConfigured(): boolean {
  return Boolean(env.REDIS_URL);
}

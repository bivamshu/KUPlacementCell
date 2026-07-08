import Redis from 'ioredis';
import { config } from '../config/config';
import { env } from '../config/env';
import { AuthenticatedUser } from '../modules/auth';

export type CachedUserIdentity = Omit<AuthenticatedUser, 'sessionId'>;

export type AuthUserCacheStore = {
  get(userId: string): Promise<CachedUserIdentity | null> | CachedUserIdentity | null;
  set(user: CachedUserIdentity): Promise<void> | void;
  delete(userId: string): Promise<void> | void;
  clear(): Promise<void> | void;
};

class MemoryAuthUserCacheStore implements AuthUserCacheStore {
  private readonly cache = new Map<string, { user: CachedUserIdentity; expiresAt: number }>();

  get(userId: string): CachedUserIdentity | null {
    const entry = this.cache.get(userId);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(userId);
      return null;
    }

    return entry.user;
  }

  set(user: CachedUserIdentity): void {
    this.cache.set(user.id, {
      user,
      expiresAt: Date.now() + config.auth.userCacheTtlSeconds * 1000
    });
  }

  delete(userId: string): void {
    this.cache.delete(userId);
  }

  clear(): void {
    this.cache.clear();
  }
}

class RedisAuthUserCacheStore implements AuthUserCacheStore {
  private readonly redis: Redis;
  private readonly ttlSeconds: number;

  constructor(redisUrl: string, ttlSeconds: number) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true
    });
    this.ttlSeconds = ttlSeconds;
  }

  private key(userId: string): string {
    return `kupc:auth:user:${userId}`;
  }

  async get(userId: string): Promise<CachedUserIdentity | null> {
    const raw = await this.redis.get(this.key(userId));

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as CachedUserIdentity;
  }

  async set(user: CachedUserIdentity): Promise<void> {
    await this.redis.set(this.key(user.id), JSON.stringify(user), 'EX', this.ttlSeconds);
  }

  async delete(userId: string): Promise<void> {
    await this.redis.del(this.key(userId));
  }

  async clear(): Promise<void> {
    const keys = await this.redis.keys('kupc:auth:user:*');

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

function createStore(): AuthUserCacheStore {
  if (env.REDIS_URL) {
    return new RedisAuthUserCacheStore(env.REDIS_URL, config.auth.userCacheTtlSeconds);
  }

  return new MemoryAuthUserCacheStore();
}

const store = createStore();

export const authUserCacheStore = {
  async get(userId: string): Promise<CachedUserIdentity | null> {
    return await store.get(userId);
  },

  async set(user: CachedUserIdentity): Promise<void> {
    await store.set(user);
  },

  async delete(userId: string): Promise<void> {
    await store.delete(userId);
  },

  async clear(): Promise<void> {
    await store.clear();
  }
};

import { config } from '../config/config';
import { AuthenticatedUser } from '../modules/auth';

type CachedUserIdentity = Omit<AuthenticatedUser, 'sessionId'>;

type CacheEntry = {
  user: CachedUserIdentity;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export const authUserCache = {
  get(userId: string): CachedUserIdentity | null {
    const entry = cache.get(userId);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      cache.delete(userId);
      return null;
    }

    return entry.user;
  },

  set(user: CachedUserIdentity): void {
    cache.set(user.id, {
      user,
      expiresAt: Date.now() + config.auth.userCacheTtlSeconds * 1000
    });
  },

  delete(userId: string): void {
    cache.delete(userId);
  },

  clear(): void {
    cache.clear();
  }
};

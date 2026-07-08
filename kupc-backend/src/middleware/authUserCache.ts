import { AuthenticatedUser } from '../modules/auth';
import { authUserCacheStore } from './authUserCacheStore';

type CachedUserIdentity = Omit<AuthenticatedUser, 'sessionId'>;

export const authUserCache = {
  async get(userId: string): Promise<CachedUserIdentity | null> {
    return authUserCacheStore.get(userId);
  },

  async set(user: CachedUserIdentity): Promise<void> {
    await authUserCacheStore.set(user);
  },

  async delete(userId: string): Promise<void> {
    await authUserCacheStore.delete(userId);
  },

  async clear(): Promise<void> {
    await authUserCacheStore.clear();
  }
};

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/authApi';
import { SESSION_EXPIRED_EVENT } from '../api/errors';
import type { AuthMeUser, LoginInput } from '../api/types';
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContextInstance';
import { tokenStore } from './tokenStore';

export type { AuthContextValue, AuthStatus };

async function fetchMe(): Promise<AuthMeUser> {
  return authApi.me();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthMeUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('idle');

  const hydrate = useCallback(async () => {
    if (!tokenStore.hasSession()) {
      setUser(null);
      setStatus('anonymous');
      return null;
    }

    setStatus('loading');
    try {
      const me = await fetchMe();
      setUser(me);
      setStatus('authenticated');
      return me;
    } catch {
      tokenStore.clear();
      setUser(null);
      setStatus('anonymous');
      return null;
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setStatus('anonymous');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const acceptTokens = useCallback(async (accessToken: string, refreshToken: string) => {
    tokenStore.setTokens(accessToken, refreshToken);
    setStatus('loading');
    const me = await fetchMe();
    setUser(me);
    setStatus('authenticated');
    return me;
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const tokens = await authApi.login(input);
      return acceptTokens(tokens.access_token, tokens.refresh_token);
    },
    [acceptTokens]
  );

  const adminLogin = useCallback(
    async (input: LoginInput & { totp_code?: string }) => {
      const tokens = await authApi.adminLogin(input);
      return acceptTokens(tokens.access_token, tokens.refresh_token);
    },
    [acceptTokens]
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Best-effort: clear local session even if the API call fails.
    } finally {
      tokenStore.clear();
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      status,
      isAuthenticated: status === 'authenticated' && user !== null,
      login,
      adminLogin,
      acceptTokens,
      logout,
      refreshUser: hydrate,
    }),
    [user, status, login, adminLogin, acceptTokens, logout, hydrate]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import type { AuthMeUser, LoginInput, Role } from '../api/types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous';

export type AuthContextValue = {
  user: AuthMeUser | null;
  role: Role | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<AuthMeUser>;
  adminLogin: (input: LoginInput & { totp_code?: string }) => Promise<AuthMeUser>;
  acceptTokens: (accessToken: string, refreshToken: string) => Promise<AuthMeUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthMeUser | null>;
};

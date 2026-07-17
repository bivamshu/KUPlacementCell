import { createContext } from 'react';
import type { AuthContextValue } from './authTypes';

export type { AuthContextValue, AuthStatus } from './authTypes';

export const AuthContext = createContext<AuthContextValue | null>(null);

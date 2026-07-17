import { tokenStore } from '../auth/tokenStore';
import { ApiError, emitSessionExpired } from './errors';
import type { ApiEnvelope, AuthTokens } from './types';

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Skip Authorization header (login/register/refresh). */
  skipAuth?: boolean;
  /** Internal: do not attempt another refresh on 401. */
  _retried?: boolean;
};

function getBaseUrl(): string {
  const base = import.meta.env.VITE_API_URL;
  if (!base) {
    throw new Error('VITE_API_URL is not set. Copy .env.example to .env and restart Vite.');
  }
  return base.replace(/\/$/, '');
}

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getBaseUrl()}${normalized}`;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshTokens(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = tokenStore.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const res = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const envelope = (await res.json()) as ApiEnvelope<AuthTokens>;

      if (!res.ok || !envelope.success || !envelope.data) {
        return false;
      }

      tokenStore.setTokens(envelope.data.access_token, envelope.data.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Typed fetch against the KUPC API envelope `{ success, data, message, error }`.
 * Attaches Bearer token when present; on 401 attempts a single refresh + retry.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, skipAuth, _retried, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);
  headers.set('Accept', 'application/json');

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (body !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const accessToken = tokenStore.getAccessToken();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  const res = await fetch(buildUrl(path), {
    ...rest,
    headers,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  });

  let envelope: ApiEnvelope<T> | null = null;
  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    envelope = (await res.json()) as ApiEnvelope<T>;
  }

  if (res.status === 401 && !skipAuth && !_retried) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, _retried: true });
    }
    tokenStore.clear();
    emitSessionExpired();
  }

  if (!res.ok || !envelope?.success) {
    throw ApiError.fromEnvelope(
      res.status,
      envelope?.message ?? res.statusText ?? 'Request failed',
      envelope?.error ?? null
    );
  }

  return envelope.data as T;
}

/** Absolute origin health check (not under /api/v1). Useful for CORS smoke tests. */
export async function pingApiOrigin(): Promise<{ ok: boolean; status: number }> {
  const apiUrl = getBaseUrl();
  const origin = new URL(apiUrl).origin;
  const res = await fetch(`${origin}/health`, { method: 'GET' });
  return { ok: res.ok, status: res.status };
}

export function getApiBaseUrl(): string {
  return getBaseUrl();
}

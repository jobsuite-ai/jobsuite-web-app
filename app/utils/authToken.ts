import { isPainterRole } from '@/app/utils/roles';

const ACCESS_TOKEN_EXPIRES_AT_KEY = 'access_token_expires_at';
const ACCESS_TOKEN_ISSUED_AT_KEY = 'access_token_issued_at';
const DEFAULT_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

function decodeBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return atob(padded);
}

export function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  const parts = accessToken.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = decodeBase64Url(parts[1]);
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getTokenExpiresAt(accessToken: string): number | null {
  const payload = decodeJwtPayload(accessToken);
  const exp = payload?.exp;
  if (typeof exp !== 'number') {
    return null;
  }
  return exp * 1000;
}

export function setAccessTokenMetadata(accessToken: string, expiresInSeconds?: number): void {
  if (typeof window === 'undefined') {
    return;
  }

  const now = Date.now();
  localStorage.setItem(ACCESS_TOKEN_ISSUED_AT_KEY, String(now));

  let expiresAt: number | null = null;
  if (typeof expiresInSeconds === 'number' && !Number.isNaN(expiresInSeconds)) {
    expiresAt = now + expiresInSeconds * 1000;
  } else {
    expiresAt = getTokenExpiresAt(accessToken) ?? now + DEFAULT_ACCESS_TOKEN_TTL_MS;
  }

  localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT_KEY, String(expiresAt));
}

export function getAccessTokenExpiresAt(accessToken: string): number | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return getTokenExpiresAt(accessToken);
}

export function clearAccessTokenMetadata(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem(ACCESS_TOKEN_ISSUED_AT_KEY);
}

/** Role claim from the stored access token (for cache policy; not a security boundary). */
export function isPainterRoleFromToken(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const token = localStorage.getItem('access_token');
  if (!token) {
    return false;
  }
  const payload = decodeJwtPayload(token);
  const r = payload?.role;
  return typeof r === 'string' && isPainterRole(r);
}

/**
 * @deprecated Use isPainterRoleFromToken — kept for call sites that still say "employee session".
 */
export function isEmployeeRoleFromToken(): boolean {
  return isPainterRoleFromToken();
}

/**
 * True when cached /api/auth/me data should not be used for this access token
 * (different user, or role changed in a new token while localStorage cache is stale).
 */
export function isCachedAuthMeStaleForToken(
  accessToken: string,
  cached: { id: string; role: string }
): boolean {
  const payload = decodeJwtPayload(accessToken);
  if (!payload) {
    return true;
  }
  const sub = typeof payload.sub === 'string' ? payload.sub : null;
  if (!sub || cached.id !== sub) {
    return true;
  }
  const tokenRole = typeof payload.role === 'string' ? payload.role : null;
  if (tokenRole != null && tokenRole !== cached.role) {
    return true;
  }
  return false;
}

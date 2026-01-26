const ACCESS_TOKEN_EXPIRES_AT_KEY = 'access_token_expires_at';
const ACCESS_TOKEN_ISSUED_AT_KEY = 'access_token_issued_at';
const DEFAULT_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

function decodeBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return atob(padded);
}

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
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

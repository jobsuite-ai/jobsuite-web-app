type CacheEntry = {
  url: string;
  /**
   * Epoch millis when this entry should be treated as stale and refetched.
   * We intentionally refresh a bit before the server-side expiry.
   */
  expiresAtMs: number;
};

const LS_PREFIX = 'jobsuite_presigned_url_v1:';
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const EARLY_REFRESH_MS = 60 * 1000; // 1 minute

const memory = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<string | null>>();

function nowMs() {
  return Date.now();
}

function buildKey(params: { estimateId: string; resourceId: string }) {
  return `${params.estimateId}:${params.resourceId}`;
}

function parseExpiresAtMsFromUrl(url: string): number | null {
  try {
    const u = new URL(url);
    const expires = u.searchParams.get('Expires');
    if (!expires) return null;
    const seconds = Number(expires);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    return seconds * 1000;
  } catch {
    return null;
  }
}

function getFromLocalStorage(key: string): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${LS_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.url || typeof parsed.expiresAtMs !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function setToLocalStorage(key: string, entry: CacheEntry) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Ignore storage quota / blocked storage
  }
}

function isFresh(entry: CacheEntry) {
  return entry.expiresAtMs > nowMs();
}

function computeExpiresAtMs(presignedUrl: string): number {
  const fromUrl = parseExpiresAtMsFromUrl(presignedUrl);
  const base = fromUrl ?? nowMs() + DEFAULT_TTL_MS;
  return Math.max(nowMs() + 5_000, base - EARLY_REFRESH_MS);
}

export async function getOrFetchPresignedUrl(params: {
  estimateId: string;
  resourceId: string;
  accessToken: string;
  /** If true, bypass caches and refetch. */
  force?: boolean;
}): Promise<string | null> {
  const key = buildKey(params);

  if (!params.force) {
    const mem = memory.get(key);
    if (mem && isFresh(mem)) return mem.url;

    const ls = getFromLocalStorage(key);
    if (ls && isFresh(ls)) {
      memory.set(key, ls);
      return ls.url;
    }
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch(
        `/api/estimates/${params.estimateId}/resources/${params.resourceId}/presigned-url`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${params.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      const url = (data?.presigned_url || data?.url) as string | undefined;
      if (!url) return null;

      const entry: CacheEntry = { url, expiresAtMs: computeExpiresAtMs(url) };
      memory.set(key, entry);
      setToLocalStorage(key, entry);
      return url;
    } catch {
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

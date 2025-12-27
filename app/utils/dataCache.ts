/**
 * Cache utility for storing clients, estimates, and projects data in localStorage
 */

export type CacheKey = 'clients' | 'estimates' | 'projects';

interface CachedData<T> {
  data: T[];
  timestamp: number;
}

interface CachedSingleData<T> {
  data: T;
  timestamp: number;
}

const CACHE_PREFIX = 'jobsuite_cache_';
const ESTIMATE_SUMMARY_PREFIX = 'jobsuite_estimate_summary_';

// Cache expiration times in milliseconds
const CACHE_EXPIRATION: Record<CacheKey, number> = {
  clients: 10 * 60 * 1000, // 10 minutes
  estimates: 5 * 60 * 1000, // 5 minutes
  projects: Infinity, // No expiration for projects
};

const ESTIMATE_SUMMARY_EXPIRATION = 2 * 60 * 1000; // 2 minutes

/**
 * Get the full cache key for a given cache type
 */
function getCacheKey(key: CacheKey): string {
  return `${CACHE_PREFIX}${key}`;
}

/**
 * Get the expiration time in milliseconds for a given cache key
 */
function getCacheExpiration(key: CacheKey): number {
  return CACHE_EXPIRATION[key] ?? Infinity;
}

/**
 * Check if cached data has expired
 */
function isCacheExpired(key: CacheKey, timestamp: number): boolean {
  const expirationTime = getCacheExpiration(key);
  if (expirationTime === Infinity) {
    return false; // Never expires
  }
  const now = Date.now();
  return now - timestamp > expirationTime;
}

/**
 * Get cached data for a given key
 */
export function getCachedData<T>(key: CacheKey): T[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cacheKey = getCacheKey(key);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const parsed: CachedData<T> = JSON.parse(cached);

    // Check if cache has expired
    if (isCacheExpired(key, parsed.timestamp)) {
      // Clear expired cache
      clearCachedData(key);
      return null;
    }

    return parsed.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error reading cache for ${key}:`, error);
    return null;
  }
}

/**
 * Set cached data for a given key
 */
export function setCachedData<T>(key: CacheKey, data: T[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const cacheKey = getCacheKey(key);
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cached));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error writing cache for ${key}:`, error);
    // If storage is full, try to clear old cache entries
    try {
      clearAllCache();
      localStorage.setItem(getCacheKey(key), JSON.stringify({ data, timestamp: Date.now() }));
    } catch (retryError) {
      // eslint-disable-next-line no-console
      console.error('Failed to write cache after clearing:', retryError);
    }
  }
}

/**
 * Clear cached data for a specific key
 */
export function clearCachedData(key: CacheKey): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const cacheKey = getCacheKey(key);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error clearing cache for ${key}:`, error);
  }
}

/**
 * Clear all cached data
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const keys: CacheKey[] = ['clients', 'estimates', 'projects'];
    keys.forEach((key) => {
      clearCachedData(key);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error clearing all cache:', error);
  }
}

/**
 * Get cache timestamp for a given key
 */
export function getCacheTimestamp(key: CacheKey): number | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cacheKey = getCacheKey(key);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const parsed: CachedData<unknown> = JSON.parse(cached);
    return parsed.timestamp;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error reading cache timestamp for ${key}:`, error);
    return null;
  }
}

/**
 * Get cached estimate summary for a given estimate ID
 */
export function getCachedEstimateSummary<T>(estimateId: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cacheKey = `${ESTIMATE_SUMMARY_PREFIX}${estimateId}`;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const parsed: CachedSingleData<T> = JSON.parse(cached);

    // Check if cache has expired
    const now = Date.now();
    if (now - parsed.timestamp > ESTIMATE_SUMMARY_EXPIRATION) {
      // Clear expired cache
      clearCachedEstimateSummary(estimateId);
      return null;
    }

    return parsed.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error reading estimate summary cache for ${estimateId}:`, error);
    return null;
  }
}

/**
 * Set cached estimate summary for a given estimate ID
 */
export function setCachedEstimateSummary<T>(estimateId: string, data: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const cacheKey = `${ESTIMATE_SUMMARY_PREFIX}${estimateId}`;
    const cached: CachedSingleData<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cached));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error writing estimate summary cache for ${estimateId}:`, error);
  }
}

/**
 * Clear cached estimate summary for a specific estimate ID
 */
export function clearCachedEstimateSummary(estimateId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const cacheKey = `${ESTIMATE_SUMMARY_PREFIX}${estimateId}`;
    localStorage.removeItem(cacheKey);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error clearing estimate summary cache for ${estimateId}:`, error);
  }
}

const AUTH_ME_CACHE_KEY = 'jobsuite_auth_me';
const AUTH_ME_EXPIRATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached /api/auth/me response
 */
export function getCachedAuthMe<T>(): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cached = localStorage.getItem(AUTH_ME_CACHE_KEY);
    if (!cached) {
      return null;
    }

    const parsed: CachedSingleData<T> = JSON.parse(cached);

    // Check if cache has expired
    const now = Date.now();
    if (now - parsed.timestamp > AUTH_ME_EXPIRATION) {
      // Clear expired cache
      clearCachedAuthMe();
      return null;
    }

    return parsed.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error reading auth/me cache:', error);
    return null;
  }
}

/**
 * Set cached /api/auth/me response
 */
export function setCachedAuthMe<T>(data: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const cached: CachedSingleData<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(AUTH_ME_CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error writing auth/me cache:', error);
  }
}

/**
 * Clear cached /api/auth/me response
 */
export function clearCachedAuthMe(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(AUTH_ME_CACHE_KEY);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error clearing auth/me cache:', error);
  }
}

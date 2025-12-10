/**
 * Cache utility for storing clients, estimates, and projects data in localStorage
 */

export type CacheKey = 'clients' | 'estimates' | 'projects';

interface CachedData<T> {
  data: T[];
  timestamp: number;
}

const CACHE_PREFIX = 'jobsuite_cache_';

// Cache expiration times in milliseconds
const CACHE_EXPIRATION: Record<CacheKey, number> = {
  clients: 10 * 60 * 1000, // 10 minutes
  estimates: 5 * 60 * 1000, // 5 minutes
  projects: Infinity, // No expiration for projects
};

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

import { Middleware, type AnyAction } from '@reduxjs/toolkit';

import { setClients as setClientsAction } from '../slices/clientsSlice';
import { setEstimates as setEstimatesAction } from '../slices/estimatesSlice';
import { setProjects as setProjectsAction } from '../slices/projectsSlice';
import { AppDispatch, RootState } from '../types';

import { getApiHeaders } from '@/app/utils/apiClient';
import { isCacheValid, type CacheKey } from '@/app/utils/dataCache';

const CACHE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const REFRESH_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

const refreshTimers: Map<CacheKey, NodeJS.Timeout> = new Map();
let lastActivityTime = Date.now();
let isPageVisible = true;

// Track user activity
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Track page visibility
  document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
    if (isPageVisible) {
      lastActivityTime = Date.now();
    }
  });

  // Track user interactions
  const updateActivity = () => {
    lastActivityTime = Date.now();
  };
  ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach((event) => {
    window.addEventListener(event, updateActivity, { passive: true });
  });
}

/**
 * Check if user is active (page visible and recent interaction)
 */
function isUserActive(): boolean {
  if (typeof window === 'undefined') return false;
  const timeSinceLastActivity = Date.now() - lastActivityTime;
  // Active if interacted within 5 minutes
  return isPageVisible && timeSinceLastActivity < 5 * 60 * 1000;
}

/**
 * Fetch data from API
 */
async function fetchData(key: CacheKey): Promise<any[]> {
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  if (!accessToken) {
    return [];
  }

  try {
    let url = '';
    if (key === 'estimates') {
      url = '/api/estimates';
    } else if (key === 'clients') {
      url = '/api/clients';
    } else if (key === 'projects') {
      url = '/api/projects';
    } else {
      return [];
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getApiHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${key}`);
    }

    const data = await response.json();
    return data.Items || data || [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching ${key}:`, error);
    return [];
  }
}

/**
 * Setup periodic refresh for a cache key
 */
function setupRefreshTimer(
  key: CacheKey,
  dispatch: AppDispatch,
  getState: () => RootState
): void {
  // Clear existing timer
  const existingTimer = refreshTimers.get(key);
  if (existingTimer) {
    clearInterval(existingTimer);
  }

  const timer = setInterval(() => {
    const state = getState();
    let lastFetched: number | null = null;
    let isValid = false;

    if (key === 'estimates') {
      lastFetched = state.estimates.lastFetched;
      isValid = isCacheValid('estimates');
    } else if (key === 'clients') {
      lastFetched = state.clients.lastFetched;
      isValid = isCacheValid('clients');
    } else if (key === 'projects') {
      lastFetched = state.projects.lastFetched;
      isValid = isCacheValid('projects');
    }

    // Check if cache is expired or about to expire
    const now = Date.now();
    const cacheAge = lastFetched ? now - lastFetched : Infinity;
    const isExpired = !isValid || cacheAge > CACHE_EXPIRATION_MS;

    // Only refresh if expired and user is active
    if (isExpired && isUserActive()) {
      // Refresh in background (stale-while-revalidate)
      fetchData(key).then((data) => {
        if (key === 'estimates') {
          dispatch(setEstimatesAction(data));
        } else if (key === 'clients') {
          dispatch(setClientsAction(data));
        } else if (key === 'projects') {
          dispatch(setProjectsAction(data));
        }
      });
    }
  }, REFRESH_CHECK_INTERVAL_MS);

  refreshTimers.set(key, timer);
}

/**
 * Middleware that periodically refreshes cache for active users
 */
export const refreshMiddleware: Middleware<{}, RootState> = (store) => {
  // Setup refresh timers for each cache key
  setupRefreshTimer('estimates', store.dispatch, store.getState);
  setupRefreshTimer('clients', store.dispatch, store.getState);
  setupRefreshTimer('projects', store.dispatch, store.getState);

  return (next) => (action) => {
    const result = next(action);

    // Type guard to check if action has a type property
    if (typeof action !== 'object' || action === null || !('type' in action)) {
      return result;
    }

    const typedAction = action as AnyAction;

    // Restart timers if data was just fetched
    if (typedAction.type === 'estimates/setEstimates') {
      setupRefreshTimer('estimates', store.dispatch, store.getState);
    } else if (typedAction.type === 'clients/setClients') {
      setupRefreshTimer('clients', store.dispatch, store.getState);
    } else if (typedAction.type === 'projects/setProjects') {
      setupRefreshTimer('projects', store.dispatch, store.getState);
    }

    return result;
  };
};

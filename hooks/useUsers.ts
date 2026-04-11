import { useCallback, useEffect, useState } from 'react';

import { User } from '@/components/Global/model';

// Simple in-memory cache to prevent duplicate fetches
let usersCache: User[] | null = null;
let usersCachePromise: Promise<User[]> | null = null;

const cacheInvalidationListeners = new Set<() => void>();

export function useUsers() {
  const [users, setUsers] = useState<User[]>(usersCache || []);
  const [loading, setLoading] = useState(!usersCache);
  const [fetchGeneration, setFetchGeneration] = useState(0);

  useEffect(() => {
    const listener = () => setFetchGeneration((g) => g + 1);
    cacheInvalidationListeners.add(listener);
    return () => {
      cacheInvalidationListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      setLoading(false);
      return;
    }

    const skipCache = fetchGeneration > 0;

    if (!skipCache && usersCache) {
      setUsers(usersCache);
      setLoading(false);
      return;
    }

    if (!skipCache && usersCachePromise) {
      usersCachePromise.then((data) => {
        setUsers(data);
        setLoading(false);
      });
      return;
    }

    setLoading(true);

    usersCachePromise = fetch('/api/users', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load users');
        }
        return response.json();
      })
      .then((data) => {
        const usersList = Array.isArray(data) ? data : [];
        usersCache = usersList;
        setUsers(usersList);
        setLoading(false);
        return usersList;
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Error loading users:', error);
        setLoading(false);
        usersCachePromise = null;
        return [];
      })
      .finally(() => {
        usersCachePromise = null;
      });
  }, [fetchGeneration]);

  const refetch = useCallback(() => {
    invalidateUsersCache();
  }, []);

  return { users, loading, refetch };
}

/** Clears cache and notifies all mounted `useUsers` hooks to refetch. */
export function invalidateUsersCache() {
  usersCache = null;
  usersCachePromise = null;
  cacheInvalidationListeners.forEach((listener) => listener());
}

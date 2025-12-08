import { useEffect, useState } from 'react';

import { User } from '@/components/Global/model';

// Simple in-memory cache to prevent duplicate fetches
let usersCache: User[] | null = null;
let usersCachePromise: Promise<User[]> | null = null;

export function useUsers() {
  const [users, setUsers] = useState<User[]>(usersCache || []);
  const [loading, setLoading] = useState(!usersCache);

  useEffect(() => {
    // If we already have cached data, use it
    if (usersCache) {
      setUsers(usersCache);
      setLoading(false);
      return;
    }

    // If there's already a fetch in progress, wait for it
    if (usersCachePromise) {
      usersCachePromise.then((data) => {
        setUsers(data);
        setLoading(false);
      });
      return;
    }

    // Otherwise, fetch users
    setLoading(true);
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      setLoading(false);
      return;
    }

    usersCachePromise = fetch('/api/users', {
      method: 'GET',
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
  }, []);

  return { users, loading };
}

// Function to invalidate the cache (useful if users are updated)
export function invalidateUsersCache() {
  usersCache = null;
  usersCachePromise = null;
}

'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { getApiHeaders, setCachedContractorId } from '@/app/utils/apiClient';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  contractor_id: string | null;
  is_active: boolean;
}

export interface UseAuthOptions {
  requireAuth?: boolean; // If true, redirects to '/' if not authenticated
  redirectTo?: string; // Where to redirect if not authenticated (default: '/')
  fetchUser?: boolean; // If true, fetches and returns user data
}

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

/**
 * Custom hook for handling job engine authentication
 *
 * @param options Configuration options
 * @returns Auth state including user, loading, and error states
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const {
    requireAuth = false,
    redirectTo = '/',
    fetchUser = false,
  } = options;

  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        // No token
        setIsAuthenticated(false);
        setIsLoading(false);

        if (requireAuth) {
          router.push(redirectTo);
        }
        return;
      }

      // Set loading state when checking auth
      setIsLoading(true);

      // Validate token and optionally fetch user
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: getApiHeaders(),
        });

        if (!response.ok) {
          // Token is invalid
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setIsAuthenticated(false);
          setIsLoading(false);

          if (requireAuth) {
            router.push(redirectTo);
          } else {
            setError('Invalid or expired token');
          }
          return;
        }

        // Token is valid
        setIsAuthenticated(true);

        const userData = await response.json();

        if (fetchUser) {
          // Fetch user data
          setUser(userData);
        }

        // Cache contractor_id in localStorage if available
        if (userData.contractor_id) {
          setCachedContractorId(userData.contractor_id);
        }

        setIsLoading(false);
        setError(null);
      } catch (err) {
        // Error checking token
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsAuthenticated(false);
        setIsLoading(false);

        const errorMessage = err instanceof Error ? err.message : 'An error occurred while checking authentication';
        setError(errorMessage);

        if (requireAuth) {
          router.push(redirectTo);
        }
      }
    };

    // Initial check
    checkAuth();

    // Listen for storage changes (e.g., when login saves token in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event for same-origin storage changes
    // (storage event only fires for changes from other windows/tabs)
    const handleCustomStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener);
    };
  }, [router, requireAuth, redirectTo, fetchUser]);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
  };
}

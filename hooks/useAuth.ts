'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

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

      // Validate token and optionally fetch user
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
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

        if (fetchUser) {
          // Fetch user data
          const userData = await response.json();
          setUser(userData);
        }

        setIsLoading(false);
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

    checkAuth();
  }, [router, requireAuth, redirectTo, fetchUser]);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
  };
}

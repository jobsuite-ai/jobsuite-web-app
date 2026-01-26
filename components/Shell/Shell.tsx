'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { Header } from './Header/Header';
import classes from './Shell.module.css';

import { clearCachedContractorId, getApiHeaders, setCachedContractorId } from '@/app/utils/apiClient';
import { clearAccessTokenMetadata, getAccessTokenExpiresAt } from '@/app/utils/authToken';
import { clearCachedAuthMe, getCachedAuthMe, setCachedAuthMe } from '@/app/utils/dataCache';
import type { User } from '@/hooks/useAuth';

export function Shell({ children }: { children: any }) {
  const [sidebarOpened, setSidebarOpened] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const authCheckIdRef = useRef(0);

  // Don't show header/navigation for signature pages
  const isSignaturePage = pathname?.startsWith('/sign/');

  const clearAuthStorage = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    clearAccessTokenMetadata();
    clearCachedAuthMe();
    clearCachedContractorId();
    window.dispatchEvent(new Event('localStorageChange'));
  }, []);

  const checkAuth = useCallback(async () => {
    const currentCheckId = authCheckIdRef.current + 1;
    authCheckIdRef.current = currentCheckId;

    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      setIsAuthenticated(false);
      return;
    }

    const expiresAt = getAccessTokenExpiresAt(accessToken);
    const isExpired = expiresAt !== null && Date.now() >= expiresAt;

    const cachedUserData = getCachedAuthMe<User>();
    if (cachedUserData) {
      setIsAuthenticated(true);
      if (cachedUserData.contractor_id) {
        setCachedContractorId(cachedUserData.contractor_id);
      }
    }

    if (!isExpired && !cachedUserData) {
      setIsAuthenticated(true);
      return;
    }

    if (!isExpired) {
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: getApiHeaders(),
        });

        if (authCheckIdRef.current !== currentCheckId) {
          return;
        }

        if (!response.ok) {
          clearAuthStorage();
          setIsAuthenticated(false);
          return;
        }

        const userData: User = await response.json();
        if (authCheckIdRef.current !== currentCheckId) {
          return;
        }

        setCachedAuthMe(userData);
        if (userData.contractor_id) {
          setCachedContractorId(userData.contractor_id);
        }
        setIsAuthenticated(true);
      } catch {
        if (authCheckIdRef.current !== currentCheckId) {
          return;
        }
        clearAuthStorage();
        setIsAuthenticated(false);
      }
    };

    if (cachedUserData) {
      validateToken().catch(() => {});
      return;
    }

    await validateToken();
  }, [clearAuthStorage]);

  useEffect(() => {
    // Initial check on first load
    checkAuth().catch(() => {});

    // Listen for storage changes (e.g., when login saves token)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        checkAuth().catch(() => {});
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event for same-origin storage changes
    // (storage event only fires for changes from other windows/tabs)
    const handleCustomStorageChange = () => {
      checkAuth().catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAuth().catch(() => {});
      }
    };

    const handleWindowFocus = () => {
      checkAuth().catch(() => {});
    };

    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [checkAuth]);

  useEffect(() => {
    // Revalidate auth when navigating to a new page
    checkAuth().catch(() => {});
  }, [checkAuth, pathname]);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const isPublicRoute =
      pathname === '/' ||
      pathname.startsWith('/accept-invitation') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password') ||
      pathname.startsWith('/ios-app-redirect') ||
      pathname.startsWith('/sign/');

    if (!isAuthenticated && !isPublicRoute) {
      router.replace('/');
    }
  }, [isAuthenticated, pathname, router]);

  // For signature pages, don't wrap with Shell/Header
  if (isSignaturePage) {
    return <>{children}</>;
  }

  return (
    <div className={`${classes.verticalWrapper} ${!isAuthenticated ? classes.verticalWrapperNoHeader : ''}`}>
      {isAuthenticated ? (
        <Header sidebarOpened={sidebarOpened} setSidebarOpened={setSidebarOpened} />
      ) : null}
      <div className={`${classes.wrapper} ${sidebarOpened ? classes.wrapperWithSidebar : ''} ${!isAuthenticated ? classes.wrapperNoHeader : ''}`}>
        <div className={classes.main}>
          {children}
        </div>
      </div>
    </div>
  );
}

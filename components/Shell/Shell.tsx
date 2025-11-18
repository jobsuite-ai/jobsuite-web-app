'use client';

import { useEffect, useState } from 'react';

import { Header } from './Header/Header';
import classes from './Shell.module.css';

export function Shell({ children }: { children: any }) {
  const [sidebarOpened, setSidebarOpened] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      const accessToken = localStorage.getItem('access_token');
      setIsAuthenticated(!!accessToken);
    };

    // Initial check
    checkAuth();

    // Listen for storage changes (e.g., when login saves token)
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
  }, []);

  return (
    <div className={`${classes.verticalWrapper} ${!isAuthenticated ? classes.verticalWrapperNoHeader : ''}`}>
      <Header sidebarOpened={sidebarOpened} setSidebarOpened={setSidebarOpened} />
      <div className={`${classes.wrapper} ${sidebarOpened ? classes.wrapperWithSidebar : ''} ${!isAuthenticated ? classes.wrapperNoHeader : ''}`}>
        <div className={classes.main}>
          {children}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';

import { UserProfile, UserProvider } from '@auth0/nextjs-auth0/client';
import '@mantine/carousel/styles.css';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';

import { Shell } from '@/components/Shell/Shell';
import { DataCacheProvider } from '@/contexts/DataCacheContext';
import { SearchDataProvider } from '@/contexts/SearchDataContext';

// Custom fetcher that includes authentication token
const authenticatedUserFetcher = async (url: string): Promise<UserProfile | undefined> => {
  // Check if we're in a browser environment before accessing localStorage
  if (typeof window === 'undefined') {
    return undefined;
  }

  const accessToken = localStorage.getItem('access_token');

  if (!accessToken) {
    return undefined;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 204) {
      return undefined;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export default function RootLayout({ children }: { children: any }) {
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .catch((error) => {
          throw Error('Service Worker registered successfully', error);
        });
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
        <link rel="icon" type="image/png" href="/jobsuite-no-text.png" />
        <link rel="shortcut icon" href="/jobsuite-no-text.png" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <MantineProvider>
          <UserProvider fetcher={authenticatedUserFetcher}>
            <DataCacheProvider>
              <SearchDataProvider>
                <Notifications />
                <Shell>{children}</Shell>
              </SearchDataProvider>
            </DataCacheProvider>
          </UserProvider>
        </MantineProvider>
      </body>
    </html>
  );
}

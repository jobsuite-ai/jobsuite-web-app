'use client';

import { useEffect } from 'react';

import { UserProfile, UserProvider } from '@auth0/nextjs-auth0/client';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
// eslint-disable-next-line import/order
import { Notifications } from '@mantine/notifications';
import '@mantine/carousel/styles.css';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/tiptap/styles.css';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { Shell } from '@/components/Shell/Shell';
import { DataCacheProvider } from '@/contexts/DataCacheContext';
import { persistor, store } from '@/store';

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

  useEffect(() => {
    // Ensure the document title is always "Jobsuite"
    if (typeof document !== 'undefined') {
      document.title = 'Jobsuite';
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Jobsuite</title>
        <ColorSchemeScript />
        <link rel="icon" type="image/png" href="/jobsuite-no-text.png" />
        <link rel="shortcut icon" href="/jobsuite-no-text.png" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <MantineProvider>
              <UserProvider fetcher={authenticatedUserFetcher}>
                <DataCacheProvider>
                  <Notifications />
                  <Shell>{children}</Shell>
                </DataCacheProvider>
              </UserProvider>
            </MantineProvider>
          </PersistGate>
        </Provider>
      </body>
    </html>
  );
}

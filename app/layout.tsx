'use client';

import { useEffect } from 'react';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/carousel/styles.css';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { UserProvider } from '@auth0/nextjs-auth0/client';

import { Shell } from '@/components/Shell/Shell';

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
        <link rel="shortcut icon" href="/circle_fav.ico" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <MantineProvider>
          <UserProvider>
            <Notifications />
            <Shell>{children}</Shell>
          </UserProvider>
        </MantineProvider>
      </body>
    </html>
  );
}

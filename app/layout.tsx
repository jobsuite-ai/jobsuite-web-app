import '@mantine/core/styles.css';

import React from 'react';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { Shell } from '@/components/Shell/Shell';
import '@mantine/notifications/styles.css';

export const metadata = {
  title: 'RL Peek Painting',
  description: 'Quality Interior And Exterior Painting Services For Over 30 Years',
};

export default function RootLayout({ children }: { children: any }) {
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
          <Notifications />
          <Shell>{children}</Shell>
        </MantineProvider>
      </body>
    </html>
  );
}

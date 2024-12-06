import { UserProvider } from '@auth0/nextjs-auth0/client';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { Shell } from '@/components/Shell/Shell';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/carousel/styles.css';

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
          <UserProvider>
            <Notifications />
            <Shell>{children}</Shell>
          </UserProvider>
        </MantineProvider>
      </body>
    </html>
  );
}

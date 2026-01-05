'use client';

import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';

export default function SignatureLayout({ children }: { children: React.ReactNode }) {
    return (
        <MantineProvider>
            <Notifications />
            <div style={{ minHeight: '100vh', backgroundColor: 'var(--mantine-color-body)' }}>
                {children}
            </div>
        </MantineProvider>
    );
}

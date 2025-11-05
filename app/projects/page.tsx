'use client';

import { useEffect } from 'react';

import { Center, Loader } from '@mantine/core';

import JobsList from '@/components/JobsList/JobsList';
import { useAuth } from '@/hooks/useAuth';

export default function Jobs() {
    const { isLoading } = useAuth({ requireAuth: true });

    useEffect(() => {
        // Prevent body scrolling on this page
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            // Restore scrolling when leaving the page
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, []);

    if (isLoading) {
        return (
            <Center style={{ minHeight: '100vh', overflow: 'hidden' }}>
                <Loader size="xl" />
            </Center>
        );
    }

    return (
        <div
          style={{
            height: 'calc(100vh - 60px)',
            overflow: 'hidden',
            backgroundColor: '#6262C1',
          }}
        >
            <JobsList />
        </div>
    );
}

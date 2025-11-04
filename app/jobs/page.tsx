'use client';

import { Loader, Center } from '@mantine/core';

import JobsList from '@/components/JobsList/JobsList';
import { useAuth } from '@/hooks/useAuth';

export default function Jobs() {
    const { isLoading } = useAuth({ requireAuth: true });

    if (isLoading) {
        return (
            <Center style={{ minHeight: '100vh' }}>
                <Loader size="xl" />
            </Center>
        );
    }

    return <JobsList />;
}

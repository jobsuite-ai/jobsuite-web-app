'use client';

import { Center, Loader } from '@mantine/core';

import { NewJobWorkflow } from '@/components/Workflows/NewJobWorkflow';
import { useAuth } from '@/hooks/useAuth';

export default function AddJob() {
    const { isLoading } = useAuth({ requireAuth: true });

    if (isLoading) {
        return (
            <Center style={{ minHeight: '100vh' }}>
                <Loader size="xl" />
            </Center>
        );
    }

    return <NewJobWorkflow />;
}

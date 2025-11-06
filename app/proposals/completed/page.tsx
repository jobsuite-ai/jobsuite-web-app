'use client';

import { Loader, Center } from '@mantine/core';

import CompletedEstimatesList from '@/components/EstimatesList/CompletedEstimatesList';
import { useAuth } from '@/hooks/useAuth';

export default function CompletedEstimates() {
    const { isLoading } = useAuth({ requireAuth: true });

    if (isLoading) {
        return (
            <Center style={{ minHeight: '100vh' }}>
                <Loader size="xl" />
            </Center>
        );
    }

    return <CompletedEstimatesList />;
}


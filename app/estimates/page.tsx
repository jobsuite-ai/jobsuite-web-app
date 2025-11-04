'use client';

import { Loader, Center } from '@mantine/core';

import { useAuth } from '@/hooks/useAuth';
import EstimatesList from '@/components/EstimatesList/EstimatesList';

export default function Estimates() {
    const { isLoading } = useAuth({ requireAuth: true });

    if (isLoading) {
        return (
            <Center style={{ minHeight: '100vh' }}>
                <Loader size="xl" />
            </Center>
        );
    }

    return <EstimatesList />;
}

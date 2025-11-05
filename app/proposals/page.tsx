'use client';

import { Loader, Center } from '@mantine/core';

import EstimatesList from '@/components/EstimatesList/EstimatesList';
import { useAuth } from '@/hooks/useAuth';

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

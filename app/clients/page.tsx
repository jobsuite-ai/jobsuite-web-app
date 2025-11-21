'use client';

import { Center, Loader } from '@mantine/core';

import ClientsList from '@/components/Clients/Clients';
import { useAuth } from '@/hooks/useAuth';

export default function Clients() {
    const { isLoading } = useAuth({ requireAuth: true });

    if (isLoading) {
        return (
            <Center style={{ minHeight: '100vh' }}>
                <Loader size="xl" />
            </Center>
        );
    }

    return <ClientsList />;
}

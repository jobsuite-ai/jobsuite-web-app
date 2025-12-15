'use client';

import { useEffect } from 'react';

import { Center, Loader } from '@mantine/core';
import { useRouter } from 'next/navigation';

import MessagingCenter from '@/components/MessagingCenter/MessagingCenter';
import { useAuth } from '@/hooks/useAuth';

export default function MessagingCenterPage() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Redirect to login page if the user is not logged in
            router.push('/');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading || !isAuthenticated) {
        return (
            <Center style={{ minHeight: '100vh' }}>
                <Loader size="xl" />
            </Center>
        );
    }

    return <MessagingCenter />;
}

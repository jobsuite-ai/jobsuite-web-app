'use client';

import { useEffect } from 'react';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';

import ClientsList from '@/components/Clients/Clients';

export default function Clients() {
    const { user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            // Redirect to login page if the user is not logged in
            router.push('/profile');
        }
    }, [isLoading, user, router]);

    return (<ClientsList />);
}

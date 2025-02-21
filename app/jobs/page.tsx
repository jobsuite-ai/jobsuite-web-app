'use client';

import { useEffect } from 'react';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';

import JobsList from '@/components/JobsList/JobsList';

export default function Jobs() {
    const { user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            // Redirect to login page if the user is not logged in
            router.push('/profile');
        }
    }, [isLoading, user, router]);

    return (<JobsList />);
}

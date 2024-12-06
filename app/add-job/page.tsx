'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { NewJobWorkflow } from '@/components/Workflows/NewJobWorkflow';

export default function AddJob() {
    const { user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            // Redirect to login page if the user is not logged in
            router.push('/profile');
        }
    }, [isLoading, user, router]);

    return (<NewJobWorkflow />);
}

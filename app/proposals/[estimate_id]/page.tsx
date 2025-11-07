'use client';

import { useEffect } from 'react';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useParams, useRouter } from 'next/navigation';

import EstimateDetails from '@/components/EstimateDetails/EstimateDetails';

export default function Proposal() {
    const params = useParams();
    const { user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            // Redirect to login page if the user is not logged in
            router.push('/profile');
        }
    }, [isLoading, user, router]);

    return params ? <EstimateDetails estimateID={params.estimate_id as string} /> : null;
}

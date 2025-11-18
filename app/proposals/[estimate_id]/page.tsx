'use client';

import { useEffect } from 'react';

import { useParams, useRouter } from 'next/navigation';

import EstimateDetails from '@/components/EstimateDetails/EstimateDetails';
import { useAuth } from '@/hooks/useAuth';

export default function Proposal() {
    const params = useParams();
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Redirect to login page if the user is not logged in
            router.push('/');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading || !isAuthenticated) {
        return null;
    }

    return params ? <EstimateDetails estimateID={params.estimate_id as string} /> : null;
}

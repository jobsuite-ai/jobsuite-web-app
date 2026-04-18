'use client';

import { useEffect } from 'react';

import { useParams, useRouter } from 'next/navigation';

import EstimateDetails from '@/components/EstimateDetails/EstimateDetails';
import EstimateDetailsSkeleton from '@/components/EstimateDetails/EstimateDetailsSkeleton';
import { useAuth } from '@/hooks/useAuth';

export default function Proposal() {
    const params = useParams();
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const estimateId = typeof params?.estimate_id === 'string' ? params.estimate_id : undefined;

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Redirect to login page if the user is not logged in
            router.push('/');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading || !isAuthenticated) {
        return <EstimateDetailsSkeleton />;
    }

    return estimateId ? <EstimateDetails estimateID={estimateId} /> : <EstimateDetailsSkeleton />;
}

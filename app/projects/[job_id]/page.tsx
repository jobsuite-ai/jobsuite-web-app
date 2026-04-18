'use client';

import { useEffect } from 'react';

import { useParams, useRouter } from 'next/navigation';

import EstimateDetails from '@/components/EstimateDetails/EstimateDetails';
import EstimateDetailsSkeleton from '@/components/EstimateDetails/EstimateDetailsSkeleton';
import { useAuth } from '@/hooks/useAuth';

export default function Job() {
    const params = useParams();
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading || !isAuthenticated) {
        return <EstimateDetailsSkeleton />;
    }

    return params ? <EstimateDetails estimateID={params.job_id as string} /> : null;
}

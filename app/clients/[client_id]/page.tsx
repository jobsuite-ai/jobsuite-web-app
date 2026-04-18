'use client';

import { useEffect, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { getApiHeaders } from '@/app/utils/apiClient';
import SingleClient from '@/components/Clients/Client';
import LoadingState from '@/components/Global/LoadingState';
import { ContractorClient } from '@/components/Global/model';
import { useAuth } from '@/hooks/useAuth';

export default function Clients() {
    const [client, setClient] = useState<ContractorClient>();
    const params = useParams();
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/');
        }
    }, [isLoading, isAuthenticated, router]);

    useEffect(() => {
        if (isLoading || !isAuthenticated) {
            return () => {};
        }
        const clientId = params.client_id as string;
        setClient(undefined);
        let cancelled = false;

        const load = async () => {
            const response = await fetch(`/api/clients/${clientId}`, {
                method: 'GET',
                headers: getApiHeaders(),
            });

            const { Item } = await response.json();
            if (!cancelled) {
                setClient(Item);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [isLoading, isAuthenticated, params.client_id]);

    if (isLoading || !isAuthenticated) {
        return <LoadingState />;
    }

    return (
        <>
            {client ? <SingleClient initialClient={client} /> : <LoadingState />}
        </>
    );
}

'use client';

import { useEffect, useState } from 'react';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useParams, useRouter } from 'next/navigation';

import SingleClient from '@/components/Clients/Client';
import LoadingState from '@/components/Global/LoadingState';
import { ContractorClient } from '@/components/Global/model';
import { getApiHeaders } from '@/app/utils/apiClient';

export default function Clients() {
    const [client, setClient] = useState<ContractorClient>();
    const params = useParams();
    const { user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            // Redirect to login page if the user is not logged in
            router.push('/profile');
        }
        const fetchClient = async () => {
            await getClient();
        };
        if (!client) {
            fetchClient();
        }
    }, [isLoading, user, router, client]);

    async function getClient() {
        const response = await fetch(
            `/api/clients/${params.client_id as string}`,
            {
                method: 'GET',
                headers: getApiHeaders(),
            }
        );

        const { Item } = await response.json();
        setClient(Item);
    }

    return (
        <>
            {client ? <SingleClient initialClient={client} /> : <LoadingState />}
        </>
    );
}

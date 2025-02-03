'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import SingleClient from '@/components/Clients/Client';
import { DynamoClient } from '@/components/Global/model';
import LoadingState from '@/components/Global/LoadingState';

export default function Clients() {
    const [client, setClient] = useState<DynamoClient>();
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
                headers: {
                    'Content-Type': 'application/json',
                },
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

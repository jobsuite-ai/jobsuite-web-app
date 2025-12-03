'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

export default function CompletedEstimates() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to main proposals page
        router.replace('/proposals');
    }, [router]);

    return null;
}

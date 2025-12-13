'use client';

import { useEffect, useState } from 'react';

import { getApiHeaders } from '@/app/utils/apiClient';

/**
 * Custom hook to fetch and cache the contractor logo URL
 * Falls back to null if no logo exists (which will use default Jobsuite logo)
 */
export function useContractorLogo() {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogo = async () => {
            try {
                const response = await fetch('/api/configurations/logo', {
                    method: 'GET',
                    headers: getApiHeaders(),
                });

                if (response.ok) {
                    const data = await response.json();
                    setLogoUrl(data.logo_url || null);
                } else {
                    // No logo exists, that's okay - will use default
                    setLogoUrl(null);
                }
            } catch (err) {
                // Error fetching logo, use default
                // eslint-disable-next-line no-console
                console.error('Error fetching contractor logo:', err);
                setLogoUrl(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLogo();
    }, []);

    return { logoUrl, isLoading };
}

'use client';

import { useEffect, useState } from 'react';

import { getApiHeaders } from '@/app/utils/apiClient';

const LOGO_CACHE_KEY = 'contractor_logo_url';
const LOGO_CACHE_TIMESTAMP_KEY = 'contractor_logo_timestamp';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 * 100; // 100 days

/**
 * Custom hook to fetch and cache the contractor logo URL
 * Falls back to null if no logo exists (which will use default Jobsuite logo)
 * Caches the logo URL in localStorage to avoid repeated API calls
 */
export function useContractorLogo() {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogo = async () => {
            // Check cache first
            try {
                const cachedLogo = localStorage.getItem(LOGO_CACHE_KEY);
                const cacheTimestamp = localStorage.getItem(LOGO_CACHE_TIMESTAMP_KEY);

                if (cachedLogo && cacheTimestamp) {
                    const timestamp = parseInt(cacheTimestamp, 10);
                    const now = Date.now();

                    // Use cached logo if it's still valid (within cache duration)
                    if (now - timestamp < CACHE_DURATION_MS) {
                        setLogoUrl(cachedLogo || null);
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (err) {
                // If cache read fails, continue to fetch
                // eslint-disable-next-line no-console
                console.warn('Failed to read logo from cache:', err);
            }

            // Fetch from API if cache is invalid or missing
            try {
                const response = await fetch('/api/configurations/logo', {
                    method: 'GET',
                    headers: getApiHeaders(),
                });

                if (response.ok) {
                    const data = await response.json();
                    const logo = data.logo_url || null;
                    setLogoUrl(logo);

                    // Cache the result
                    try {
                        if (logo) {
                            localStorage.setItem(LOGO_CACHE_KEY, logo);
                        } else {
                            localStorage.removeItem(LOGO_CACHE_KEY);
                        }
                        localStorage.setItem(LOGO_CACHE_TIMESTAMP_KEY, Date.now().toString());
                    } catch (cacheErr) {
                        // If cache write fails, continue - logo is still set
                        // eslint-disable-next-line no-console
                        console.warn('Failed to cache logo:', cacheErr);
                    }
                } else {
                    // No logo exists, that's okay - will use default
                    setLogoUrl(null);
                    // Clear cache if logo doesn't exist
                    try {
                        localStorage.removeItem(LOGO_CACHE_KEY);
                        localStorage.removeItem(LOGO_CACHE_TIMESTAMP_KEY);
                    } catch (cacheErr) {
                        // Ignore cache errors
                    }
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

/**
 * Clear the cached logo (useful when a new logo is uploaded)
 */
export function clearLogoCache() {
    try {
        localStorage.removeItem(LOGO_CACHE_KEY);
        localStorage.removeItem(LOGO_CACHE_TIMESTAMP_KEY);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Failed to clear logo cache:', err);
    }
}

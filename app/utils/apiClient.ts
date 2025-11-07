/**
 * Client-side utility to get contractor_id from localStorage cache
 * and include it in request headers
 */
export function getCachedContractorId(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }
    return localStorage.getItem('contractor_id');
}

/**
 * Sets contractor_id in localStorage cache
 */
export function setCachedContractorId(contractorId: string): void {
    if (typeof window === 'undefined') {
        return;
    }
    localStorage.setItem('contractor_id', contractorId);
}

/**
 * Removes contractor_id from localStorage cache
 */
export function clearCachedContractorId(): void {
    if (typeof window === 'undefined') {
        return;
    }
    localStorage.removeItem('contractor_id');
}

/**
 * Gets headers with Authorization and X-Contractor-ID if available
 */
export function getApiHeaders(): HeadersInit {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    // Add Authorization header if token exists
    if (typeof window !== 'undefined') {
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        // Add X-Contractor-ID header if cached
        const contractorId = getCachedContractorId();
        if (contractorId) {
            headers['X-Contractor-ID'] = contractorId;
        }
    }

    return headers;
}

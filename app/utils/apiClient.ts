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

/**
 * Resolve an estimate title via GET /api/estimates/:id/summary (same data source as the
 * details page initial summary load). Prefer this over GET /api/estimates/:id so we do not
 * issue a second full estimate fetch alongside refreshes that use include_change_orders.
 */
export async function fetchEstimateTitleFromSummary(estimateId: string): Promise<string | null> {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const response = await fetch(`/api/estimates/${estimateId}/summary`, {
            method: 'GET',
            headers: getApiHeaders(),
        });
        if (!response.ok) {
            return null;
        }
        const data = (await response.json()) as { estimate?: { title?: string | null } };
        const title = data?.estimate?.title;
        return typeof title === 'string' && title.trim() ? title.trim() : null;
    } catch {
        return null;
    }
}

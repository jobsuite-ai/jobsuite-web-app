import { NextRequest } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

/**
 * Gets the contractor_id from the request headers if available,
 * otherwise fetches it from the /users/me endpoint.
 * @param request - The Next.js request object
 * @returns The contractor_id or null if not found
 */
export async function getContractorId(request: NextRequest | Request): Promise<string | null> {
    // First, check if contractor_id is provided in headers (from client cache)
    const contractorIdHeader = request.headers.get('X-Contractor-ID');
    if (contractorIdHeader) {
        return contractorIdHeader;
    }

    // If not in headers, fetch from /users/me endpoint
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);
    const apiBaseUrl = getApiBaseUrl();

    try {
        const userResponse = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!userResponse.ok) {
            return null;
        }

        const user = await userResponse.json();
        return user.contractor_id || null;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching contractor_id:', error);
        return null;
    }
}

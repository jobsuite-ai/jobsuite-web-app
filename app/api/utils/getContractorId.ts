import { NextRequest } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

/**
 * Read contractor_id from JWT payload (routing hint only; job-engine authorizes the request).
 */
function contractorIdFromAccessToken(accessToken: string): string | null {
    try {
        const parts = accessToken.split('.');
        if (parts.length < 2) {
            return null;
        }
        const payload = parts[1];
        const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
        const json = Buffer.from(padded, 'base64').toString('utf8');
        const obj = JSON.parse(json) as { contractor_id?: string | null };
        const cid = obj.contractor_id;
        if (typeof cid === 'string' && cid.trim()) {
            return cid.trim();
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Gets the contractor_id from the request headers if available,
 * otherwise from the JWT payload, otherwise fetches from GET /api/v1/auth/me
 * (employee-safe; /users/me is manager-only).
 * @param request - The Next.js request object
 * @returns The contractor_id or null if not found
 */
export async function getContractorId(request: NextRequest | Request): Promise<string | null> {
    // First, check if contractor_id is provided in headers (from client cache)
    const contractorIdHeader = request.headers.get('X-Contractor-ID');
    if (contractorIdHeader) {
        return contractorIdHeader;
    }

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    const fromJwt = contractorIdFromAccessToken(token);
    if (fromJwt) {
        return fromJwt;
    }

    const apiBaseUrl = getApiBaseUrl({ request });

    try {
        const userResponse = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
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

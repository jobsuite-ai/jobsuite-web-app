import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../utils/getContractorId';
import { getApiBaseUrl } from '../../utils/serviceAuth';

export async function POST(request: NextRequest) {
    try {
        // Get the access token from the Authorization header
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { message: 'Authorization header missing or invalid' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const apiBaseUrl = getApiBaseUrl();

        // Get contractor_id from cache (header) or fetch from API
        const contractorId = await getContractorId(request);

        if (!contractorId) {
            return NextResponse.json(
                { message: 'User does not have a contractor ID' },
                { status: 400 }
            );
        }

        // Disconnect QuickBooks from backend
        const disconnectResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/quickbooks/disconnect`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!disconnectResponse.ok) {
            const errorData = await disconnectResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to disconnect QuickBooks' },
                { status: disconnectResponse.status }
            );
        }

        const data = await disconnectResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Disconnect QuickBooks error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

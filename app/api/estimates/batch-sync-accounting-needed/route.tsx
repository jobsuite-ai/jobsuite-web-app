import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

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

        // Call batch sync endpoint
        const syncResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/batch-sync-accounting-needed`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!syncResponse.ok) {
            const errorData = await syncResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to batch sync estimates' },
                { status: syncResponse.status }
            );
        }

        const result = await syncResponse.json();
        return NextResponse.json(result);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Batch sync accounting needed error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

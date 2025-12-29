import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ estimate_id: string }> }
) {
    try {
        const { estimate_id } = await params;

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

        // Get lightweight estimate summary from backend
        const summaryResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/summary`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!summaryResponse.ok) {
            const errorData = await summaryResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch estimate summary' },
                { status: summaryResponse.status }
            );
        }

        const summary = await summaryResponse.json();
        return NextResponse.json(summary);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get estimate summary error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching estimate summary' },
            { status: 500 }
        );
    }
}

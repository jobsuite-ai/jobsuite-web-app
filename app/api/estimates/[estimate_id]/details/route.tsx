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

        // Get comprehensive estimate details from backend
        const detailsResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/details`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!detailsResponse.ok) {
            const errorData = await detailsResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch estimate details' },
                { status: detailsResponse.status }
            );
        }

        const details = await detailsResponse.json();
        return NextResponse.json(details);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get estimate details error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching estimate details' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function PUT(request: NextRequest) {
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

        // Get request body
        const body = await request.json();

        // Update service item name in backend
        const updateResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/quickbooks/settings/service-item-name`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to update service item name' },
                { status: updateResponse.status }
            );
        }

        const result = await updateResponse.json();
        return NextResponse.json(result);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Update service item name error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

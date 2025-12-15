import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { message: 'Authorization header missing or invalid' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const contractorId = await getContractorId(request);

        if (!contractorId) {
            return NextResponse.json(
                { message: 'Contractor ID not found' },
                { status: 400 }
            );
        }

        const apiBaseUrl = getApiBaseUrl();

        // Fetch count from backend
        const countResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/outreach-messages/count`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!countResponse.ok) {
            // Try to parse error as JSON, but handle non-JSON responses gracefully
            let errorMessage = 'Failed to fetch message count';
            try {
                const errorData = await countResponse.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch {
                // If response is not JSON, try to get text
                try {
                    const errorText = await countResponse.text();
                    errorMessage = errorText || errorMessage;
                } catch {
                    // If we can't read the response, use default message
                }
            }
            return NextResponse.json(
                { message: errorMessage },
                { status: countResponse.status }
            );
        }

        const data = await countResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get message count error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching message count' },
            { status: 500 }
        );
    }
}

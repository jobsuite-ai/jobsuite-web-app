import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../utils/getContractorId';
import { getApiBaseUrl } from '../../utils/serviceAuth';

export async function GET(request: NextRequest) {
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

        // Get QuickBooks authorization URL from backend
        const connectResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/quickbooks/connect`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!connectResponse.ok) {
            const errorData = await connectResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to get QuickBooks authorization URL' },
                { status: connectResponse.status }
            );
        }

        const data = await connectResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get QuickBooks connect error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

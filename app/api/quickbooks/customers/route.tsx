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

        // Get QuickBooks customers from backend
        const customersResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/quickbooks/customers`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!customersResponse.ok) {
            const errorData = await customersResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch QuickBooks customers' },
                { status: customersResponse.status }
            );
        }

        const customers = await customersResponse.json();
        return NextResponse.json(customers);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get QuickBooks customers error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

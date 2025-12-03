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

        // Get change orders from backend
        const changeOrdersResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/change-orders`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!changeOrdersResponse.ok) {
            const errorData = await changeOrdersResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch change orders' },
                { status: changeOrdersResponse.status }
            );
        }

        const changeOrders = await changeOrdersResponse.json();
        return NextResponse.json(changeOrders);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get change orders error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(
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

        // Create change order via backend API
        const createResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/change-orders`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to create change order' },
                { status: createResponse.status }
            );
        }

        const changeOrder = await createResponse.json();
        return NextResponse.json(changeOrder, { status: 201 });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Create change order error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

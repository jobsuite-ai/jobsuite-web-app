import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ estimate_id: string }> }
) {
    try {
        const { estimate_id } = await params;

        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { message: 'Authorization header missing or invalid' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const apiBaseUrl = getApiBaseUrl();

        const contractorId = await getContractorId(request);
        if (!contractorId) {
            return NextResponse.json(
                { message: 'User does not have a contractor ID' },
                { status: 400 }
            );
        }

        // Get line items for estimate from backend
        const lineItemsResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/line-items`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!lineItemsResponse.ok) {
            const errorData = await lineItemsResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch line items' },
                { status: lineItemsResponse.status }
            );
        }

        const lineItems = await lineItemsResponse.json();
        return NextResponse.json(lineItems);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get line items error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching line items' },
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

        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { message: 'Authorization header missing or invalid' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const apiBaseUrl = getApiBaseUrl();

        const contractorId = await getContractorId(request);
        if (!contractorId) {
            return NextResponse.json(
                { message: 'User does not have a contractor ID' },
                { status: 400 }
            );
        }

        const body = await request.json();

        const createResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/line-items`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to create line item' },
                { status: createResponse.status }
            );
        }

        const lineItem = await createResponse.json();
        return NextResponse.json(lineItem, { status: 201 });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Create line item error:', error);
        return NextResponse.json(
            { message: 'An error occurred while creating line item' },
            { status: 500 }
        );
    }
}

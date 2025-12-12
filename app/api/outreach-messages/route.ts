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

        // Parse query parameters
        const url = new URL(request.url);
        const estimateId = url.searchParams.get('estimate_id');
        const status = url.searchParams.get('status');
        const dueBefore = url.searchParams.get('due_before');

        // Build the API URL
        let messagesUrl = `${apiBaseUrl}/api/v1/contractors/${contractorId}/outreach-messages`;
        const params = new URLSearchParams();
        if (estimateId) params.append('estimate_id', estimateId);
        if (status) params.append('status', status);
        if (dueBefore) params.append('due_before', dueBefore);
        if (params.toString()) {
            messagesUrl += `?${params.toString()}`;
        }

        // Fetch messages from backend
        const messagesResponse = await fetch(messagesUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!messagesResponse.ok) {
            const errorData = await messagesResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch messages' },
                { status: messagesResponse.status }
            );
        }

        const data = await messagesResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get outreach messages error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching messages' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
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
        const body = await request.json();

        // Create message via backend API
        const createResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/outreach-messages`,
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
                { message: errorData.detail || 'Failed to create message' },
                { status: createResponse.status }
            );
        }

        const data = await createResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Create outreach message error:', error);
        return NextResponse.json(
            { message: 'An error occurred while creating message' },
            { status: 500 }
        );
    }
}

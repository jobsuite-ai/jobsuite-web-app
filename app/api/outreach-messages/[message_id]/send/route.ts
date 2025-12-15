import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ message_id: string }> }
) {
    try {
        const { message_id } = await params;
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

        // Send message via backend API (backend will get from_email from config)
        const sendResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/outreach-messages/${message_id}/send`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!sendResponse.ok) {
            const errorData = await sendResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to send message' },
                { status: sendResponse.status }
            );
        }

        const data = await sendResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Send message error:', error);
        return NextResponse.json(
            { message: 'An error occurred while sending message' },
            { status: 500 }
        );
    }
}

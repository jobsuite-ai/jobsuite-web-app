import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ message_type: string }> }
) {
    try {
        const { message_type } = await params;
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

        // Disable message type via backend API
        const disableResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/outreach-templates/${message_type}/disable`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!disableResponse.ok) {
            const errorData = await disableResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to disable message type' },
                { status: disableResponse.status }
            );
        }

        const data = await disableResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Disable message type error:', error);
        return NextResponse.json(
            { message: 'An error occurred while disabling message type' },
            { status: 500 }
        );
    }
}

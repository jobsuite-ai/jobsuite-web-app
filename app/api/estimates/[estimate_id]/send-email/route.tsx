import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

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

        const body = await request.json();

        // Send estimate emails via backend API
        const response = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/send-email`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_emails: body.client_emails,
                    signature_urls: body.signature_urls,
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                detail: 'Failed to send estimate emails',
            }));
            return NextResponse.json(
                { error: errorData.detail || 'Failed to send estimate emails' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Error sending estimate emails:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred while sending estimate emails' },
            { status: 500 }
        );
    }
}

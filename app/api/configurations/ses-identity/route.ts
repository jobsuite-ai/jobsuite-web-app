import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

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

        if (!body.email) {
            return NextResponse.json(
                { message: 'email is required' },
                { status: 400 }
            );
        }

        // Verify SES identity via backend API
        const verifyResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations/ses-identity`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: body.email }),
            }
        );

        if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to verify SES identity' },
                { status: verifyResponse.status }
            );
        }

        const data = await verifyResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Verify SES identity error:', error);
        return NextResponse.json(
            { message: 'An error occurred while verifying SES identity' },
            { status: 500 }
        );
    }
}

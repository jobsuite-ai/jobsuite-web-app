import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function PUT(
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
        const body = await request.json();

        // Update template via backend API
        const updateResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/outreach-templates/${message_type}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to update template' },
                { status: updateResponse.status }
            );
        }

        const data = await updateResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Update template error:', error);
        return NextResponse.json(
            { message: 'An error occurred while updating template' },
            { status: 500 }
        );
    }
}

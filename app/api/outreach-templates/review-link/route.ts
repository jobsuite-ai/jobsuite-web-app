import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function PUT(request: NextRequest) {
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

        if (!body.review_link) {
            return NextResponse.json(
                { message: 'review_link is required' },
                { status: 400 }
            );
        }

        // Update review link via backend API
        const updateResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/outreach-templates/review-link?review_link=${encodeURIComponent(body.review_link)}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to update review link' },
                { status: updateResponse.status }
            );
        }

        const data = await updateResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Update review link error:', error);
        return NextResponse.json(
            { message: 'An error occurred while updating review link' },
            { status: 500 }
        );
    }
}

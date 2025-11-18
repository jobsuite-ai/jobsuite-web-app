import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(request: NextRequest) {
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

        // Get request body
        const body = await request.json();
        const { job_id: estimate_id, commenter, comment_contents } = body;

        if (!estimate_id || !commenter || !comment_contents) {
            return NextResponse.json(
                { message: 'Missing required fields: job_id, commenter, or comment_contents' },
                { status: 400 }
            );
        }

        // Create comment via backend API
        const createResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/comments`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    commenter,
                    comment_contents,
                }),
            }
        );

        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to create comment' },
                { status: createResponse.status }
            );
        }

        const comment = await createResponse.json();
        return NextResponse.json(comment, { status: 201 });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Create comment error:', error);
        return NextResponse.json(
            { message: 'An error occurred while creating comment' },
            { status: 500 }
        );
    }
}

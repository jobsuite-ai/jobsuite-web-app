import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ job_id: string }> }
) {
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
        const { job_id: estimate_id } = await params;

        // Get contractor_id from cache (header) or fetch from API
        const contractorId = await getContractorId(request);

        if (!contractorId) {
            return NextResponse.json(
                { message: 'User does not have a contractor ID' },
                { status: 400 }
            );
        }

        // Get comments from backend API
        const commentsResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/comments`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!commentsResponse.ok) {
            const errorData = await commentsResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch comments' },
                { status: commentsResponse.status }
            );
        }

        const comments = await commentsResponse.json();
        // Transform to match expected format (Items array)
        return NextResponse.json({ Items: comments });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get comments error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching comments' },
            { status: 500 }
        );
    }
}

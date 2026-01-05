import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ estimate_id: string; comment_id: string }> }
) {
    try {
        const { estimate_id, comment_id } = await params;

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
        const { emoji } = body;

        if (!emoji) {
            return NextResponse.json(
                { message: 'Missing required field: emoji' },
                { status: 400 }
            );
        }

        // Add/remove reaction via backend API
        const reactionResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/comments/${comment_id}/reactions`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    emoji,
                }),
            }
        );

        if (!reactionResponse.ok) {
            const errorData = await reactionResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to add reaction' },
                { status: reactionResponse.status }
            );
        }

        const comment = await reactionResponse.json();
        return NextResponse.json(comment);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Add reaction error:', error);
        return NextResponse.json(
            { message: 'An error occurred while adding reaction' },
            { status: 500 }
        );
    }
}

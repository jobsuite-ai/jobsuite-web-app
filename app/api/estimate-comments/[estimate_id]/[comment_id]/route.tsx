import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function PUT(
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
        const { comment_contents } = body;

        if (!comment_contents) {
            return NextResponse.json(
                { message: 'Missing required field: comment_contents' },
                { status: 400 }
            );
        }

        // Update comment via backend API
        const updateResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/comments/${comment_id}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    comment_contents,
                }),
            }
        );

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to update comment' },
                { status: updateResponse.status }
            );
        }

        const comment = await updateResponse.json();
        return NextResponse.json(comment);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Update comment error:', error);
        return NextResponse.json(
            { message: 'An error occurred while updating comment' },
            { status: 500 }
        );
    }
}

export async function DELETE(
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

        // Delete comment via backend API
        const deleteResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/comments/${comment_id}`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to delete comment' },
                { status: deleteResponse.status }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Delete comment error:', error);
        return NextResponse.json(
            { message: 'An error occurred while deleting comment' },
            { status: 500 }
        );
    }
}

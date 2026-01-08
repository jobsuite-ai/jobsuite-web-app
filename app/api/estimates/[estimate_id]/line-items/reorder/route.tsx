import { NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function PUT(
    request: Request,
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

        // Get user info to obtain contractor_id
        const userResponse = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!userResponse.ok) {
            if (userResponse.status === 401) {
                return NextResponse.json(
                    { message: 'Invalid or expired token' },
                    { status: 401 }
                );
            }
            const errorData = await userResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to get user data' },
                { status: userResponse.status }
            );
        }

        const user = await userResponse.json();

        if (!user.contractor_id) {
            return NextResponse.json(
                { message: 'User does not have a contractor ID' },
                { status: 400 }
            );
        }

        // Get request body
        const body = await request.json();

        // Reorder line items via backend API
        const reorderResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${user.contractor_id}/estimates/${estimate_id}/line-items/reorder`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!reorderResponse.ok) {
            let errorData;
            try {
                errorData = await reorderResponse.json();
            } catch (e) {
                // If response is not JSON, use status text
                errorData = { detail: reorderResponse.statusText || 'Failed to reorder line items' };
            }
            // eslint-disable-next-line no-console
            console.error('Reorder error:', {
                status: reorderResponse.status,
                statusText: reorderResponse.statusText,
                errorData,
            });
            return NextResponse.json(
                { message: errorData.detail || errorData.message || 'Failed to reorder line items' },
                { status: reorderResponse.status }
            );
        }

        const reorderedItems = await reorderResponse.json();
        return NextResponse.json(reorderedItems);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Reorder line items error:', error);
        return NextResponse.json(
            { message: 'An error occurred while reordering line items' },
            { status: 500 }
        );
    }
}

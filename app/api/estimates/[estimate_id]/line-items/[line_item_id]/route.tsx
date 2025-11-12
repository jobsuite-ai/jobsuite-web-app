import { NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ estimate_id: string; line_item_id: string }> }
) {
    try {
        const { estimate_id, line_item_id } = await params;

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

        // Get specific line item from backend
        const lineItemResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${user.contractor_id}/estimates/${estimate_id}/line-items/${line_item_id}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!lineItemResponse.ok) {
            const errorData = await lineItemResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch line item' },
                { status: lineItemResponse.status }
            );
        }

        const lineItem = await lineItemResponse.json();
        return NextResponse.json(lineItem);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get line item error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching line item' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ estimate_id: string; line_item_id: string }> }
) {
    try {
        const { estimate_id, line_item_id } = await params;

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

        // Update line item via backend API
        const updateResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${user.contractor_id}/estimates/${estimate_id}/line-items/${line_item_id}`,
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
                { message: errorData.detail || 'Failed to update line item' },
                { status: updateResponse.status }
            );
        }

        const lineItem = await updateResponse.json();
        return NextResponse.json(lineItem);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Update line item error:', error);
        return NextResponse.json(
            { message: 'An error occurred while updating line item' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ estimate_id: string; line_item_id: string }> }
) {
    try {
        const { estimate_id, line_item_id } = await params;

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

        // Delete line item via backend API
        const deleteResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${user.contractor_id}/estimates/${estimate_id}/line-items/${line_item_id}`,
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
                { message: errorData.detail || 'Failed to delete line item' },
                { status: deleteResponse.status }
            );
        }

        const result = await deleteResponse.json();
        return NextResponse.json(result);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Delete line item error:', error);
        return NextResponse.json(
            { message: 'An error occurred while deleting line item' },
            { status: 500 }
        );
    }
}

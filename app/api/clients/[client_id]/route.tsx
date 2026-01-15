import { NextResponse } from 'next/server';

import { extractBackendHeaders } from '../../utils/backendHeaders';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ client_id: string }> }
) {
    try {
        const { client_id } = await params;

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

        // Get specific client from backend
        const clientResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${user.contractor_id}/contractor_clients/${client_id}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!clientResponse.ok) {
            const errorData = await clientResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch client' },
                { status: clientResponse.status }
            );
        }

        const client = await clientResponse.json();
        const backendHeaders = extractBackendHeaders(clientResponse);

        // Return in the format expected by the frontend (wrapped in Item)
        return NextResponse.json({ Item: client }, { headers: backendHeaders });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get client error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching client' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ client_id: string }> }
) {
    try {
        const { client_id } = await params;

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

        // Update client via backend API
        const updateResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${user.contractor_id}/contractor_clients/${client_id}`,
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
                { message: errorData.detail || 'Failed to update client' },
                { status: updateResponse.status }
            );
        }

        const client = await updateResponse.json();
        const backendHeaders = extractBackendHeaders(updateResponse);
        return NextResponse.json(client, { headers: backendHeaders });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Update client error:', error);
        return NextResponse.json(
            { message: 'An error occurred while updating client' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ client_id: string }> }
) {
    try {
        const { client_id } = await params;

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

        // Delete client via backend API
        const deleteResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${user.contractor_id}/contractor_clients/${client_id}`,
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
                { message: errorData.detail || 'Failed to delete client' },
                { status: deleteResponse.status }
            );
        }

        const result = await deleteResponse.json();
        const backendHeaders = extractBackendHeaders(deleteResponse);
        return NextResponse.json(result, { headers: backendHeaders });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Delete client error:', error);
        return NextResponse.json(
            { message: 'An error occurred while deleting client' },
            { status: 500 }
        );
    }
}

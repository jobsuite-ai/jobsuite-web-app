import { NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

async function getContractorId(token: string): Promise<string> {
    const apiBaseUrl = getApiBaseUrl();
    const userResponse = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (!userResponse.ok) {
        if (userResponse.status === 401) {
            throw new Error('Invalid or expired token');
        }
        const errorData = await userResponse.json();
        throw new Error(errorData.detail || 'Failed to get user data');
    }

    const user = await userResponse.json();

    if (!user.contractor_id) {
        throw new Error('User does not have a contractor ID');
    }

    return user.contractor_id;
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ client_id: string; sub_client_id: string }> }
) {
    try {
        const { client_id, sub_client_id } = await params;

        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { message: 'Authorization header missing or invalid' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const apiBaseUrl = getApiBaseUrl();
        const contractor_id = await getContractorId(token);
        const body = await request.json();

        const response = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractor_id}/contractor_clients/${client_id}/sub_clients/${sub_client_id}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to update sub-client' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Update sub-client error:', error);
        return NextResponse.json(
            { message: error.message || 'An error occurred while updating sub-client' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ client_id: string; sub_client_id: string }> }
) {
    try {
        const { client_id, sub_client_id } = await params;

        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { message: 'Authorization header missing or invalid' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const apiBaseUrl = getApiBaseUrl();
        const contractor_id = await getContractorId(token);

        const response = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractor_id}/contractor_clients/${client_id}/sub_clients/${sub_client_id}`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to delete sub-client' },
                { status: response.status }
            );
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Delete sub-client error:', error);
        return NextResponse.json(
            { message: error.message || 'An error occurred while deleting sub-client' },
            { status: 500 }
        );
    }
}

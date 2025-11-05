import { NextResponse } from 'next/server';

const getApiBaseUrl = () => process.env.NODE_ENV === 'production'
    ? 'https://api.jobsuite.app'
    : 'https://qa.api.jobsuite.app';

export async function GET(request: Request) {
    try {
        // Get the access token from the Authorization header
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { message: 'Authorization header missing or invalid' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
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

        // Parse query parameters
        const url = new URL(request.url);
        const search = url.searchParams.get('search');

        // Build the API URL
        let clientsUrl = `${apiBaseUrl}/api/v1/contractors/${user.contractor_id}/contractor_clients`;
        const queryParams = new URLSearchParams();
        if (search) {
            queryParams.append('search', search);
        }
        if (queryParams.toString()) {
            clientsUrl += `?${queryParams.toString()}`;
        }

        // Fetch clients from backend
        const clientsResponse = await fetch(clientsUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!clientsResponse.ok) {
            const errorData = await clientsResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch clients' },
                { status: clientsResponse.status }
            );
        }

        const data = await clientsResponse.json();

        // Return in the format expected by the frontend (wrapped in Items)
        return NextResponse.json({ Items: data });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get clients error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching clients' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
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

        // Create client via backend API
        const createResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${user.contractor_id}/contractor_clients`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to create client' },
                { status: createResponse.status }
            );
        }

        const client = await createResponse.json();
        return NextResponse.json(client, { status: 201 });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Create client error:', error);
        return NextResponse.json(
            { message: 'An error occurred while creating client' },
            { status: 500 }
        );
    }
}

export async function PUT() {
    return NextResponse.json(
        { message: 'PUT method not implemented. Use PUT with client_id in path: /api/clients/[client_id]' },
        { status: 501 }
    );
}

export async function DELETE() {
    return NextResponse.json(
        { message: 'DELETE method not implemented. Use DELETE with client_id in path: /api/clients/[client_id]' },
        { status: 501 }
    );
}

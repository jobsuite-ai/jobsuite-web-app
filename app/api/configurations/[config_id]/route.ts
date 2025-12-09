import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ config_id: string }> }
) {
    try {
        const { config_id } = await params;
        // Get the access token from the Authorization header
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

        // Fetch configuration from backend
        const configResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations/${config_id}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!configResponse.ok) {
            const errorData = await configResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch configuration' },
                { status: configResponse.status }
            );
        }

        const data = await configResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get configuration error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching configuration' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ config_id: string }> }
) {
    try {
        const { config_id } = await params;
        // Get the access token from the Authorization header
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

        // Get request body
        const body = await request.json();

        // Update configuration via backend API
        const updateResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations/${config_id}`,
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
                { message: errorData.detail || 'Failed to update configuration' },
                { status: updateResponse.status }
            );
        }

        const config = await updateResponse.json();
        return NextResponse.json(config);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Update configuration error:', error);
        return NextResponse.json(
            { message: 'An error occurred while updating configuration' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ config_id: string }> }
) {
    try {
        const { config_id } = await params;
        // Get the access token from the Authorization header
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

        // Delete configuration via backend API
        const deleteResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations/${config_id}`,
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
                { message: errorData.detail || 'Failed to delete configuration' },
                { status: deleteResponse.status }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Delete configuration error:', error);
        return NextResponse.json(
            { message: 'An error occurred while deleting configuration' },
            { status: 500 }
        );
    }
}

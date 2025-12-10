import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(request: NextRequest) {
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
        const contractorId = await getContractorId(request);

        if (!contractorId) {
            return NextResponse.json(
                { message: 'Contractor ID not found' },
                { status: 400 }
            );
        }

        const apiBaseUrl = getApiBaseUrl();

        // Parse query parameters
        const url = new URL(request.url);
        const configType = url.searchParams.get('config_type');

        // Build the API URL
        let configsUrl = `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations`;
        if (configType) {
            configsUrl += `?config_type=${encodeURIComponent(configType)}`;
        }

        // Fetch configurations from backend
        const configsResponse = await fetch(configsUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!configsResponse.ok) {
            const errorData = await configsResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch configurations' },
                { status: configsResponse.status }
            );
        }

        const data = await configsResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get configurations error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching configurations' },
            { status: 500 }
        );
    }
}

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

        // Create configuration via backend API
        const createResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations`,
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
                { message: errorData.detail || 'Failed to create configuration' },
                { status: createResponse.status }
            );
        }

        const config = await createResponse.json();
        return NextResponse.json(config, { status: 201 });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Create configuration error:', error);
        return NextResponse.json(
            { message: 'An error occurred while creating configuration' },
            { status: 500 }
        );
    }
}

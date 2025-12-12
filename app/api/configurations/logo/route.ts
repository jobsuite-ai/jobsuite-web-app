import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

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

        // Get the file from the form data
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { message: 'No file provided' },
                { status: 400 }
            );
        }

        // Create form data for backend
        const backendFormData = new FormData();
        backendFormData.append('file', file);

        // Upload logo via backend API
        const uploadResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations/logo`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: backendFormData,
            }
        );

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to upload logo' },
                { status: uploadResponse.status }
            );
        }

        const data = await uploadResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Upload logo error:', error);
        return NextResponse.json(
            { message: 'An error occurred while uploading logo' },
            { status: 500 }
        );
    }
}

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

        // Get logo URL via backend API
        const logoResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations/logo`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!logoResponse.ok) {
            const errorData = await logoResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to get logo URL' },
                { status: logoResponse.status }
            );
        }

        const data = await logoResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get logo error:', error);
        return NextResponse.json(
            { message: 'An error occurred while getting logo URL' },
            { status: 500 }
        );
    }
}

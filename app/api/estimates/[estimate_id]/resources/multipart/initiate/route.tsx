import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../../../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(
    request: NextRequest,
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

        // Get contractor_id from cache (header) or fetch from API
        const contractorId = await getContractorId(request);

        if (!contractorId) {
            return NextResponse.json(
                { message: 'User does not have a contractor ID' },
                { status: 400 }
            );
        }

        // Get form data
        const formData = await request.formData();
        const filename = formData.get('filename') as string;
        const content_type = formData.get('content_type') as string;
        const resource_type = formData.get('resource_type') as string;

        if (!filename || !content_type || !resource_type) {
            return NextResponse.json(
                { message: 'filename, content_type, and resource_type are required' },
                { status: 400 }
            );
        }

        // Create form data for backend
        const backendFormData = new FormData();
        backendFormData.append('filename', filename);
        backendFormData.append('content_type', content_type);
        backendFormData.append('resource_type', resource_type);

        // Initiate multipart upload via backend API
        const initiateResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/resources/multipart/initiate`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: backendFormData,
            }
        );

        if (!initiateResponse.ok) {
            const errorData = await initiateResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to initiate multipart upload' },
                { status: initiateResponse.status }
            );
        }

        const resource = await initiateResponse.json();
        return NextResponse.json(resource);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Initiate multipart upload error:', error);
        return NextResponse.json(
            { message: 'An error occurred while initiating multipart upload' },
            { status: 500 }
        );
    }
}

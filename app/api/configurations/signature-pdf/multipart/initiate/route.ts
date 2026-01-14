import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

// Increase max duration for large file uploads
export const maxDuration = 300; // 5 minutes for large file uploads
export const runtime = 'nodejs';

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
        const type = formData.get('type') as string;

        if (!filename || !content_type || !type) {
            return NextResponse.json(
                { message: 'filename, content_type, and type are required' },
                { status: 400 }
            );
        }

        if (type !== 'license' && type !== 'insurance') {
            return NextResponse.json(
                { message: 'Invalid type. Must be "license" or "insurance"' },
                { status: 400 }
            );
        }

        // Create form data for backend
        const backendFormData = new FormData();
        backendFormData.append('filename', filename);
        backendFormData.append('content_type', content_type);
        backendFormData.append('type', type);

        // Initiate multipart upload via backend API
        const initiateResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations/signature-pdf/multipart/initiate`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: backendFormData,
            }
        );

        if (!initiateResponse.ok) {
            const errorData = await initiateResponse.json().catch(() => ({}));
            return NextResponse.json(
                { message: errorData.detail || errorData.message || 'Failed to initiate multipart upload' },
                { status: initiateResponse.status }
            );
        }

        const pdfUpload = await initiateResponse.json();
        return NextResponse.json(pdfUpload);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Initiate multipart upload error:', error);
        return NextResponse.json(
            { message: 'An error occurred while initiating multipart upload' },
            { status: 500 }
        );
    }
}

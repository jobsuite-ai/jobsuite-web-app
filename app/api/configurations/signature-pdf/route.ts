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
        const apiBaseUrl = getApiBaseUrl();

        // Get contractor_id from cache (header) or fetch from API
        const contractorId = await getContractorId(request);

        if (!contractorId) {
            return NextResponse.json(
                { message: 'User does not have a contractor ID' },
                { status: 400 }
            );
        }

        // Get form data (for file uploads)
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string;

        if (!file) {
            return NextResponse.json(
                { message: 'No file provided' },
                { status: 400 }
            );
        }

        if (!type || (type !== 'license' && type !== 'insurance')) {
            return NextResponse.json(
                { message: 'Invalid type. Must be "license" or "insurance"' },
                { status: 400 }
            );
        }

        // Create form data for backend
        const backendFormData = new FormData();
        backendFormData.append('file', file);
        backendFormData.append('type', type);

        // Upload PDF via backend API
        const uploadResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations/signature-pdf`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: backendFormData,
            }
        );

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            const errorMsg = errorData.detail || errorData.message || 'Failed to upload PDF';
            return NextResponse.json(
                { message: errorMsg },
                { status: uploadResponse.status }
            );
        }

        const data = await uploadResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Upload signature PDF error:', error);
        return NextResponse.json(
            {
                message: error instanceof Error
                    ? `An error occurred while uploading PDF: ${error.message}`
                    : 'An error occurred while uploading PDF',
            },
            { status: 500 }
        );
    }
}

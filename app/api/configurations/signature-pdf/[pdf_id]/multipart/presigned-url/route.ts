import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

// Increase max duration for large file uploads
export const maxDuration = 300; // 5 minutes for large file uploads
export const runtime = 'nodejs';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ pdf_id: string }> }
) {
    try {
        const { pdf_id } = await params;

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

        // Get part_number query parameter
        const { searchParams } = new URL(request.url);
        const partNumber = searchParams.get('part_number');

        if (!partNumber) {
            return NextResponse.json(
                { message: 'part_number query parameter is required' },
                { status: 400 }
            );
        }

        // Get presigned URL for part via backend API
        const presignedUrlResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations/signature-pdf/${pdf_id}/multipart/presigned-url?part_number=${partNumber}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!presignedUrlResponse.ok) {
            const errorData = await presignedUrlResponse.json().catch(() => ({}));
            return NextResponse.json(
                { message: errorData.detail || errorData.message || 'Failed to get presigned URL' },
                { status: presignedUrlResponse.status }
            );
        }

        const presignedUrl = await presignedUrlResponse.json();
        return NextResponse.json(presignedUrl);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get presigned URL error:', error);
        return NextResponse.json(
            { message: 'An error occurred while getting presigned URL' },
            { status: 500 }
        );
    }
}

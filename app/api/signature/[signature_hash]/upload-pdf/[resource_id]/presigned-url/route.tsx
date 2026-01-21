import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ signature_hash: string; resource_id: string }> }
) {
    try {
        const { signature_hash, resource_id } = await params;

        if (!signature_hash || !resource_id) {
            return NextResponse.json(
                { error: 'Signature hash and resource ID are required' },
                { status: 400 }
            );
        }

        // Get part_number query parameter
        const { searchParams } = new URL(request.url);
        const partNumber = searchParams.get('part_number');

        if (!partNumber) {
            return NextResponse.json(
                { error: 'part_number query parameter is required' },
                { status: 400 }
            );
        }

        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(
            `${apiBaseUrl}/api/v1/signature/${signature_hash}/upload-pdf/${resource_id}/presigned-url?part_number=${partNumber}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                detail: 'Failed to get presigned URL',
            }));
            return NextResponse.json(
                { error: errorData.detail || 'Failed to get presigned URL' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Error getting presigned URL:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred while getting presigned URL' },
            { status: 500 }
        );
    }
}

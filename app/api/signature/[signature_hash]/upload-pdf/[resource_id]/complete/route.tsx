import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(
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

        const body = await request.json();

        if (!body.parts || !Array.isArray(body.parts)) {
            return NextResponse.json(
                { error: 'parts array is required' },
                { status: 400 }
            );
        }

        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(
            `${apiBaseUrl}/api/v1/signature/${signature_hash}/upload-pdf/${resource_id}/complete`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                detail: 'Failed to complete PDF upload',
            }));
            return NextResponse.json(
                { error: errorData.detail || 'Failed to complete PDF upload' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Error completing PDF upload:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred while completing PDF upload' },
            { status: 500 }
        );
    }
}

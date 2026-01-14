import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ signature_hash: string }> }
) {
    try {
        const { signature_hash } = await params;

        if (!signature_hash) {
            return NextResponse.json(
                { error: 'Signature hash is required' },
                { status: 400 }
            );
        }

        const formData = await request.formData();

        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(
            `${apiBaseUrl}/api/v1/signature/${signature_hash}/upload-pdf/initiate`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                detail: 'Failed to initiate PDF upload',
            }));
            return NextResponse.json(
                { error: errorData.detail || 'Failed to initiate PDF upload' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Error initiating PDF upload:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred while initiating PDF upload' },
            { status: 500 }
        );
    }
}

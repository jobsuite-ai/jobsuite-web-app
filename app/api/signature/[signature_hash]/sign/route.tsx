import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(
    request: NextRequest,
    { params }: { params: { signature_hash: string } }
) {
    try {
        const { signature_hash } = params;

        if (!signature_hash) {
            return NextResponse.json(
                { error: 'Signature hash is required' },
                { status: 400 }
            );
        }

        const body = await request.json();

        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(
            `${apiBaseUrl}/api/v1/signature/${signature_hash}/sign`,
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
                detail: 'Failed to submit signature',
            }));
            return NextResponse.json(
                { error: errorData.detail || 'Failed to submit signature' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Error submitting signature:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred while submitting signature' },
            { status: 500 }
        );
    }
}

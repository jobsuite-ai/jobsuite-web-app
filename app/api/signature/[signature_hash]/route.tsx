import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(
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

        const apiBaseUrl = getApiBaseUrl();
        // eslint-disable-next-line no-console
        console.log(`Fetching signature link from: ${apiBaseUrl}/api/v1/signature/${signature_hash}`);

        const response = await fetch(
            `${apiBaseUrl}/api/v1/signature/${signature_hash}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
            }
            // eslint-disable-next-line no-console
            console.error('Backend error:', errorData);
            return NextResponse.json(
                { error: errorData.detail || errorData.error || 'Failed to fetch signature link info' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Error fetching signature link info:', error);
        // eslint-disable-next-line no-console
        console.error('Error stack:', error.stack);
        return NextResponse.json(
            {
                error: error.message || 'An error occurred while fetching signature link info',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}

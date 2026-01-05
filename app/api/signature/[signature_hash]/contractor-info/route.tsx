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
        const response = await fetch(
            `${apiBaseUrl}/api/v1/signature/${signature_hash}/contractor-info`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                detail: 'Failed to fetch contractor info',
            }));
            return NextResponse.json(
                { error: errorData.detail || 'Failed to fetch contractor info' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Error fetching contractor info:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred while fetching contractor info' },
            { status: 500 }
        );
    }
}

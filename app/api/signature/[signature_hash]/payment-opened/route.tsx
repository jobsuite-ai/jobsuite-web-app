import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

/**
 * Public endpoint: record when the client opens the Payment tab on the sign page
 * (creates a system activity comment on the estimate).
 */
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

        const apiBaseUrl = getApiBaseUrl({ request });
        const authHeader = request.headers.get('Authorization');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (authHeader) {
            headers.Authorization = authHeader;
        }

        const response = await fetch(
            `${apiBaseUrl}/api/v1/signature/${signature_hash}/payment-opened`,
            {
                method: 'POST',
                headers,
            }
        );

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { detail: `HTTP ${response.status}` };
            }
            return NextResponse.json(
                {
                    error:
                        errorData.detail ||
                        errorData.error ||
                        'Failed to record payment tab activity',
                },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

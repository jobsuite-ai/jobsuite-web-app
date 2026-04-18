import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

/**
 * Public endpoint: create Helcim checkout session for deposit/balance.
 * Used when the client pays from the sign page (no auth).
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ signature_hash: string }> }
) {
    try {
        const { signature_hash } = await params;
        if (!signature_hash) {
            return NextResponse.json(
                { message: 'signature_hash is required' },
                { status: 400 }
            );
        }
        const body = await request.json();
        const apiBaseUrl = getApiBaseUrl({ request });
        const res = await fetch(
            `${apiBaseUrl}/api/v1/signature/${signature_hash}/helcim/checkout-session`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return NextResponse.json(
                { message: err.detail || 'Failed to create checkout session' },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Public Helcim checkout session error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

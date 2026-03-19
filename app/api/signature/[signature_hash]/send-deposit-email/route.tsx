import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

/**
 * Public endpoint: send deposit request email to the client.
 * Used when the client clicks "Pay later" on the sign page (no auth).
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
        const apiBaseUrl = getApiBaseUrl();
        const res = await fetch(
            `${apiBaseUrl}/api/v1/signature/${signature_hash}/send-deposit-email`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return NextResponse.json(
                { message: err.detail || 'Failed to send deposit email' },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Send deposit email (public) error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

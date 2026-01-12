import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ estimate_id: string }> }
) {
    try {
        const { estimate_id } = await params;

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

        const body = await request.json();

        // First, get or create a signature link for the contractor
        // We'll use the contractor's email or generate a link
        // For now, let's create a signature link for the contractor
        const linkResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/signature-links`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_email: body.signer_email || body.email,
                    expires_in_days: 30,
                }),
            }
        );

        if (!linkResponse.ok) {
            const errorData = await linkResponse.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.detail || 'Failed to create signature link' },
                { status: linkResponse.status }
            );
        }

        const linkData = await linkResponse.json();
        const signatureHash = linkData.signature_hash;

        // Now submit the signature using the hash
        const signatureResponse = await fetch(
            `${apiBaseUrl}/api/v1/signature/${signatureHash}/sign`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    signature_type: 'CONTRACTOR',
                    signature_data: body.signature_data,
                    signer_name: body.signer_name,
                    signer_email: body.signer_email || body.email,
                    consent_given: body.consent_given || true,
                    device_info: body.device_info || navigator.userAgent,
                }),
            }
        );

        if (!signatureResponse.ok) {
            const errorData = await signatureResponse.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.detail || 'Failed to submit signature' },
                { status: signatureResponse.status }
            );
        }

        const signatureData = await signatureResponse.json();
        return NextResponse.json(signatureData);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Error submitting contractor signature:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred while submitting signature' },
            { status: 500 }
        );
    }
}

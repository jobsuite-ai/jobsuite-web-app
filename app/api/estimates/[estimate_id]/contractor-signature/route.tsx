import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';
import { pickSignatureHashFromAudit } from '@/utils/signatureLinkAudit';

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

        let signatureHash: string | undefined =
            typeof body.signature_hash === 'string' ? body.signature_hash : undefined;

        if (!signatureHash) {
            const auditResponse = await fetch(
                `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/signatures`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!auditResponse.ok) {
                const errorData = await auditResponse.json().catch(() => ({}));
                return NextResponse.json(
                    { error: errorData.detail || 'Failed to load signature audit' },
                    { status: auditResponse.status }
                );
            }

            const audit = (await auditResponse.json()) as {
                signature_links?: Array<{
                    signature_hash: string;
                    client_email?: string;
                    status: string;
                }>;
            };

            const signerEmail = body.signer_email || body.email;
            signatureHash =
                audit.signature_links?.find((l) => l.client_email === signerEmail)
                    ?.signature_hash ??
                pickSignatureHashFromAudit(audit.signature_links, undefined) ??
                undefined;
        }

        if (!signatureHash) {
            return NextResponse.json(
                {
                    error:
                        'No signature link found. Send the estimate to the client first; the same link is used for contractor signing.',
                },
                { status: 400 }
            );
        }

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
                    device_info: body.device_info || 'jobsuite-web-app',
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

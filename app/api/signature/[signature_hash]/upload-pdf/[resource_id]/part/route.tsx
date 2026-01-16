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

        // Get form data with part_number and file
        const formData = await request.formData();
        const partNumber = formData.get('part_number');
        const file = formData.get('file') as File;

        if (!partNumber || !file) {
            return NextResponse.json(
                { error: 'Part number and file are required' },
                { status: 400 }
            );
        }

        // Create form data for backend
        const backendFormData = new FormData();
        backendFormData.append('part_number', partNumber.toString());
        backendFormData.append('file', file);

        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(
            `${apiBaseUrl}/api/v1/signature/${signature_hash}/upload-pdf/${resource_id}/part`,
            {
                method: 'POST',
                body: backendFormData,
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                detail: 'Failed to upload PDF part',
            }));
            return NextResponse.json(
                { error: errorData.detail || 'Failed to upload PDF part' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Error uploading PDF part:', error);
        return NextResponse.json(
            { error: error.message || 'An error occurred while uploading PDF part' },
            { status: 500 }
        );
    }
}

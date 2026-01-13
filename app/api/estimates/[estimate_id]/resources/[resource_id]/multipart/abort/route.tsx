import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../../../../../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ estimate_id: string; resource_id: string }> }
) {
    try {
        const { estimate_id, resource_id } = await params;

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

        // Abort multipart upload via backend API
        const abortResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/resources/${resource_id}/multipart/abort`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!abortResponse.ok) {
            const errorData = await abortResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to abort multipart upload' },
                { status: abortResponse.status }
            );
        }

        const resource = await abortResponse.json();
        return NextResponse.json(resource);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Abort multipart upload error:', error);
        return NextResponse.json(
            { message: 'An error occurred while aborting multipart upload' },
            { status: 500 }
        );
    }
}

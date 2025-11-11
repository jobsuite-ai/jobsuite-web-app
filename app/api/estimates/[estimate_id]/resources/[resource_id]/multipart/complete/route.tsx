import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../../../../../utils/getContractorId';

const getApiBaseUrl = () => process.env.NODE_ENV === 'production'
    ? 'https://api.jobsuite.app'
    : 'https://qa.api.jobsuite.app';

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

        // Get request body
        const body = await request.json();

        if (!body.parts || !Array.isArray(body.parts)) {
            return NextResponse.json(
                { message: 'parts array is required' },
                { status: 400 }
            );
        }

        // Complete multipart upload via backend API
        const completeResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/resources/${resource_id}/multipart/complete`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!completeResponse.ok) {
            const errorData = await completeResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to complete multipart upload' },
                { status: completeResponse.status }
            );
        }

        const resource = await completeResponse.json();
        return NextResponse.json(resource);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Complete multipart upload error:', error);
        return NextResponse.json(
            { message: 'An error occurred while completing multipart upload' },
            { status: 500 }
        );
    }
}

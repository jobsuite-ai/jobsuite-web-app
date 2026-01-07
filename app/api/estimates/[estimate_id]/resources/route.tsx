import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

// Increase max duration and allow larger body sizes for file uploads
export const maxDuration = 300; // 5 minutes for large file uploads
export const runtime = 'nodejs';

export async function GET(
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

        // Get resource_type query parameter if provided
        const { searchParams } = new URL(request.url);
        const resourceType = searchParams.get('resource_type');

        // Build URL with optional resource_type filter
        let url = `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/resources`;
        if (resourceType) {
            url += `?resource_type=${resourceType}`;
        }

        // Get resources from backend
        const resourcesResponse = await fetch(
            url,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!resourcesResponse.ok) {
            const errorData = await resourcesResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch resources' },
                { status: resourcesResponse.status }
            );
        }

        const resources = await resourcesResponse.json();
        return NextResponse.json(resources);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get resources error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching resources' },
            { status: 500 }
        );
    }
}

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

        // Get form data (for file uploads)
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const resourceType = formData.get('resource_type') as string;

        if (!file || !resourceType) {
            return NextResponse.json(
                { message: 'File and resource_type are required' },
                { status: 400 }
            );
        }

        // Create form data for backend
        const backendFormData = new FormData();
        backendFormData.append('file', file);
        backendFormData.append('resource_type', resourceType);

        // Upload resource via backend API
        const uploadResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/resources`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: backendFormData,
            }
        );

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to upload resource' },
                { status: uploadResponse.status }
            );
        }

        const resource = await uploadResponse.json();
        return NextResponse.json(resource);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Upload resource error:', error);
        return NextResponse.json(
            { message: 'An error occurred while uploading resource' },
            { status: 500 }
        );
    }
}

export async function DELETE(
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

        // Delete all resources via backend API
        const deleteResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/resources`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to delete resources' },
                { status: deleteResponse.status }
            );
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Delete resources error:', error);
        return NextResponse.json(
            { message: 'An error occurred while deleting resources' },
            { status: 500 }
        );
    }
}

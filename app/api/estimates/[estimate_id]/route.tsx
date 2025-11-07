import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../utils/getContractorId';

const getApiBaseUrl = () => process.env.NODE_ENV === 'production'
    ? 'https://api.jobsuite.app'
    : 'https://qa.api.jobsuite.app';

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

        // Get specific estimate from backend
        const estimateResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!estimateResponse.ok) {
            const errorData = await estimateResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch estimate' },
                { status: estimateResponse.status }
            );
        }

        const estimate = await estimateResponse.json();
        return NextResponse.json(estimate);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get estimate error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching estimate' },
            { status: 500 }
        );
    }
}

export async function PUT(
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

        // Get request body
        const body = await request.json();

        // Update estimate via backend API
        const updateResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to update estimate' },
                { status: updateResponse.status }
            );
        }

        const estimate = await updateResponse.json();
        return NextResponse.json(estimate);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Update estimate error:', error);
        return NextResponse.json(
            { message: 'An error occurred while updating estimate' },
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

        // Delete estimate via backend API
        const deleteResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}`,
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
                { message: errorData.detail || 'Failed to delete estimate' },
                { status: deleteResponse.status }
            );
        }

        const result = await deleteResponse.json();
        return NextResponse.json(result);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Delete estimate error:', error);
        return NextResponse.json(
            { message: 'An error occurred while deleting estimate' },
            { status: 500 }
        );
    }
}

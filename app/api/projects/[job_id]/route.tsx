import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../utils/getContractorId';

const getApiBaseUrl = () => process.env.NODE_ENV === 'production'
    ? 'https://api.jobsuite.app'
    : 'https://qa.api.jobsuite.app';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ job_id: string }> }
) {
    try {
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
        const { job_id } = await params;

        // Get contractor_id from cache (header) or fetch from API
        const contractorId = await getContractorId(request);

        if (!contractorId) {
            return NextResponse.json(
                { message: 'User does not have a contractor ID' },
                { status: 400 }
            );
        }

        // Get job from backend
        const jobResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/jobs/${job_id}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!jobResponse.ok) {
            const errorData = await jobResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch job' },
                { status: jobResponse.status }
            );
        }

        const job = await jobResponse.json();
        return NextResponse.json(job);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get job error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching job' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ job_id: string }> }
) {
    try {
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
        const { job_id } = await params;

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

        // Update job via backend API
        const updateResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/jobs/${job_id}`,
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
                { message: errorData.detail || 'Failed to update job' },
                { status: updateResponse.status }
            );
        }

        const job = await updateResponse.json();
        return NextResponse.json(job);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Update job error:', error);
        return NextResponse.json(
            { message: 'An error occurred while updating job' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ job_id: string }> }
) {
    try {
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
        const { job_id } = await params;

        // Get contractor_id from cache (header) or fetch from API
        const contractorId = await getContractorId(request);

        if (!contractorId) {
            return NextResponse.json(
                { message: 'User does not have a contractor ID' },
                { status: 400 }
            );
        }

        // Delete job via backend API
        const deleteResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/jobs/${job_id}`,
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
                { message: errorData.detail || 'Failed to delete job' },
                { status: deleteResponse.status }
            );
        }

        const result = await deleteResponse.json();
        return NextResponse.json(result);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Delete job error:', error);
        return NextResponse.json(
            { message: 'An error occurred while deleting job' },
            { status: 500 }
        );
    }
}

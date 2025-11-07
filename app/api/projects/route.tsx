import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../utils/getContractorId';

const getApiBaseUrl = () => process.env.NODE_ENV === 'production'
    ? 'https://api.jobsuite.app'
    : 'https://qa.api.jobsuite.app';

export async function GET(request: NextRequest) {
    try {
        // Get the access token from the Authorization header
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { message: 'Authorization header missing or invalid' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const apiBaseUrl = getApiBaseUrl();

        // Get contractor_id from cache (header) or fetch from API
        const contractorId = await getContractorId(request);

        if (!contractorId) {
            return NextResponse.json(
                { message: 'User does not have a contractor ID' },
                { status: 400 }
            );
        }

        // Parse query parameters
        const url = new URL(request.url);
        const clientId = url.searchParams.get('client_id');
        const status = url.searchParams.get('status');

        // Build the API URL
        let jobsUrl = `${apiBaseUrl}/api/v1/contractors/${contractorId}/jobs`;
        const queryParams = new URLSearchParams();
        if (clientId) {
            queryParams.append('client_id', clientId);
        }
        if (status) {
            queryParams.append('status', status);
        }
        if (queryParams.toString()) {
            jobsUrl += `?${queryParams.toString()}`;
        }

        // Fetch jobs from backend
        const jobsResponse = await fetch(jobsUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!jobsResponse.ok) {
            const errorData = await jobsResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch jobs' },
                { status: jobsResponse.status }
            );
        }

        const jobs = await jobsResponse.json();

        // Return in the format expected by the frontend (wrapped in Items)
        return NextResponse.json({ Items: jobs });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get jobs error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching jobs' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
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

        // Create job via backend API
        const createResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/jobs`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to create job' },
                { status: createResponse.status }
            );
        }

        const job = await createResponse.json();
        return NextResponse.json(job, { status: 201 });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Create job error:', error);
        return NextResponse.json(
            { message: 'An error occurred while creating job' },
            { status: 500 }
        );
    }
}

export async function PUT() {
    return NextResponse.json(
        { message: 'PUT method not implemented. Use PUT with job_id in path: /api/jobs/[job_id]' },
        { status: 501 }
    );
}

export async function DELETE() {
    return NextResponse.json(
        { message: 'DELETE method not implemented. Use DELETE with job_id in path: /api/jobs/[job_id]' },
        { status: 501 }
    );
}

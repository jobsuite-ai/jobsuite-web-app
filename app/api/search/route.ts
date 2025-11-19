import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';
import { getContractorId } from '@/app/api/utils/getContractorId';

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

        // Parse query parameters
        const url = new URL(request.url);
        const query = url.searchParams.get('q');
        const limit = url.searchParams.get('limit') || '50';

        if (!query || query.trim().length === 0) {
            return NextResponse.json(
                { message: 'Search query parameter "q" is required' },
                { status: 400 }
            );
        }

        // Build the search API URL
        const searchUrl = `${apiBaseUrl}/api/v1/contractors/${contractorId}/search?q=${encodeURIComponent(query)}&limit=${limit}`;

        // Fetch search results from backend
        const searchResponse = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!searchResponse.ok) {
            const errorData = await searchResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to perform search' },
                { status: searchResponse.status }
            );
        }

        const data = await searchResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Search error:', error);
        return NextResponse.json(
            { message: 'An error occurred while performing search' },
            { status: 500 }
        );
    }
}


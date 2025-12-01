import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

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

        // Get users for the contractor from backend
        const usersResponse = await fetch(
            `${apiBaseUrl}/api/v1/users/contractor/${contractorId}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!usersResponse.ok) {
            const errorData = await usersResponse.json().catch(() => ({}));
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch users' },
                { status: usersResponse.status }
            );
        }

        const users = await usersResponse.json();
        return NextResponse.json(users);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching users' },
            { status: 500 }
        );
    }
}

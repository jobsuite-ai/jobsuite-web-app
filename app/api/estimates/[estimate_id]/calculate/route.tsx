import { NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(
    request: Request,
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

        // Get user info to obtain contractor_id
        const userResponse = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!userResponse.ok) {
            if (userResponse.status === 401) {
                return NextResponse.json(
                    { message: 'Invalid or expired token' },
                    { status: 401 }
                );
            }
            const errorData = await userResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to get user data' },
                { status: userResponse.status }
            );
        }

        const user = await userResponse.json();

        if (!user.contractor_id) {
            return NextResponse.json(
                { message: 'User does not have a contractor ID' },
                { status: 400 }
            );
        }

        // Calculate estimate totals via backend API
        const calculateResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${user.contractor_id}/estimates/${estimate_id}/calculate`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!calculateResponse.ok) {
            const errorData = await calculateResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to calculate estimate totals' },
                { status: calculateResponse.status }
            );
        }

        const estimate = await calculateResponse.json();
        return NextResponse.json(estimate);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Calculate estimate error:', error);
        return NextResponse.json(
            { message: 'An error occurred while calculating estimate totals' },
            { status: 500 }
        );
    }
}

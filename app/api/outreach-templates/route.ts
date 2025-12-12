import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { message: 'Authorization header missing or invalid' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const contractorId = await getContractorId(request);

        if (!contractorId) {
            return NextResponse.json(
                { message: 'Contractor ID not found' },
                { status: 400 }
            );
        }

        const apiBaseUrl = getApiBaseUrl();

        // Fetch templates from backend
        const templatesResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/outreach-templates`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!templatesResponse.ok) {
            const errorData = await templatesResponse.json();
            return NextResponse.json(
                { message: errorData.detail || 'Failed to fetch templates' },
                { status: templatesResponse.status }
            );
        }

        const data = await templatesResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get templates error:', error);
        return NextResponse.json(
            { message: 'An error occurred while fetching templates' },
            { status: 500 }
        );
    }
}

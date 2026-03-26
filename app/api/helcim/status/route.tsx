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
                { message: 'User does not have a contractor ID' },
                { status: 400 }
            );
        }
        const apiBaseUrl = getApiBaseUrl();
        const res = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/helcim/status`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return NextResponse.json(
                { message: err.detail || 'Failed to fetch Helcim status' },
                { status: res.status }
            );
        }
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Helcim status error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

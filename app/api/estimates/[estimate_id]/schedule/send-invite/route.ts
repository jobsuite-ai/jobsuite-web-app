import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ estimate_id: string }> }
) {
    try {
        const { estimate_id } = await params;
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Authorization header missing or invalid' }, { status: 401 });
        }
        const token = authHeader.substring(7);
        const contractorId = await getContractorId(request);
        if (!contractorId) {
            return NextResponse.json({ message: 'User does not have a contractor ID' }, { status: 400 });
        }
        const body = await request.json().catch(() => ({}));
        const apiBaseUrl = getApiBaseUrl({ request });
        const res = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/${estimate_id}/schedule/send-invite`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json(
                { message: data.detail || data.message || 'Failed to send invite' },
                { status: res.status }
            );
        }
        return NextResponse.json(data);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('send-invite', e);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

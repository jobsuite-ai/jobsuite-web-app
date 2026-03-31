import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Authorization header missing or invalid' }, { status: 401 });
        }
        const token = authHeader.substring(7);
        const contractorId = await getContractorId(request);
        if (!contractorId) {
            return NextResponse.json({ message: 'User does not have a contractor ID' }, { status: 400 });
        }
        const url = new URL(request.url);
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        const teamId = url.searchParams.get('team_id');
        if (!from || !to) {
            return NextResponse.json({ message: 'from and to query params required (YYYY-MM-DD)' }, { status: 400 });
        }
        const qs = new URLSearchParams({ from, to });
        if (teamId) qs.set('team_id', teamId);
        const apiBaseUrl = getApiBaseUrl();
        const res = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/schedule/calendar?${qs.toString()}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json(
                { message: data.detail || data.message || 'Failed to load calendar' },
                { status: res.status }
            );
        }
        return NextResponse.json(data);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('schedule calendar', e);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

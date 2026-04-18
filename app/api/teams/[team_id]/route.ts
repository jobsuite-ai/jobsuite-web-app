import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ team_id: string }> }
) {
    try {
        const { team_id } = await params;
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Authorization header missing or invalid' }, { status: 401 });
        }
        const token = authHeader.substring(7);
        const contractorId = await getContractorId(request);
        if (!contractorId) {
            return NextResponse.json({ message: 'User does not have a contractor ID' }, { status: 400 });
        }
        const apiBaseUrl = getApiBaseUrl({ request });
        const res = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/teams/${team_id}`,
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
                { message: data.detail || data.message || 'Failed to load team' },
                { status: res.status }
            );
        }
        return NextResponse.json(data);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('team GET', e);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ team_id: string }> }
) {
    try {
        const { team_id } = await params;
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Authorization header missing or invalid' }, { status: 401 });
        }
        const token = authHeader.substring(7);
        const contractorId = await getContractorId(request);
        if (!contractorId) {
            return NextResponse.json({ message: 'User does not have a contractor ID' }, { status: 400 });
        }
        const body = await request.json();
        const apiBaseUrl = getApiBaseUrl({ request });
        const res = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/teams/${team_id}`,
            {
                method: 'PUT',
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
                { message: data.detail || data.message || 'Failed to update team' },
                { status: res.status }
            );
        }
        return NextResponse.json(data);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('team PUT', e);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ team_id: string }> }
) {
    try {
        const { team_id } = await params;
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Authorization header missing or invalid' }, { status: 401 });
        }
        const token = authHeader.substring(7);
        const contractorId = await getContractorId(request);
        if (!contractorId) {
            return NextResponse.json({ message: 'User does not have a contractor ID' }, { status: 400 });
        }
        const apiBaseUrl = getApiBaseUrl({ request });
        const res = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/teams/${team_id}`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return NextResponse.json(
                { message: data.detail || data.message || 'Failed to delete team' },
                { status: res.status }
            );
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('team DELETE', e);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

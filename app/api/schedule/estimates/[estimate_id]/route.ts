import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ estimate_id: string }> }
) {
  try {
    const { estimate_id } = await params;
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
    const body = await request.json();
    const apiBaseUrl = getApiBaseUrl();
    const res = await fetch(
      `${apiBaseUrl}/api/v1/contractors/${contractorId}/schedule`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...body, estimate_id }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { message: data.detail || data.message || 'Failed to assign schedule' },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('schedule assign error:', error);
    return NextResponse.json(
      { message: 'An error occurred while assigning schedule' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ estimate_id: string }> }
) {
  try {
    const { estimate_id } = await params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization header missing or invalid' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const contractorId = await getContractorId(request);
    if (!contractorId) {
      return NextResponse.json({ message: 'User does not have a contractor ID' }, { status: 400 });
    }
    const apiBaseUrl = getApiBaseUrl();
    const res = await fetch(
      `${apiBaseUrl}/api/v1/contractors/${contractorId}/schedule/estimates/${estimate_id}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ message: data.detail || data.message || 'Failed to list schedule events' }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('schedule list error:', error);
    return NextResponse.json({ message: 'An error occurred while listing schedule events' }, { status: 500 });
  }
}

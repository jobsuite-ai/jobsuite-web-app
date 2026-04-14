import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ schedule_id: string }> }
) {
  try {
    const { schedule_id } = await params;
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
    const apiBaseUrl = getApiBaseUrl();
    const res = await fetch(`${apiBaseUrl}/api/v1/contractors/${contractorId}/schedule/${schedule_id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: 'An error occurred while updating schedule event' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schedule_id: string }> }
) {
  try {
    const { schedule_id } = await params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization header missing or invalid' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const contractorId = await getContractorId(request);
    if (!contractorId) {
      return NextResponse.json({ message: 'User does not have a contractor ID' }, { status: 400 });
    }
    const apiBaseUrl = getApiBaseUrl();
    const res = await fetch(`${apiBaseUrl}/api/v1/contractors/${contractorId}/schedule/${schedule_id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ message: data.detail || data.message || 'Failed to delete schedule event' }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: 'An error occurred while deleting schedule event' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
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
      `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates/time-entry-eligible`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      return NextResponse.json(
        { message: (data as { detail?: string }).detail || 'Failed to load jobs' },
        { status: res.status }
      );
    }
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Authorization header missing or invalid' }, { status: 401 });
  }

  const contractorId = await getContractorId(request);
  if (!contractorId) {
    return NextResponse.json({ message: 'Contractor ID not found' }, { status: 400 });
  }

  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(
    `${apiBaseUrl}/api/v1/contractors/${contractorId}/notifications/device-token`,
    {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    // If backend doesn't support this or user has no access, just treat as "no device".
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  const data = await response.json().catch(() => ({ count: 0 }));
  const count = typeof data?.count === 'number' ? data.count : 0;
  return NextResponse.json({ count }, { status: 200 });
}

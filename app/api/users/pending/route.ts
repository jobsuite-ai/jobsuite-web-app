import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }

    const contractorId = await getContractorId(request);

    if (!contractorId) {
      return NextResponse.json(
        { message: 'User does not have a contractor ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const apiBaseUrl = getApiBaseUrl();

    const usersResponse = await fetch(
      `${apiBaseUrl}/api/v1/users/contractor/${contractorId}/pending`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await usersResponse.json().catch(() => ({}));

    if (!usersResponse.ok) {
      return NextResponse.json(
        { message: data.detail || data.message || 'Failed to create employee' },
        { status: usersResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating pending employee:', error);
    return NextResponse.json(
      { message: 'An error occurred while creating the employee' },
      { status: 500 }
    );
  }
}

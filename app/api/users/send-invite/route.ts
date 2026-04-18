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
    const apiBaseUrl = getApiBaseUrl({ request });

    const payload = {
      email: body.email,
      full_name: body.full_name,
      role: body.role,
      contractor_id: contractorId,
    };

    const usersResponse = await fetch(`${apiBaseUrl}/api/v1/users/send-signup-email`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await usersResponse.json().catch(() => ({}));

    if (!usersResponse.ok) {
      return NextResponse.json(
        { message: data.detail || data.message || 'Failed to send invite email' },
        { status: usersResponse.status }
      );
    }

    return NextResponse.json({ ok: true, token: data });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error sending signup email:', error);
    return NextResponse.json(
      { message: 'An error occurred while sending the invite' },
      { status: 500 }
    );
  }
}

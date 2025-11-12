import { NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          message: data.message || data.detail || 'Failed to send password reset email',
          error: 'REQUEST_ERROR',
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: 'An error occurred while requesting password reset' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';

import { getApiBaseUrl } from '../utils/serviceAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { message: 'Token and password are required' },
        { status: 400 }
      );
    }

    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/create-user-from-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, password }),
    });

    // Get the raw text first to check what we're receiving
    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      // If we get a 500 error with plain text, return a more specific error message
      if (response.status === 500) {
        // Check if the error is an EmailTokenVerificationError
        if (rawText.includes('EmailTokenVerificationError')) {
          return NextResponse.json(
            {
              message: 'Invalid or expired invitation token',
              details: rawText,
              error: 'TOKEN_VERIFICATION_ERROR',
            },
            { status: 400 }
          );
        }
        return NextResponse.json(
          {
            message: 'Backend server error occurred',
            details: rawText,
            error: 'BACKEND_ERROR',
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          message: 'Invalid response from server',
          rawResponse: rawText,
          error: 'INVALID_RESPONSE',
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      // Handle validation errors (422)
      if (response.status === 422 && data.detail) {
        return NextResponse.json(
          {
            message: data.detail[0]?.msg || 'Invalid password format',
            error: 'VALIDATION_ERROR',
          },
          { status: 422 }
        );
      }

      // Handle other errors
      return NextResponse.json(
        {
          message: data.message || `Failed to create user: ${data.error}`,
          error: 'REQUEST_ERROR',
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { message: 'An error occurred while accepting the invitation' },
      { status: 500 }
    );
  }
}

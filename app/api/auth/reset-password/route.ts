import { NextResponse } from 'next/server';

const getApiBaseUrl = () => process.env.NODE_ENV === 'production'
    ? 'https://api.jobsuite.app'
    : 'https://qa.api.jobsuite.app';

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
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/reset-password`, {
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
      // If we get an error with plain text, return a more specific error message
      if (response.status === 500) {
        // Check if the error is a PasswordResetTokenVerificationError
        if (rawText.includes('PasswordResetTokenVerificationError')) {
          return NextResponse.json(
            {
              message: 'Invalid or expired password reset token',
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
          message: data.message || data.detail || `Failed to reset password: ${data.error}`,
          error: 'REQUEST_ERROR',
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'An error occurred while resetting the password' },
      { status: 500 }
    );
  }
}
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes

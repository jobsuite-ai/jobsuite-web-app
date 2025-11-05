import { NextResponse } from 'next/server';

const getApiBaseUrl = () => process.env.NODE_ENV === 'production'
    ? 'https://api.jobsuite.app'
    : 'https://qa.api.jobsuite.app';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password: encryptedPassword, remember_me } = body;

    if (!email || !encryptedPassword) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', email);
    formData.append('password', encryptedPassword);
    formData.append('scope', '');
    formData.append('client_id', 'string');
    formData.append('client_secret', 'string');

    const apiBaseUrl = getApiBaseUrl();
    // Add remember_me as query parameter
    const rememberMeParam = remember_me ? '?remember_me=true' : '';
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/login${rememberMeParam}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || `Login failed: ${data.error}` },
        { status: response.status }
      );
    }

    // Return the token and any other necessary data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

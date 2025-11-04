import { NextResponse } from 'next/server';

const getApiBaseUrl = () => {
  return process.env.NODE_ENV === 'production'
    ? 'https://api.jobsuite.app'
    : 'https://qa.api.jobsuite.app';
};

export async function GET(request: Request) {
  try {
    // Get the access token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const apiBaseUrl = getApiBaseUrl();
    
    // Get full user info from /users/me
    const userResponse = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        return NextResponse.json(
          { message: 'Invalid or expired token' },
          { status: 401 }
        );
      }
      const errorData = await userResponse.json();
      return NextResponse.json(
        { message: errorData.detail || 'Failed to get user data' },
        { status: userResponse.status }
      );
    }

    const user = await userResponse.json();

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching user information' },
      { status: 500 }
    );
  }
}

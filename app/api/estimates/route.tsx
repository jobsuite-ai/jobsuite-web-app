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
    
    // Get user info to obtain contractor_id
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

    if (!user.contractor_id) {
      return NextResponse.json(
        { message: 'User does not have a contractor ID' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id');
    const status = url.searchParams.get('status'); // Note: backend only accepts single status

    // Build the API URL
    let estimatesUrl = `${apiBaseUrl}/api/v1/contractors/${user.contractor_id}/estimates`;
    const queryParams = new URLSearchParams();
    if (clientId) {
      queryParams.append('client_id', clientId);
    }
    if (status) {
      queryParams.append('status', status);
    }
    if (queryParams.toString()) {
      estimatesUrl += `?${queryParams.toString()}`;
    }

    // Fetch estimates from backend
    const estimatesResponse = await fetch(estimatesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!estimatesResponse.ok) {
      const errorData = await estimatesResponse.json();
      return NextResponse.json(
        { message: errorData.detail || 'Failed to fetch estimates' },
        { status: estimatesResponse.status }
      );
    }

    const estimates = await estimatesResponse.json();

    // Return in the format expected by the frontend (wrapped in Items)
    return NextResponse.json({ Items: estimates });
  } catch (error) {
    console.error('Get estimates error:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching estimates' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Get the access token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const apiBaseUrl = getApiBaseUrl();
    
    // Get user info to obtain contractor_id
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

    if (!user.contractor_id) {
      return NextResponse.json(
        { message: 'User does not have a contractor ID' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();

    // Create estimate via backend API
    const createResponse = await fetch(
      `${apiBaseUrl}/api/v1/contractors/${user.contractor_id}/estimates`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      return NextResponse.json(
        { message: errorData.detail || 'Failed to create estimate' },
        { status: createResponse.status }
      );
    }

    const estimate = await createResponse.json();
    return NextResponse.json(estimate, { status: 201 });
  } catch (error) {
    console.error('Create estimate error:', error);
    return NextResponse.json(
      { message: 'An error occurred while creating estimate' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  return NextResponse.json({ message: 'PUT method not implemented. Use POST with estimate_id in path' }, { status: 501 });
}

export async function DELETE(request: Request) {
  return NextResponse.json({ message: 'DELETE method not implemented. Use DELETE with estimate_id in path' }, { status: 501 });
}

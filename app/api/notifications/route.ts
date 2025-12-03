import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function GET(request: NextRequest) {
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

    // Get contractor_id from cache (header) or fetch from API
    const contractorId = await getContractorId(request);

    if (!contractorId) {
      return NextResponse.json(
        { message: 'User does not have a contractor ID' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');

    // Build query parameters for the job engine API
    const queryParams = new URLSearchParams();
    if (limit) {
      queryParams.append('limit', limit);
    }

    const queryString = queryParams.toString();
    const url = `${apiBaseUrl}/api/v1/contractors/${contractorId}/notifications${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.detail || 'Failed to fetch notifications' },
        { status: response.status }
      );
    }

    const notifications = await response.json();
    return NextResponse.json(notifications);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching notifications' },
      { status: 500 }
    );
  }
}

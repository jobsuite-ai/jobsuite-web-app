import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../../../utils/getContractorId';

import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ notification_id: string }> }
) {
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
    const { notification_id } = await params;

    // Get contractor_id from cache (header) or fetch from API
    const contractorId = await getContractorId(request);

    if (!contractorId) {
      return NextResponse.json(
        { message: 'User does not have a contractor ID' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${apiBaseUrl}/api/v1/contractors/${contractorId}/notifications/${notification_id}/acknowledge`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.detail || 'Failed to acknowledge notification' },
        { status: response.status }
      );
    }

    const notification = await response.json();
    return NextResponse.json(notification);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error acknowledging notification:', error);
    return NextResponse.json(
      { message: 'An error occurred while acknowledging notification' },
      { status: 500 }
    );
  }
}

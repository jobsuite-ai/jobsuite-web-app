import { NextRequest, NextResponse } from 'next/server';

import { extractBackendHeaders } from '../utils/backendHeaders';
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

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const apiBaseUrl = getApiBaseUrl();

    // Get contractor_id from cache (header) or fetch from API
    const contractorId = await getContractorId(request);

    if (!contractorId) {
      return NextResponse.json(
        { message: 'User does not have a contractor ID' },
        { status: 400 }
      );
    }

    // Build the API URL
    const homepageUrl = `${apiBaseUrl}/api/v1/contractors/${contractorId}/homepage/data`;

    // Fetch homepage data from backend
    const homepageResponse = await fetch(homepageUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!homepageResponse.ok) {
      const errorData = await homepageResponse.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.detail || 'Failed to fetch homepage data' },
        { status: homepageResponse.status }
      );
    }

    const homepageData = await homepageResponse.json();
    const backendHeaders = extractBackendHeaders(homepageResponse);
    return NextResponse.json(homepageData, { headers: backendHeaders });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching homepage data:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching homepage data' },
      { status: 500 }
    );
  }
}

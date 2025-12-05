import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '../utils/getContractorId';

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
    // Force production endpoint for dashboard
    const apiBaseUrl = 'https://api.jobsuite.app';

    // Get contractor_id from cache (header) or fetch from API
    const contractorId = await getContractorId(request);

    if (!contractorId) {
      return NextResponse.json(
        { message: 'User does not have a contractor ID' },
        { status: 400 }
      );
    }

    // Get query parameters from the request
    const { searchParams } = new URL(request.url);
    const timeFrame = searchParams.get('time_frame') || 'ytd';
    const selectedMonth = searchParams.get('selected_month');
    const selectedYear = searchParams.get('selected_year');

    // Build query parameters for the job engine API
    const queryParams = new URLSearchParams({
      time_frame: timeFrame,
    });

    if (selectedMonth !== null) {
      queryParams.append('selected_month', selectedMonth);
    }

    if (selectedYear !== null) {
      queryParams.append('selected_year', selectedYear);
    }

    const response = await fetch(`${apiBaseUrl}/api/v1/contractors/${contractorId}/dashboard/v2/metrics?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.detail || 'Failed to fetch dashboard metrics' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching dashboard metrics' },
      { status: 500 }
    );
  }
}

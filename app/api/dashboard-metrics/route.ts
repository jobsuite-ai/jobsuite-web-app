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

    // Get query parameters from the request
    const { searchParams } = new URL(request.url);
    const timeFrame = searchParams.get('time_frame') || 'ytd';
    const selectedMonth = searchParams.get('selected_month');
    const selectedYear = searchParams.get('selected_year');
    const tag = searchParams.get('tag');

    // Build query parameters for the job engine API (V2 estimate-based metrics, incl. DSO)
    const queryParams = new URLSearchParams({
      time_frame: timeFrame,
    });

    // V2 expects selected_month 0-11; frontend sends 1-12
    if (selectedMonth !== null && selectedMonth !== undefined) {
      const monthNum = parseInt(selectedMonth, 10);
      if (!Number.isNaN(monthNum)) {
        queryParams.append('selected_month', String(monthNum - 1));
      }
    }

    if (selectedYear !== null) {
      queryParams.append('selected_year', selectedYear);
    }

    if (tag) {
      queryParams.append('tag', tag);
    }

    const dashboardPath = `/api/v1/contractors/${contractorId}/dashboard/v2/metrics`;

    const response = await fetch(`${apiBaseUrl}${dashboardPath}?${queryParams.toString()}`, {
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
    const backendHeaders = extractBackendHeaders(response);
    return NextResponse.json(data, { headers: backendHeaders });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching dashboard metrics' },
      { status: 500 }
    );
  }
}

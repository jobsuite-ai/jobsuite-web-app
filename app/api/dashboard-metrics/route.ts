import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const contractorId = process.env.RLPP_USER_ID;

    if (!contractorId) {
      return NextResponse.json(
        { error: 'RLPP_USER_ID environment variable is not set' },
        { status: 500 }
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
      api_key: '3cc3cde9-23c0-4820-8588-a23554a74fbe',
    });

    if (selectedMonth !== null) {
      queryParams.append('selected_month', selectedMonth);
    }

    if (selectedYear !== null) {
      queryParams.append('selected_year', selectedYear);
    }

    const response = await fetch(`https://qa.api.jobsuite.app/api/v1/contractors/${contractorId}/dashboard/metrics?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}

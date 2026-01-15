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

    // Parse query parameters
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id');
    const status = url.searchParams.get('status'); // Note: backend only accepts single status

    // Build the API URL
    let estimatesUrl = `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates`;
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
        Authorization: `Bearer ${token}`,
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
    const backendHeaders = extractBackendHeaders(estimatesResponse);

    // Return in the format expected by the frontend (wrapped in Items)
    return NextResponse.json({ Items: estimates }, { headers: backendHeaders });
  } catch (error) {
    return NextResponse.json(
      { message: 'An error occurred while fetching estimates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Get request body
    const body = await request.json();

    // Create estimate via backend API
    const createResponse = await fetch(
      `${apiBaseUrl}/api/v1/contractors/${contractorId}/estimates`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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
    const backendHeaders = extractBackendHeaders(createResponse);
    return NextResponse.json(estimate, { status: 201, headers: backendHeaders });
  } catch (error) {
    return NextResponse.json(
      { message: 'An error occurred while creating estimate' },
      { status: 500 }
    );
  }
}

export async function PUT() {
  return NextResponse.json({ message: 'PUT method not implemented. Use POST with estimate_id in path' }, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json({ message: 'DELETE method not implemented. Use DELETE with estimate_id in path' }, { status: 501 });
}

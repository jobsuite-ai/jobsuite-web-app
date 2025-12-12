import { NextRequest, NextResponse } from 'next/server';

import { getContractorId } from '@/app/api/utils/getContractorId';
import { getApiBaseUrl } from '@/app/api/utils/serviceAuth';

export async function POST(request: NextRequest) {
    let contractorId: string | null = null;
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
        contractorId = await getContractorId(request);

        if (!contractorId) {
            return NextResponse.json(
                { message: 'Contractor ID not found' },
                { status: 400 }
            );
        }

        const apiBaseUrl = getApiBaseUrl();

        // Get the file from the form data
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { message: 'No file provided' },
                { status: 400 }
            );
        }

        // Create form data for backend - same pattern as ImageUpload
        const backendFormData = new FormData();
        backendFormData.append('file', file);

        // Upload logo via backend API - same pattern as estimate resources
        const uploadResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations/logo`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: backendFormData,
            }
        );

        if (!uploadResponse.ok) {
            let errorMessage = 'Failed to upload logo';
            try {
                // Read response as text first, then try to parse as JSON
                const errorText = await uploadResponse.text();
                if (errorText) {
                    try {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.detail || errorData.message || errorMessage;
                    } catch {
                        // If not JSON, use the text as error message
                        errorMessage = errorText || errorMessage;
                    }
                }
            } catch (parseError) {
                // eslint-disable-next-line no-console
                console.error('Failed to read error response:', parseError);
            }
            // eslint-disable-next-line no-console
            console.error('Logo upload failed:', {
                status: uploadResponse.status,
                statusText: uploadResponse.statusText,
                errorMessage,
                contractorId,
                apiBaseUrl,
            });
            return NextResponse.json(
                { message: errorMessage },
                { status: uploadResponse.status }
            );
        }

        const data = await uploadResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Upload logo error:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            contractorId,
        });
        return NextResponse.json(
            {
                message: error instanceof Error
                    ? `An error occurred while uploading logo: ${error.message}`
                    : 'An error occurred while uploading logo',
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    let contractorId: string | null = null;
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
        contractorId = await getContractorId(request);

        if (!contractorId) {
            return NextResponse.json(
                { message: 'Contractor ID not found' },
                { status: 400 }
            );
        }

        const apiBaseUrl = getApiBaseUrl();

        // Get logo URL via backend API
        const logoResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations/logo`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!logoResponse.ok) {
            let errorMessage = 'Failed to get logo URL';
            try {
                // Read response as text first, then try to parse as JSON
                const errorText = await logoResponse.text();
                if (errorText) {
                    try {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.detail || errorData.message || errorMessage;
                    } catch {
                        // If not JSON, use the text as error message
                        errorMessage = errorText || errorMessage;
                    }
                }
            } catch (parseError) {
                // eslint-disable-next-line no-console
                console.error('Failed to read error response:', parseError);
            }
            // eslint-disable-next-line no-console
            console.error('Get logo failed:', {
                status: logoResponse.status,
                statusText: logoResponse.statusText,
                errorMessage,
                contractorId,
            });
            return NextResponse.json(
                { message: errorMessage },
                { status: logoResponse.status }
            );
        }

        const data = await logoResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Get logo error:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            contractorId,
        });
        return NextResponse.json(
            {
                message: error instanceof Error
                    ? `An error occurred while getting logo URL: ${error.message}`
                    : 'An error occurred while getting logo URL',
            },
            { status: 500 }
        );
    }
}

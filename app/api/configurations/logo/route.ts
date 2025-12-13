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

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { message: 'File must be an image (PNG, JPEG, etc.)' },
                { status: 400 }
            );
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { message: 'File size must be less than 5MB' },
                { status: 400 }
            );
        }

        // Step 1: Get presigned URL from backend
        const presignedUrlResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations/logo/presigned-url`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: file.name,
                    content_type: file.type,
                }),
            }
        );

        if (!presignedUrlResponse.ok) {
            let errorMessage = 'Failed to get presigned URL';
            try {
                const errorText = await presignedUrlResponse.text();
                if (errorText) {
                    try {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.detail || errorData.message || errorMessage;
                    } catch {
                        errorMessage = errorText || errorMessage;
                    }
                }
            } catch (parseError) {
                // eslint-disable-next-line no-console
                console.error('Failed to read error response:', parseError);
            }
            return NextResponse.json(
                { message: errorMessage },
                { status: presignedUrlResponse.status }
            );
        }

        const { presigned_url, s3_key, s3_bucket } = await presignedUrlResponse.json();

        // Step 2: Upload file directly to S3 using presigned URL
        const fileBuffer = await file.arrayBuffer();
        const s3UploadResponse = await fetch(presigned_url, {
            method: 'PUT',
            headers: {
                'Content-Type': file.type,
            },
            body: fileBuffer,
        });

        if (!s3UploadResponse.ok) {
            const errorText = await s3UploadResponse.text().catch(() => 'Unknown error');
            // eslint-disable-next-line no-console
            console.error('S3 upload failed:', {
                status: s3UploadResponse.status,
                statusText: s3UploadResponse.statusText,
                errorText,
            });
            return NextResponse.json(
                { message: `Failed to upload to S3: ${s3UploadResponse.statusText}` },
                { status: 500 }
            );
        }

        // Step 3: Save S3 location to configuration
        const saveLocationResponse = await fetch(
            `${apiBaseUrl}/api/v1/contractors/${contractorId}/configurations/logo/location`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    logo_s3_key: s3_key,
                    logo_s3_bucket: s3_bucket,
                }),
            }
        );

        if (!saveLocationResponse.ok) {
            let errorMessage = 'Failed to save logo location';
            try {
                const errorText = await saveLocationResponse.text();
                if (errorText) {
                    try {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.detail || errorData.message || errorMessage;
                    } catch {
                        errorMessage = errorText || errorMessage;
                    }
                }
            } catch (parseError) {
                // eslint-disable-next-line no-console
                console.error('Failed to read error response:', parseError);
            }
            return NextResponse.json(
                { message: errorMessage },
                { status: saveLocationResponse.status }
            );
        }

        const data = await saveLocationResponse.json();
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

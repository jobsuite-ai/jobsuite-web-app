/**
 * Utility functions for uploading PDF via multipart upload using signature_hash
 * This allows clients (who aren't authenticated) to upload PDFs
 */

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

async function getPresignedUrlForPart(
    signatureHash: string,
    resourceID: string,
    partNumber: number
): Promise<string> {
    const response = await fetch(
        `/api/signature/${signatureHash}/upload-pdf/${resourceID}/presigned-url?part_number=${partNumber}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.detail || 'Failed to get presigned URL';
        throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.presigned_url;
}

async function uploadFilePartWithRetry(
    signatureHash: string,
    resourceID: string,
    partNumber: number,
    chunk: Blob,
    maxRetries: number = 3,
    onProgress?: (partNumber: number, progress: number) => void
): Promise<{ PartNumber: number; ETag: string }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
        try {
            // Get presigned URL for this part
            const presignedUrl = await getPresignedUrlForPart(
                signatureHash,
                resourceID,
                partNumber
            );

            // Upload chunk to presigned URL
            // Note: Do not set Content-Type header for multipart upload parts
            // The Content-Type is set during create_multipart_upload
            const controller = new AbortController();
            // 5 minute timeout per part
            const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

            try {
                const uploadResponse = await fetch(presignedUrl, {
                    method: 'PUT',
                    body: chunk,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!uploadResponse.ok) {
                    const errorText = await uploadResponse.text().catch(() => 'Unknown error');
                    throw new Error(
                        `Upload failed with status ${uploadResponse.status}: ${uploadResponse.statusText}. ${errorText}`
                    );
                }

                // Extract ETag from response headers
                const etag = uploadResponse.headers.get('ETag')?.replace(/"/g, '');
                if (!etag) {
                    const availableHeaders: string[] = [];
                    uploadResponse.headers.forEach((value, key) => {
                        availableHeaders.push(`${key}: ${value}`);
                    });
                    // eslint-disable-next-line no-console
                    console.error(
                        `ETag header not available for part ${partNumber}. ` +
                        `Available headers: ${availableHeaders.join(', ')}. ` +
                        'This is likely a CORS configuration issue - the S3 bucket must expose the ETag header.'
                    );
                    throw new Error(
                        `No ETag received for part ${partNumber}. ` +
                        'This is likely a CORS configuration issue. ' +
                        'The S3 bucket must expose the ETag header in its CORS configuration.'
                    );
                }

                const cleanEtag = etag;

                if (onProgress) {
                    onProgress(partNumber, 100);
                }

                return { PartNumber: partNumber, ETag: cleanEtag };
            } catch (fetchError) {
                clearTimeout(timeoutId);
                throw fetchError;
            }
        } catch (error: any) {
            lastError = error;
            // eslint-disable-next-line no-console
            console.warn(
                `Upload attempt ${attempt}/${maxRetries} failed for part ${partNumber}:`,
                error
            );

            if (attempt < maxRetries) {
                // Exponential backoff: wait 1s, 2s, 4s
                await new Promise((resolve) => { setTimeout(resolve, 1000 * 2 ** (attempt - 1)); });
            }
        }
    }

    throw new Error(
        `Failed to upload part ${partNumber} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
}

async function uploadFileParts(
    file: Blob,
    signatureHash: string,
    resourceID: string,
    onProgress?: (uploaded: number, total: number) => void
): Promise<Array<{ PartNumber: number; ETag: string }>> {
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);
    const parts: Array<{ PartNumber: number; ETag: string }> = [];
    const partProgress: Map<number, number> = new Map();

    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const partResult = await uploadFilePartWithRetry(
            signatureHash,
            resourceID,
            partNumber,
            chunk,
            3, // maxRetries
            (partNum, progress) => {
                partProgress.set(partNum, progress);
                if (onProgress) {
                    const totalProgress = Array.from(
                        partProgress.values()
                    ).reduce((sum, p) => sum + p, 0);
                    onProgress(totalProgress, totalParts * 100);
                }
            }
        );

        parts.push(partResult);
    }

    return parts;
}

async function completeMultipartUpload(
    signatureHash: string,
    resourceID: string,
    parts: Array<{ PartNumber: number; ETag: string }>
): Promise<void> {
    const response = await fetch(
        `/api/signature/${signatureHash}/upload-pdf/${resourceID}/complete`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ parts }),
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.detail || 'Failed to complete multipart upload';

        // Check if the error is because the upload was already completed
        // This can happen if the completion succeeded on the backend but the response
        // didn't reach the frontend (network timeout, etc.)
        if (errorMessage.includes('upload does not exist') ||
            errorMessage.includes('upload ID may be invalid') ||
            errorMessage.includes('upload may have been aborted or completed')) {
            // Upload actually completed successfully, just the response didn't come back
            // eslint-disable-next-line no-console
            console.log('Upload was already completed, treating as success');
            return;
        }

        throw new Error(errorMessage);
    }
}

/**
 * Upload a PDF blob via multipart upload using signature_hash
 *
 * @param signatureHash - The signature hash from the signature link
 * @param pdfBlob - The PDF blob to upload
 * @param onProgress - Optional progress callback (uploaded, total)
 * @returns Promise that resolves when upload is complete
 */
export async function uploadPdfFromSignature(
    signatureHash: string,
    pdfBlob: Blob,
    onProgress?: (uploaded: number, total: number) => void
): Promise<void> {
    try {
        // Step 1: Initiate multipart upload
        const formData = new FormData();
        formData.append('filename', `signed-estimate-${Date.now()}.pdf`);
        formData.append('content_type', 'application/pdf');

        const initiateResponse = await fetch(
            `/api/signature/${signatureHash}/upload-pdf/initiate`,
            {
                method: 'POST',
                body: formData,
            }
        );

        if (!initiateResponse.ok) {
            const errorData = await initiateResponse.json().catch(() => ({}));
            const errorMessage = errorData.error || errorData.detail || 'Failed to initiate PDF upload';
            throw new Error(errorMessage);
        }

        const resource = await initiateResponse.json();
        const resourceID = resource.id;

        // Step 2: Upload file parts
        const parts = await uploadFileParts(
            pdfBlob,
            signatureHash,
            resourceID,
            onProgress
        );

        // Step 3: Complete multipart upload
        await completeMultipartUpload(signatureHash, resourceID, parts);

        // eslint-disable-next-line no-console
        console.log('PDF upload completed successfully');
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Error uploading PDF:', error);
        throw error;
    }
}

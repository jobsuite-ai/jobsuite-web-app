'use client';

import { useEffect, useRef, useState } from 'react';

import { Button, Group, Loader, Progress, rem, Text } from '@mantine/core';
import { Dropzone, FileWithPath, MIME_TYPES } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconCloudUpload, IconDownload, IconX } from '@tabler/icons-react';

import classes from './styles/EstimateDetails.module.css';

type UploadState = 'idle' | 'preparing' | 'uploading' | 'updating' | 'error';

interface VideoUploaderProps {
    estimateID: string;
    refresh: () => void | Promise<void>;
}

async function initiateMultipartUpload(file: File, estimateID: string): Promise<any> {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
        throw new Error('No access token found');
    }

    const parsedFileName = file.name.replaceAll(' ', '_');
    const formData = new FormData();
    formData.append('filename', parsedFileName);
    formData.append('content_type', file.type);
    formData.append('resource_type', 'VIDEO');

    const response = await fetch(
        `/api/estimates/${estimateID}/resources/multipart/initiate`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Failed to initiate multipart upload';
        throw new Error(errorMessage);
    }

    return response.json();
}

async function getPresignedUrlForPart(
    estimateID: string,
    resourceID: string,
    partNumber: number
): Promise<string> {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
        throw new Error('No access token found');
    }

    const response = await fetch(
        `/api/estimates/${estimateID}/resources/${resourceID}/multipart/presigned-url?part_number=${partNumber}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Failed to get presigned URL';
        throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.presigned_url;
}

async function uploadFilePartWithRetry(
    file: File,
    estimateID: string,
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
            const presignedUrl = await getPresignedUrlForPart(estimateID, resourceID, partNumber);

            // Upload part directly to S3 with timeout
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
                        `Failed to upload part ${partNumber}: ${uploadResponse.status} ${uploadResponse.statusText}. ${errorText}`
                    );
                }

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

                if (onProgress) {
                    onProgress(partNumber, 100);
                }

                return {
                    PartNumber: partNumber,
                    ETag: etag,
                };
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                    throw new Error(`Upload timeout for part ${partNumber} (attempt ${attempt}/${maxRetries})`);
                }
                throw fetchError;
            }
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxRetries) {
                // Exponential backoff: wait 1s, 2s, 4s before retrying
                const delay = Math.min(1000 * (2 ** (attempt - 1)), 10000);
                // eslint-disable-next-line no-console
                console.warn(
                    `Failed to upload part ${partNumber} (attempt ${attempt}/${maxRetries}): ${lastError.message}. Retrying in ${delay}ms...`
                );
                await new Promise((resolve) => {
                    setTimeout(resolve, delay);
                });
            }
        }
    }

    // All retries failed
    throw new Error(
        `Failed to upload part ${partNumber} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    );
}

async function uploadFileParts(
    file: File,
    estimateID: string,
    resourceID: string,
    onProgress?: (uploaded: number, total: number) => void
): Promise<Array<{ PartNumber: number; ETag: string }>> {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);
    const parts: Array<{ PartNumber: number; ETag: string }> = [];
    const partProgress: Map<number, number> = new Map();

    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const partResult = await uploadFilePartWithRetry(
            file,
            estimateID,
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
    estimateID: string,
    resourceID: string,
    parts: Array<{ PartNumber: number; ETag: string }>
): Promise<void> {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
        throw new Error('No access token found');
    }

    const response = await fetch(
        `/api/estimates/${estimateID}/resources/${resourceID}/multipart/complete`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ parts }),
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Failed to complete multipart upload';
        throw new Error(errorMessage);
    }
}

async function abortMultipartUpload(
    estimateID: string,
    resourceID: string
): Promise<void> {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
        // eslint-disable-next-line no-console
        console.warn('No access token found, cannot abort upload');
        return;
    }

    try {
        const response = await fetch(
            `/api/estimates/${estimateID}/resources/${resourceID}/multipart/abort`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            // eslint-disable-next-line no-console
            console.warn('Failed to abort multipart upload:', await response.text().catch(() => 'Unknown error'));
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Error aborting multipart upload:', error);
        // Don't throw - abort is best effort cleanup
    }
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / (k ** i)).toFixed(2))} ${sizes[i]}`;
}

export default function VideoUploader({ estimateID, refresh }: VideoUploaderProps) {
    const [video, setVideo] = useState<FileWithPath | null>(null);
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [currentResourceID, setCurrentResourceID] = useState<string | null>(null);
    const openRef = useRef<() => void>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const resetUploadState = () => {
        setVideo(null);
        setUploadState('idle');
        setErrorMessage(null);
        setUploadProgress(0);
        setCurrentResourceID(null);
    };

    // Cleanup on unmount - abort any ongoing upload
    useEffect(() => () => {
            if (currentResourceID && uploadState !== 'idle' && uploadState !== 'error') {
                // Abort upload if component unmounts during upload
                abortMultipartUpload(estimateID, currentResourceID).catch(() => {
                    // Ignore errors during cleanup
                });
            }
        }, [currentResourceID, uploadState, estimateID]);

    const handleFileUpload = async (files: File[]) => {
        if (files.length === 0) return;

        const file = files[0];

        // Validate file
        if (file.size > 1024 * 1024 * 1024) {
            const errorMsg = `File size (${formatFileSize(file.size)}) exceeds the 1GB limit`;
            setErrorMessage(errorMsg);
            setUploadState('error');
            notifications.show({
                title: 'Upload Failed',
                position: 'top-center',
                color: 'red',
                message: errorMsg,
            });
            return;
        }

        // Validate file type
        const validTypes = [MIME_TYPES.mp4, 'video/quicktime', 'video/hevc'];
        if (!validTypes.includes(file.type)) {
            const errorMsg = 'Invalid file type. Please upload MP4, QuickTime, or HEVC video files.';
            setErrorMessage(errorMsg);
            setUploadState('error');
            notifications.show({
                title: 'Upload Failed',
                position: 'top-center',
                color: 'red',
                message: errorMsg,
            });
            return;
        }

        let resourceID: string | null = null;

        try {
            setVideo(file);
            setUploadState('preparing');
            setErrorMessage(null);
            setUploadProgress(0);

            // Initiate multipart upload
            const resource = await initiateMultipartUpload(file, estimateID);
            resourceID = resource.id;
            setCurrentResourceID(resourceID);

            if (!isMountedRef.current) {
                // Abort if component unmounted
                if (resourceID) {
                    await abortMultipartUpload(estimateID, resourceID);
                }
                return;
            }

            if (!resourceID) {
                throw new Error('Resource ID not found after initiating upload');
            }

            setUploadState('uploading');

            notifications.show({
                title: 'Video upload started',
                position: 'top-center',
                color: 'green',
                message: `Uploading ${file.name} (${formatFileSize(file.size)})...`,
            });

            // Upload file in parts with progress tracking
            const parts = await uploadFileParts(
                file,
                estimateID,
                resourceID,
                (uploaded, total) => {
                    if (isMountedRef.current) {
                        setUploadProgress((uploaded / total) * 100);
                    }
                }
            );

            if (!isMountedRef.current) {
                // Abort if component unmounted
                if (resourceID) {
                    await abortMultipartUpload(estimateID, resourceID);
                }
                return;
            }

            // Complete multipart upload
            setUploadState('updating');
            setUploadProgress(95); // Almost done
            await completeMultipartUpload(estimateID, resourceID, parts);

            if (!isMountedRef.current) return;

            setUploadProgress(100);

            // Refresh resources list
            await refresh();

            notifications.show({
                title: 'Upload Successful',
                position: 'top-center',
                color: 'green',
                message: 'Your video has been uploaded successfully.',
            });

            // Reset state after successful upload
            setUploadState('idle');
            setVideo(null);
            setUploadProgress(0);
            setCurrentResourceID(null);
        } catch (error) {
            if (!isMountedRef.current) return;

            const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
            setErrorMessage(errorMsg);
            setUploadState('error');
            setUploadProgress(0);

            // Attempt to abort the incomplete upload to cleanup S3
            if (resourceID) {
                try {
                    await abortMultipartUpload(estimateID, resourceID);
                } catch (abortError) {
                    // eslint-disable-next-line no-console
                    console.warn('Failed to abort incomplete upload:', abortError);
                    // Continue to show error even if abort fails
                }
            }

            notifications.show({
                title: 'Upload Failed',
                position: 'top-center',
                color: 'red',
                message: errorMsg,
            });
        }
    };

    return (
        <>
            {uploadState === 'idle' && (
                <div className={classes.videoContainer}>
                    <Dropzone
                      openRef={openRef}
                      onDrop={(vids) => handleFileUpload(vids)}
                      maxSize={1024 * 1024 * 1024}
                      accept={[MIME_TYPES.mp4, 'video/quicktime', 'video/hevc']}
                      style={{ width: '100%' }}
                      disabled={uploadState !== 'idle'}
                    >
                        <div style={{ marginTop: '5%' }}>
                            <Group justify="center">
                                <Dropzone.Accept>
                                    <IconDownload
                                      style={{ width: rem(50), height: rem(50) }}
                                      stroke={1.5}
                                    />
                                </Dropzone.Accept>
                                <Dropzone.Reject>
                                    <IconX
                                      style={{ width: rem(50), height: rem(50) }}
                                      stroke={1.5}
                                    />
                                </Dropzone.Reject>
                                <Dropzone.Idle>
                                    <IconCloudUpload
                                      style={{ width: rem(50), height: rem(50) }}
                                      stroke={1.5}
                                    />
                                </Dropzone.Idle>
                            </Group>

                            <Text ta="center" fz="lg" mt="xl">
                                <Dropzone.Accept>Drop files here</Dropzone.Accept>
                                <Dropzone.Reject>Files less than 1GB</Dropzone.Reject>
                                <Dropzone.Idle>Upload walk around video</Dropzone.Idle>
                            </Text>
                            <Text ta="center" fz="sm" mt="xs" c="dimmed">
                                Drag and drop files here to upload. We can only accept files that
                                are less than 1GB in size.
                            </Text>
                        </div>
                    </Dropzone>
                </div>
            )}

            {(uploadState === 'preparing' || uploadState === 'uploading' || uploadState === 'updating') && video && (
                <div className={classes.uploadState}>
                    <Group justify="center" mb="md">
                        <Loader size="md" />
                    </Group>
                    <Text ta="center" fz="lg" fw={500}>
                        {uploadState === 'preparing' && 'Preparing upload...'}
                        {uploadState === 'uploading' && 'Your video is uploading'}
                        {uploadState === 'updating' && 'Updating estimate...'}
                    </Text>
                    {video && (
                        <Text ta="center" fz="sm" mt="xs" c="dimmed">
                            {video.name} ({formatFileSize(video.size)})
                        </Text>
                    )}
                    {uploadState === 'uploading' && (
                        <>
                            <Progress value={uploadProgress} size="lg" radius="xl" mt="md" />
                            <Text ta="center" fz="sm" mt="xs" c="dimmed">
                                {Math.round(uploadProgress)}% uploaded
                            </Text>
                        </>
                    )}
                    <Text ta="center" fz="sm" mt="xs" c="dimmed">
                        {uploadState === 'uploading' && 'If this process takes longer than 10 minutes, please reach out to support.'}
                        {uploadState !== 'uploading' && 'Please wait...'}
                    </Text>
                </div>
            )}

            {uploadState === 'error' && (
                <div className={classes.uploadState}>
                    <Group justify="center" mb="md">
                        <IconX
                          style={{ width: rem(50), height: rem(50) }}
                          stroke={1.5}
                          color="red"
                        />
                    </Group>
                    <Text ta="center" fz="lg" fw={500} c="red">
                        Upload Failed
                    </Text>
                    {errorMessage && (
                        <Text ta="center" fz="sm" mt="xs" c="dimmed">
                            {errorMessage}
                        </Text>
                    )}
                    {video && (
                        <Text ta="center" fz="sm" mt="xs" c="dimmed">
                            {video.name} ({formatFileSize(video.size)})
                        </Text>
                    )}
                    <Text ta="center" fz="sm" mt="md" c="dimmed">
                        Please try again or contact support if the problem persists.
                    </Text>
                    <Group justify="center" mt="md">
                        <Button onClick={resetUploadState} variant="outline">
                            Try Again
                        </Button>
                    </Group>
                </div>
            )}
        </>
    );
}

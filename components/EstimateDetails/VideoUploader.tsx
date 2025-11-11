'use client';

import { useEffect, useRef, useState } from 'react';

import { Button, Group, Loader, rem, Text } from '@mantine/core';
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

async function uploadFileParts(
    file: File,
    estimateID: string,
    resourceID: string
): Promise<Array<{ PartNumber: number; ETag: string }>> {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);
    const parts: Array<{ PartNumber: number; ETag: string }> = [];

    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
        const start = (partNumber - 1) * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        // Get presigned URL for this part
        const presignedUrl = await getPresignedUrlForPart(estimateID, resourceID, partNumber);

        // Upload part directly to S3
        // Note: Do not set Content-Type header for multipart upload parts
        // The Content-Type is set during create_multipart_upload
        const uploadResponse = await fetch(presignedUrl, {
            method: 'PUT',
            body: chunk,
        });

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

        parts.push({
            PartNumber: partNumber,
            ETag: etag,
        });
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
    };

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

        try {
            setVideo(file);
            setUploadState('preparing');
            setErrorMessage(null);

            // Initiate multipart upload
            const resource = await initiateMultipartUpload(file, estimateID);

            if (!isMountedRef.current) return;

            setUploadState('uploading');

            notifications.show({
                title: 'Video upload started',
                position: 'top-center',
                color: 'green',
                message: `Uploading ${file.name} (${formatFileSize(file.size)})...`,
            });

            // Upload file in parts
            const parts = await uploadFileParts(file, estimateID, resource.id);

            if (!isMountedRef.current) return;

            // Complete multipart upload
            setUploadState('updating');
            await completeMultipartUpload(estimateID, resource.id, parts);

            if (!isMountedRef.current) return;

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
        } catch (error) {
            if (!isMountedRef.current) return;

            const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
            setErrorMessage(errorMsg);
            setUploadState('error');

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

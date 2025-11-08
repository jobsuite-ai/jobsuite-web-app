'use client';

import { useEffect, useRef, useState } from 'react';

import { Button, Group, Loader, rem, Text } from '@mantine/core';
import { Dropzone, FileWithPath, MIME_TYPES } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconCloudUpload, IconDownload, IconX } from '@tabler/icons-react';

import classes from './styles/EstimateDetails.module.css';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';

interface PresignedPostData {
    url: string;
    fields: Record<string, string>;
}

type UploadState = 'idle' | 'preparing' | 'uploading' | 'updating' | 'error';

interface VideoUploaderProps {
    estimateID: string;
    refresh: () => void | Promise<void>;
}

async function requestPresignedPost(file: File, estimateID: string): Promise<PresignedPostData> {
    const parsedFileName = file.name.replaceAll(' ', '_');
    const response = await fetch(
        '/api/videos',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filename: parsedFileName, contentType: file.type, estimateID }),
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Failed to generate presigned URL';
        throw new Error(errorMessage);
    }

    return response.json();
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

            // Request presigned URL
            const presignedPostData = await requestPresignedPost(file, estimateID);

            if (!isMountedRef.current) return;

            // Check if service worker is available
            if (!navigator.serviceWorker?.controller) {
                throw new Error(
                    'Service worker is not available. Please refresh the page and try again.'
                );
            }

            setUploadState('uploading');

            // Convert file to array buffer
            const arrayBuffer = await file.arrayBuffer();

            if (!isMountedRef.current) return;

            // Send upload request to service worker
            const messageChannel = new MessageChannel();

            navigator.serviceWorker.controller.postMessage(
                {
                    type: 'UPLOAD_FILE',
                    payload: {
                        url: presignedPostData.url,
                        fields: presignedPostData.fields,
                        file: arrayBuffer,
                        fileName: file.name,
                        contentType: file.type,
                    },
                },
                [messageChannel.port2]
            );

            notifications.show({
                title: 'Video upload started',
                position: 'top-center',
                color: 'green',
                message: `Uploading ${file.name} (${formatFileSize(file.size)})...`,
            });

            // Update job with video metadata
            setUploadState('updating');
            await updateJobWithVideo(file);

            if (!isMountedRef.current) return;

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

    async function updateJobWithVideo(newVideo: FileWithPath) {
        if (!newVideo) return;

        const content: UpdateJobContent = {
            video: {
                name: newVideo.name,
                size: newVideo.size,
                lastModified: newVideo.lastModified,
            },
        };

        try {
            const response = await fetch(
                `/api/estimates/${estimateID}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(content),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.message || errorData.error || 'Failed to update estimate with video';
                throw new Error(errorMsg);
            }

            await response.json();
            await refresh();
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to update estimate';
            throw new Error(`Failed to update estimate: ${errorMsg}`);
        }
    }

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

'use client';

import '@mantine/dropzone/styles.css';
import { useEffect, useRef, useState } from 'react';

import { Group, Progress, rem, Stack, Text } from '@mantine/core';
import { Dropzone, FileWithPath, MIME_TYPES } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconCloudUpload, IconDownload, IconX } from '@tabler/icons-react';

import classes from './styles/EstimateDetails.module.css';

type UploadState = 'idle' | 'uploading' | 'error';

interface FileUploadProgress {
    file: FileWithPath;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    error?: string;
}

interface ImageUploadProps {
    estimateID: string;
    setImage: (imageName: string) => void;
    setShowModal: (show: boolean) => void;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / (k ** i)).toFixed(2))} ${sizes[i]}`;
}

export default function ImageUpload({ estimateID, setImage, setShowModal }: ImageUploadProps) {
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [fileUploads, setFileUploads] = useState<FileUploadProgress[]>([]);
    const openRef = useRef<() => void>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Handle drag events to ensure they reach the Dropzone even when modal is open
    useEffect(() => {
        const handleGlobalDragOver = (e: DragEvent) => {
            // Allow drag over events to prevent default browser behavior
            // This enables dropping on the dropzone
            if (e.dataTransfer?.types.includes('Files')) {
                e.preventDefault();
            }
        };

        const handleGlobalDrop = (e: DragEvent) => {
            // Prevent default drop behavior outside the dropzone
            // The dropzone will handle its own drop events
            if (!e.target || !(e.target as Element).closest('[data-mantine-dropzone]')) {
                e.preventDefault();
            }
        };

        // Add listeners with capture to catch events early
        window.addEventListener('dragover', handleGlobalDragOver, true);
        window.addEventListener('drop', handleGlobalDrop, true);

        return () => {
            window.removeEventListener('dragover', handleGlobalDragOver, true);
            window.removeEventListener('drop', handleGlobalDrop, true);
        };
    }, []);

    const validateFile = (file: FileWithPath): string | null => {
        // Validate file size
        const maxSize = 150 * 1024 * 1024; // 150MB
        if (file.size > maxSize) {
            return `File size (${formatFileSize(file.size)}) exceeds the 150MB limit`;
        }

        // Validate file type
        const validTypes: string[] = [
            MIME_TYPES.pdf,
            MIME_TYPES.heic,
            MIME_TYPES.heif,
            MIME_TYPES.png,
            MIME_TYPES.jpeg,
        ];
        if (!validTypes.includes(file.type)) {
            return 'Invalid file type. Please upload PDF, HEIC, HEIF, PNG, or JPEG files.';
        }

        return null;
    };

    const handleFileDrop = async (files: FileWithPath[]) => {
        if (files.length === 0) return;

        // Validate all files first
        const validationErrors: Array<{ file: FileWithPath; error: string }> = [];
        const validFiles: FileWithPath[] = [];

        files.forEach((file) => {
            const error = validateFile(file);
            if (error) {
                validationErrors.push({ file, error });
            } else {
                validFiles.push(file);
            }
        });

        // Show errors for invalid files
        validationErrors.forEach(({ file, error }) => {
            notifications.show({
                title: 'Upload Failed',
                position: 'top-center',
                color: 'red',
                message: `${file.name}: ${error}`,
            });
        });

        if (validFiles.length === 0) {
            return;
        }

        // Initialize upload progress for all valid files
        const initialUploads: FileUploadProgress[] = validFiles.map((file) => ({
            file,
            status: 'pending',
        }));
        setFileUploads(initialUploads);
        setUploadState('uploading');

        notifications.show({
            title: 'Upload Started',
            position: 'top-center',
            color: 'blue',
            message: `Uploading ${validFiles.length} file(s)...`,
        });

        // Upload files sequentially
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < validFiles.length; i += 1) {
            const file = validFiles[i];

            if (!isMountedRef.current) return;

            // Update status to uploading
            setFileUploads((prev) => {
                const updated = [...prev];
                updated[i] = { ...updated[i], status: 'uploading' };
                return updated;
            });

            try {
                await uploadResource(file);

                if (!isMountedRef.current) return;

                // Update status to completed
                setFileUploads((prev) => {
                    const updated = [...prev];
                    updated[i] = { ...updated[i], status: 'completed' };
                    return updated;
                });

                successCount += 1;
            } catch (error) {
                if (!isMountedRef.current) return;

                const errorMsg = error instanceof Error
                    ? error.message
                    : 'Failed to upload resource';

                // Update status to error
                setFileUploads((prev) => {
                    const updated = [...prev];
                    updated[i] = { ...updated[i], status: 'error', error: errorMsg };
                    return updated;
                });

                errorCount += 1;

                notifications.show({
                    title: 'Upload Failed',
                    position: 'top-center',
                    color: 'red',
                    message: `${file.name}: ${errorMsg}`,
                });
            }
        }

        if (!isMountedRef.current) return;

        // Show summary notification
        if (successCount > 0 && errorCount === 0) {
            notifications.show({
                title: 'Upload Successful',
                position: 'top-center',
                color: 'green',
                message: `Successfully uploaded ${successCount} file(s).`,
            });

            // Close modal after a short delay if all uploads succeeded
            setTimeout(() => {
                if (isMountedRef.current) {
                    setShowModal(false);
                    setImage(''); // Trigger refresh
                }
            }, 1000);
        } else if (successCount > 0 && errorCount > 0) {
            notifications.show({
                title: 'Upload Partially Complete',
                position: 'top-center',
                color: 'yellow',
                message: `Uploaded ${successCount} file(s), ${errorCount} failed.`,
            });
        }

        // Reset state after a delay to show final status
        setTimeout(() => {
            if (isMountedRef.current) {
                setUploadState('idle');
                setFileUploads([]);
            }
        }, 2000);
    };

    // Multipart upload helper functions
    async function initiateMultipartUpload(file: File): Promise<any> {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            throw new Error('No access token found');
        }

        const parsedFileName = file.name.replaceAll(' ', '_');
        const formData = new FormData();
        formData.append('filename', parsedFileName);
        formData.append('content_type', file.type);
        formData.append('resource_type', 'IMAGE');

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
        resourceID: string,
        partNumber: number,
        chunk: Blob,
        maxRetries: number = 3
    ): Promise<{ PartNumber: number; ETag: string }> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
            try {
                // Get presigned URL for this part
                const presignedUrl = await getPresignedUrlForPart(
                    resourceID,
                    partNumber
                );

                // Upload part directly to S3 with timeout
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
                        throw new Error(
                            `No ETag received for part ${partNumber}. ` +
                            'This is likely a CORS configuration issue. ' +
                            'The S3 bucket must expose the ETag header in its CORS configuration.'
                        );
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
        resourceID: string
    ): Promise<Array<{ PartNumber: number; ETag: string }>> {
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
        const totalParts = Math.ceil(file.size / CHUNK_SIZE);
        const parts: Array<{ PartNumber: number; ETag: string }> = [];

        for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
            const start = (partNumber - 1) * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            const partResult = await uploadFilePartWithRetry(
                resourceID,
                partNumber,
                chunk,
                3 // maxRetries
            );

            parts.push(partResult);
        }

        return parts;
    }

    async function completeMultipartUpload(
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

    async function uploadResource(file: FileWithPath) {
        if (!file) return;

        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            throw new Error('No access token found');
        }

        // Use multipart upload for files larger than 4MB to avoid
        // Next.js API route body size limits
        const MULTIPART_THRESHOLD = 4 * 1024 * 1024; // 4MB

        try {
            if (file.size > MULTIPART_THRESHOLD) {
                // Use multipart upload for large files
                // Step 1: Initiate multipart upload
                const resource = await initiateMultipartUpload(file);
                const resourceID = resource.id;

                if (!resourceID) {
                    throw new Error('Resource ID not found after initiating upload');
                }

                // Step 2: Upload file parts
                const parts = await uploadFileParts(file, resourceID);

                // Step 3: Complete multipart upload
                await completeMultipartUpload(resourceID, parts);
            } else {
                // Use simple POST for small files (faster for small uploads)
                const formData = new FormData();
                formData.append('file', file);
                formData.append('resource_type', 'IMAGE');

                const response = await fetch(
                    `/api/estimates/${estimateID}/resources`,
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
                    const errorMsg = errorData.message || errorData.error || 'Failed to upload resource';
                    throw new Error(errorMsg);
                }

                await response.json();
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to upload resource';
            throw new Error(`Failed to upload resource: ${errorMsg}`);
        }
    }

    const completedCount = fileUploads.filter((f) => f.status === 'completed').length;
    const errorCount = fileUploads.filter((f) => f.status === 'error').length;
    const uploadingCount = fileUploads.filter((f) => f.status === 'uploading').length;
    const totalCount = fileUploads.length;
    const progress = totalCount > 0 ? ((completedCount + errorCount) / totalCount) * 100 : 0;

    return (
        <div className={classes.sectionContent}>
            <Dropzone
              loading={false}
              openRef={openRef}
              onDrop={(files) => handleFileDrop(files)}
              maxSize={150 * 1024 * 1024}
              accept={[
                MIME_TYPES.pdf,
                MIME_TYPES.heic,
                MIME_TYPES.heif,
                MIME_TYPES.png,
                MIME_TYPES.jpeg,
              ]}
              style={{ width: '100%' }}
              disabled={uploadState !== 'idle'}
            >
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
                    <Dropzone.Reject>Files less than 150MB</Dropzone.Reject>
                    <Dropzone.Idle>Upload images</Dropzone.Idle>
                </Text>
                <Text ta="center" fz="sm" mt="xs" c="dimmed">
                    Drag and drop images here to upload. You can upload multiple files at once.
                    We can only accept files that are less than 150MB in size.
                </Text>

                {uploadState === 'uploading' && fileUploads.length > 0 && (
                    <Stack gap="xs" mt="md">
                        <Progress value={progress} size="sm" />
                        <Text ta="center" fz="sm" c="dimmed">
                            {completedCount} of {totalCount} uploaded
                            {uploadingCount > 0 && ` (${uploadingCount} uploading...)`}
                        </Text>
                        <Stack gap={4} mt="sm">
                            {fileUploads.map((fileUpload, index) => {
                                const statusColor = fileUpload.status === 'error'
                                    ? 'red'
                                    : fileUpload.status === 'completed'
                                        ? 'green'
                                        : 'dimmed';
                                return (
                                    <div key={index}>
                                        <Text fz="xs" c={statusColor}>
                                            {fileUpload.status === 'completed' && '✓ '}
                                            {fileUpload.status === 'error' && '✗ '}
                                            {fileUpload.status === 'uploading' && '↻ '}
                                            {fileUpload.file.name} (
                                                {formatFileSize(fileUpload.file.size)}
                                            )
                                        </Text>
                                        {fileUpload.error && (
                                            <Text fz="xs" c="red" pl={16}>
                                                {fileUpload.error}
                                            </Text>
                                        )}
                                    </div>
                                );
                            })}
                        </Stack>
                    </Stack>
                )}
            </Dropzone>
        </div>
    );
}

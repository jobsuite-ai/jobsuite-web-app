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

interface FileUploadProps {
    estimateID: string;
    setFile: (fileName: string) => void;
    setShowModal: (show: boolean) => void;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / (k ** i)).toFixed(2))} ${sizes[i]}`;
}

export default function FileUpload({ estimateID, setFile, setShowModal }: FileUploadProps) {
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

    // Same drag behavior as ImageUpload so drops work reliably inside modals
    useEffect(() => {
        const handleGlobalDragOver = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes('Files')) {
                e.preventDefault();
            }
        };

        const handleGlobalDrop = (e: DragEvent) => {
            if (!e.target || !(e.target as Element).closest('[data-mantine-dropzone]')) {
                e.preventDefault();
            }
        };

        window.addEventListener('dragover', handleGlobalDragOver, true);
        window.addEventListener('drop', handleGlobalDrop, true);

        return () => {
            window.removeEventListener('dragover', handleGlobalDragOver, true);
            window.removeEventListener('drop', handleGlobalDrop, true);
        };
    }, []);

    const maxImageBytes = 150 * 1024 * 1024; // align with ImageUpload
    const maxDocumentBytes = 500 * 1024 * 1024;

    const isImageFile = (file: FileWithPath): boolean => {
        const imageMimeTypes: string[] = [
            MIME_TYPES.png,
            MIME_TYPES.jpeg,
            MIME_TYPES.gif,
            MIME_TYPES.webp,
            MIME_TYPES.heic,
            MIME_TYPES.heif,
            'image/bmp',
            'image/tiff',
            'image/svg+xml',
        ];
        const t = file.type?.toLowerCase() ?? '';
        if (t && (imageMimeTypes.includes(t) || t.startsWith('image/'))) {
            return true;
        }
        const n = file.name.toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.heic', '.heif', '.tiff', '.tif', '.ico'].some(
            (ext) => n.endsWith(ext)
        );
    };

    const validateFile = (file: FileWithPath): string | null => {
        if (isImageFile(file)) {
            if (file.size > maxImageBytes) {
                return `File size (${formatFileSize(file.size)}) exceeds the 150MB limit for images`;
            }
            return null;
        }

        if (file.size > maxDocumentBytes) {
            return `File size (${formatFileSize(file.size)}) exceeds the 500MB limit`;
        }

        const validDocTypes: string[] = [
            MIME_TYPES.pdf,
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
            'application/rtf',
        ];

        const fileName = file.name.toLowerCase();
        const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.rtf'];
        const hasKnownDocExt = docExtensions.some((ext) => fileName.endsWith(ext));

        if (file.type && validDocTypes.includes(file.type)) {
            return null;
        }
        if (!file.type && hasKnownDocExt) {
            return null;
        }
        if (hasKnownDocExt) {
            return null;
        }

        return 'Invalid file type. Upload documents (PDF, Office, text) or images (PNG, JPEG, HEIC, etc.).';
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
                    setFile(''); // Trigger refresh
                }
            }, 1000);
        } else if (successCount > 0 && errorCount > 0) {
            notifications.show({
                title: 'Upload Partially Complete',
                position: 'top-center',
                color: 'yellow',
                message: `Uploaded ${successCount} file(s), ${errorCount} failed.`,
            });
            setFile('');
        }

        // Reset state after a delay to show final status
        setTimeout(() => {
            if (isMountedRef.current) {
                setUploadState('idle');
                setFileUploads([]);
            }
        }, 2000);
    };

    async function uploadResource(file: FileWithPath) {
        if (!file) return;

        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            throw new Error('No access token found');
        }

        const resourceType: 'IMAGE' | 'DOCUMENT' = isImageFile(file) ? 'IMAGE' : 'DOCUMENT';

        // Multipart upload helper functions
        async function initiateMultipartUpload(uploadFile: File): Promise<any> {
            const parsedFileName = uploadFile.name.replaceAll(' ', '_');
            const formData = new FormData();
            formData.append('filename', parsedFileName);
            formData.append('content_type', uploadFile.type || 'application/octet-stream');
            formData.append('resource_type', resourceType);

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
                    const presignedUrl = await getPresignedUrlForPart(resourceID, partNumber);
                    const controller = new AbortController();
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
                        const delay = Math.min(1000 * (2 ** (attempt - 1)), 10000);
                        await new Promise((resolve) => {
                            setTimeout(resolve, delay);
                        });
                    }
                }
            }

            throw new Error(
                `Failed to upload part ${partNumber} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
            );
        }

        async function uploadFileParts(
            uploadFile: File,
            resourceID: string
        ): Promise<Array<{ PartNumber: number; ETag: string }>> {
            const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
            const totalParts = Math.ceil(uploadFile.size / CHUNK_SIZE);
            const parts: Array<{ PartNumber: number; ETag: string }> = [];

            for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
                const start = (partNumber - 1) * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, uploadFile.size);
                const chunk = uploadFile.slice(start, end);

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

        try {
            // Use multipart upload for files larger than 4MB to avoid
            // Next.js API route body size limits
            const MULTIPART_THRESHOLD = 4 * 1024 * 1024; // 4MB

            if (file.size > MULTIPART_THRESHOLD) {
                const resource = await initiateMultipartUpload(file);
                const resourceID = resource.id;

                if (!resourceID) {
                    throw new Error('Resource ID not found after initiating upload');
                }

                const parts = await uploadFileParts(file, resourceID);
                await completeMultipartUpload(resourceID, parts);
            } else {
                // Create form data for resource upload
                const formData = new FormData();
                formData.append('file', file);
                formData.append('resource_type', resourceType);

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
              maxSize={500 * 1024 * 1024}
              accept={[
                MIME_TYPES.pdf,
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain',
                'text/csv',
                'application/rtf',
                MIME_TYPES.png,
                MIME_TYPES.jpeg,
                MIME_TYPES.gif,
                MIME_TYPES.webp,
                MIME_TYPES.heic,
                MIME_TYPES.heif,
                'image/bmp',
                'image/tiff',
                'image/svg+xml',
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
                    <Dropzone.Reject>Unsupported type or over size limit</Dropzone.Reject>
                    <Dropzone.Idle>Upload files</Dropzone.Idle>
                </Text>
                <Text ta="center" fz="sm" mt="xs" c="dimmed">
                    Drag and drop files here to upload. You can upload multiple files at once.
                    Documents: PDF, Word, Excel, PowerPoint, and text (up to 500MB).
                    Images: PNG, JPEG, HEIC, and other common formats (up to 150MB each).
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

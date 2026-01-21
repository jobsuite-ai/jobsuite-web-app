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

    const validateFile = (file: FileWithPath): string | null => {
        // Validate file size
        const maxSize = 150 * 1024 * 1024; // 150MB
        if (file.size > maxSize) {
            return `File size (${formatFileSize(file.size)}) exceeds the 150MB limit`;
        }

        // Explicitly reject image files
        const imageTypes: string[] = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',
            'image/svg+xml',
            'image/heic',
            'image/heif',
            'image/tiff',
            'image/x-icon',
        ];
        if (file.type && imageTypes.includes(file.type.toLowerCase())) {
            return 'Images are not allowed. Please use the image upload feature for images. Only PDF, Word, Excel, PowerPoint, or text files are allowed here.';
        }

        // Validate file type - accept PDFs and common document types
        const validTypes: string[] = [
            MIME_TYPES.pdf,
            'application/msword', // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/vnd.ms-excel', // .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-powerpoint', // .ppt
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
            'text/plain', // .txt
            'text/csv', // .csv
            'application/rtf', // .rtf
        ];

        // Check file extension as fallback if MIME type is missing or incorrect
        const fileName = file.name.toLowerCase();
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic', '.heif', '.tiff', '.ico'];
        if (imageExtensions.some(ext => fileName.endsWith(ext))) {
            return 'Images are not allowed. Please use the image upload feature for images. Only PDF, Word, Excel, PowerPoint, or text files are allowed here.';
        }

        if (!file.type || !validTypes.includes(file.type)) {
            return 'Invalid file type. Please upload PDF, Word, Excel, PowerPoint, or text files only. Images are not allowed.';
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

        try {
            // Create form data for resource upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('resource_type', 'DOCUMENT');

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
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain',
                'text/csv',
                'application/rtf',
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
                    <Dropzone.Idle>Upload files</Dropzone.Idle>
                </Text>
                <Text ta="center" fz="sm" mt="xs" c="dimmed">
                    Drag and drop files here to upload. You can upload multiple files at once.
                    Supported formats: PDF, Word, Excel, PowerPoint, and text files.
                    Maximum file size: 150MB.
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

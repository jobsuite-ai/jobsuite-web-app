'use client';

import '@mantine/dropzone/styles.css';
import { useEffect, useRef, useState } from 'react';

import { Group, rem, Text } from '@mantine/core';
import { Dropzone, FileWithPath, MIME_TYPES } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconCloudUpload, IconDownload, IconX } from '@tabler/icons-react';

import classes from './styles/EstimateDetails.module.css';

import { JobImage, UpdateJobContent } from '@/app/api/projects/jobTypes';

type UploadState = 'idle' | 'preparing' | 'uploading' | 'updating' | 'error';

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
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<FileWithPath | null>(null);
    const openRef = useRef<() => void>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleFileDrop = async (files: FileWithPath[]) => {
        if (files.length === 0) return;

        const file = files[0];

        // Validate file size
        const maxSize = 150 * 1024 * 1024; // 150MB
        if (file.size > maxSize) {
            const errorMsg = `File size (${formatFileSize(file.size)}) exceeds the 150MB limit`;
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
        const validTypes: string[] = [
            MIME_TYPES.pdf,
            MIME_TYPES.heic,
            MIME_TYPES.heif,
            MIME_TYPES.png,
            MIME_TYPES.jpeg,
        ];
        if (!validTypes.includes(file.type)) {
            const errorMsg = 'Invalid file type. Please upload PDF, HEIC, HEIF, PNG, or JPEG files.';
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
            setUploadedFile(file);
            setUploadState('preparing');
            setErrorMessage(null);

            // Request presigned URL
            const response = await fetch(
                '/api/images',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filename: file.name,
                        contentType: file.type,
                        estimateID,
                    }),
                }
            );

            if (!isMountedRef.current) return;

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.message || errorData.error || 'Failed to generate presigned URL';
                throw new Error(errorMsg);
            }

            const { url, fields } = await response.json();

            if (!isMountedRef.current) return;

            setUploadState('uploading');

            // Upload file to S3
            const formData = new FormData();
            Object.entries(fields).forEach(([key, value]) => {
                formData.append(key, value as string);
            });
            formData.append('file', file);

            const uploadResponse = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            if (!isMountedRef.current) return;

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload file to storage');
            }

            notifications.show({
                title: 'Image upload started',
                position: 'top-center',
                color: 'green',
                message: `Uploading ${file.name} (${formatFileSize(file.size)})...`,
            });

            // Update job with image metadata
            setUploadState('updating');
            await updateJobWithImages([file]);

            if (!isMountedRef.current) return;

            notifications.show({
                title: 'Upload Successful',
                position: 'top-center',
                color: 'green',
                message: 'Your image has been uploaded successfully.',
            });

            setImage(file.name);
            setShowModal(false);
            setUploadState('idle');
            setUploadedFile(null);
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

    async function updateJobWithImages(files: FileWithPath[]) {
        if (!files || files.length === 0) return;

        const content: UpdateJobContent = {
            images: new Array<JobImage>(),
        };
        files.forEach((file) => {
            content.images?.push({
                name: file.name,
                size: file.size,
                lastModified: file.lastModified,
            });
        });

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
                const errorMsg = errorData.message || errorData.error || 'Failed to update estimate with image';
                throw new Error(errorMsg);
            }

            await response.json();
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to update estimate';
            throw new Error(`Failed to update estimate: ${errorMsg}`);
        }
    }

    return (
        <div className={classes.sectionContent}>
            <Dropzone
              loading={uploadState !== 'idle'}
              openRef={openRef}
              maxFiles={1}
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
                    <Dropzone.Idle>Upload a picture of the house</Dropzone.Idle>
                </Text>
                <Text ta="center" fz="sm" mt="xs" c="dimmed">
                    Drag and drop an image here to upload. We can only accept files that
                    are less than 150MB in size.
                </Text>
                {uploadState === 'preparing' && uploadedFile && (
                    <Text ta="center" fz="sm" mt="md" c="dimmed">
                        Preparing {uploadedFile.name} ({formatFileSize(uploadedFile.size)})...
                    </Text>
                )}
                {uploadState === 'uploading' && uploadedFile && (
                    <Text ta="center" fz="sm" mt="md" c="dimmed">
                        Uploading {uploadedFile.name} ({formatFileSize(uploadedFile.size)})...
                    </Text>
                )}
                {uploadState === 'updating' && uploadedFile && (
                    <Text ta="center" fz="sm" mt="md" c="dimmed">
                        Updating estimate...
                    </Text>
                )}
                {uploadState === 'error' && errorMessage && (
                    <Text ta="center" fz="sm" mt="md" c="red">
                        {errorMessage}
                    </Text>
                )}
            </Dropzone>
        </div>
    );
}

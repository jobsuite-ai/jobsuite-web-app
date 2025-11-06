'use client';

import '@mantine/dropzone/styles.css';
import { useRef, useState } from 'react';

import { Group, rem, Text } from '@mantine/core';
import { Dropzone, FileWithPath, MIME_TYPES } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconCloudUpload, IconDownload, IconX } from '@tabler/icons-react';

import classes from './styles/VideoUploader.module.css';

import { JobImage, UpdateJobContent } from '@/app/api/projects/jobTypes';

export default function ImageUpload({ jobID, setImage, setShowModal }: {
    jobID: string, setImage: Function, setShowModal: Function
}) {
    const [loading, setLoading] = useState(false);
    const [uploadFailure, setUploadFailure] = useState(false);
    const openRef = useRef<() => void>(null);

    const handleVideoDrop = (files: FileWithPath[]) => {
        uploadDocuments(files);
        updateJobWithImages(files);
    };

    async function uploadDocuments(files: FileWithPath[]) {
        setLoading(true);
        const filePromises = files.map((file) => uploadDocument(file));
        await Promise.all(filePromises);
        setLoading(false);

        setShowModal(false);
        setImage(files[0].name);

        if (uploadFailure) {
            notifications.show({
                title: 'Upload Failed',
                position: 'top-center',
                color: 'red',
                message: 'Failed to get presigned url.',
            });
        }
    }

    async function uploadDocument(file: FileWithPath) {
        const response = await fetch(
            '/api/images',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filename: file.name, contentType: file.type, jobID }),
            }
        );

        if (response.ok) {
            const { url, fields } = await response.json();

            const formData = new FormData();
            Object.entries(fields).forEach(([key, value]) => {
                formData.append(key, value as string);
            });
            formData.append('file', file);

            const uploadResponse = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                setUploadFailure(true);
            }
        }
    }

    async function updateJobWithImages(files: FileWithPath[]) {
        if (files) {
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

            const response = await fetch(
                '/api/jobs',
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content, jobID }),
                }
            );

            await response.json();
        }
    }

    return (
        <div className={classes.imageWrapper}>
            <div style={{ width: '100%' }}>
                <Dropzone
                  loading={loading}
                  openRef={openRef}
                  maxFiles={1}
                  onDrop={(vids) => handleVideoDrop(vids)}
                  maxSize={150 * 1024 * 1024}
                  accept={[
                    MIME_TYPES.pdf,
                    MIME_TYPES.heic,
                    MIME_TYPES.heif,
                    MIME_TYPES.png,
                    MIME_TYPES.jpeg,
                  ]}
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
                        <Dropzone.Reject>Files less than 50mb</Dropzone.Reject>
                        <Dropzone.Idle>Upload a picture of the house</Dropzone.Idle>
                    </Text>
                    <Text ta="center" fz="sm" mt="xs" c="dimmed">
                        Drag and drop an image here to upload. We can only accept files that
                        are less than 50mb in size.
                    </Text>
                </Dropzone>
            </div>
        </div>
    );
}

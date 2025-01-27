"use client";

import { Group, rem, Text } from '@mantine/core';
import { Dropzone, FileWithPath, MIME_TYPES } from '@mantine/dropzone';
import '@mantine/dropzone/styles.css';
import { notifications } from '@mantine/notifications';
import { IconCloudUpload, IconDownload, IconPhoto, IconX } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import classes from './styles/VideoUploader.module.css';
import { JobImage, UpdateJobContent } from '@/app/api/jobs/jobTypes';

export default function ImageUpload({ jobID, setImages }: { jobID: string, setImages: Function }) {
    const [loading, setLoading] = useState(false);
    const [uploadFailure, setUploadFailure] = useState(false);
    const [localImages, setLocalImages] = useState<FileWithPath[]>();
    const openRef = useRef<() => void>(null);

    const handleVideoDrop = (files: FileWithPath[]) => {
        uploadDocuments(files);
        updateJobWithImages(files);
    }

    async function uploadDocuments(files: FileWithPath[]) {
        setLoading(true);
        const filePromises = files.map((file) => uploadDocument(file));
        const _ = await Promise.all(filePromises);
        setLoading(false);

        setLocalImages(files);
        setImages(files.map((file) => file.name));

        if (uploadFailure) {
            notifications.show({
                title: 'Upload Failed',
                position: 'top-center',
                color: 'red',
                message: 'Failed to get presigned url.',
            })
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
                body: JSON.stringify({ filename: file.name, contentType: file.type, jobID: jobID }),
            }
        )

        if (response.ok) {
            const { url, fields } = await response.json()

            const formData = new FormData();
            Object.entries(fields).forEach(([key, value]) => {
                formData.append(key, value as string)
            })
            formData.append('file', file)

            const uploadResponse = await fetch(url, {
                method: 'POST',
                body: formData,
            })

            if (!uploadResponse.ok) {
                setUploadFailure(true);
            }
        }
    }

    async function updateJobWithImages(files: FileWithPath[]) {
        if (files) {
            const content: UpdateJobContent = {
                images: new Array<JobImage>()
            }
            files.forEach((file) => {
                content.images?.push({
                    name: file.name,
                    size: file.size,
                    lastModified: file.lastModified
                })
            })

            const response = await fetch(
                `/api/jobs`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content: content, jobID: jobID }),
                }
            )

            const { Attributes } = await response.json();
        }
    }

    function roundToTwoDecimals(num: number): number {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    const getFileSizeFromBytes = (size: number): string => {
        if (size > 50 * 1024 ** 2) {
            return 'This file is too large to upload';
        }

        let step = 0;
        let adjustedSize = size;
        while (adjustedSize > 1024) {
            adjustedSize = adjustedSize/1024;
            step += 1;
        }

        const roundedSize = roundToTwoDecimals(adjustedSize);

        switch (step) {
            case 0:
                return roundedSize + ' bytes';
            case 1:
                return roundedSize + ' KB';
            default:
                return roundedSize + ' MB';
        }
    }

    return (
        <div className={classes.imageWrapper}>
            <div style={{ width: '100%' }}>
                <Dropzone
                    loading={loading}
                    openRef={openRef}
                    onDrop={(vids) => handleVideoDrop(vids)}
                    maxSize={150 * 1024 * 1024}
                    accept={[MIME_TYPES.pdf, MIME_TYPES.heic, MIME_TYPES.heif, MIME_TYPES.png, MIME_TYPES.jpeg]}
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
                            <IconCloudUpload style={{ width: rem(50), height: rem(50) }} stroke={1.5} />
                        </Dropzone.Idle>
                    </Group>

                    <Text ta="center" fz="lg" mt="xl">
                        <Dropzone.Accept>Drop files here</Dropzone.Accept>
                        <Dropzone.Reject>Files less than 50mb</Dropzone.Reject>
                        <Dropzone.Idle>Upload pictures of the house</Dropzone.Idle>
                    </Text>
                    <Text ta="center" fz="sm" mt="xs" c="dimmed">
                        Drag and drop files here to upload. We can only accept files that
                        are less than 50mb in size.
                    </Text>
                </Dropzone>
                {localImages && (
                    <>
                        {localImages.map((image) => (
                            <div key={image.name} className={classes.videoWrapper}>
                                <div className={classes.videoBox}>
                                    <IconPhoto size={40} />
                                    <div className={classes.videoDetails}>
                                        <Text size="sm" fw={600}>{image.name}</Text>
                                        <Text size="xs">{getFileSizeFromBytes(image.size)}</Text>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
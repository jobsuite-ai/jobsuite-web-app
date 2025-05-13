'use client';

import { useRef, useState } from 'react';

import { Group, rem, Text } from '@mantine/core';
import { Dropzone, FileWithPath, MIME_TYPES } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconCloudUpload, IconDownload, IconX } from '@tabler/icons-react';

import classes from './styles/VideoUploader.module.css';

import { UpdateJobContent } from '@/app/api/jobs/jobTypes';

interface PresignedPostData {
    url: string;
    fields: Record<string, string>;
}

async function requestPresignedPost(file: File, jobID: string): Promise<PresignedPostData> {
    const parsedFileName = file.name.replaceAll(' ', '_');
    const response = await fetch(
        '/api/pdfs',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filename: parsedFileName, contentType: file.type, jobID }),
        }
    );

    if (!response.ok) {
        throw new Error('Failed to generate presigned URL');
    }

    const responseJson = await response.json();
    return responseJson;
}

export default function PdfUploader({ jobID, refresh }: { jobID: string, refresh: Function }) {
    const [pdf, setPdf] = useState<FileWithPath | null>(null);
    const openRef = useRef<() => void>(null);

    const handleFileUpload = async (files: File[]) => {
        if (files.length === 0) return;

        const file = files[0];
        try {
            setPdf(file);
            const presignedPostData = await requestPresignedPost(file, jobID);
            const arrayBuffer = await file.arrayBuffer();

            if (navigator.serviceWorker.controller) {
                const messageChannel = new MessageChannel();

                // Set up a promise to handle the service worker response
                const uploadPromise = new Promise((resolve, reject) => {
                    messageChannel.port1.onmessage = (event) => {
                        if (event.data.success) {
                            resolve(true);
                        } else {
                            reject(new Error('Upload failed in service worker'));
                        }
                    };
                });

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

                try {
                    await uploadPromise;
                    notifications.show({
                        title: 'PDF upload successful',
                        position: 'top-center',
                        color: 'green',
                        message: 'Your PDF has been uploaded successfully.',
                    });
                    await updateJobWithPdf(file);
                } catch (error) {
                    throw new Error(`Service worker upload failed: ${error}`);
                }
            } else {
                // Try to register the service worker if it's not available
                try {
                    const registration = await navigator.serviceWorker.register('/service-worker.js');
                    await navigator.serviceWorker.ready;

                    if (registration.active) {
                        // Retry the upload with the newly registered service worker
                        handleFileUpload(files);
                    } else {
                        throw new Error('Service worker not active after registration');
                    }
                } catch (error) {
                    notifications.show({
                        title: 'Upload Failed',
                        position: 'top-center',
                        color: 'red',
                        message: 'Failed to initialize upload service. Please try again.',
                    });
                }
            }
        } catch (error: any) {
            setPdf(null); // Reset the PDF state on error
            notifications.show({
                title: 'Upload Failed',
                position: 'top-center',
                color: 'red',
                message: `Error during upload: ${error.message || error}`,
            });
        }
    };

    async function updateJobWithPdf(newPdf: FileWithPath) {
        if (newPdf) {
            const content: UpdateJobContent = {
                pdf: {
                    name: { S: newPdf.name },
                    size: { N: newPdf.size.toString() },
                    lastModified: { N: newPdf.lastModified.toString() },
                },
            };

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
            refresh();
        }
    }

    return (
        <>
            {pdf == null && (
                <Dropzone
                  openRef={openRef}
                  onDrop={(files) => handleFileUpload(files)}
                  maxSize={50 * 1024 * 1024}
                  accept={[MIME_TYPES.pdf]}
                  className={classes.wrapper}
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
                            <Dropzone.Reject>PDF files only</Dropzone.Reject>
                            <Dropzone.Idle>Upload PDF document</Dropzone.Idle>
                        </Text>
                        <Text ta="center" fz="sm" mt="xs" c="dimmed">
                            Drag and drop files here to upload. We can only accept PDF files that
                            are less than 50MB in size.
                        </Text>
                    </div>
                </Dropzone>
            )}

            {pdf && (
                <div className={classes.wrapper}>
                    <Text ta="center" fz="lg">
                        Your PDF is uploading
                    </Text>
                    <Text ta="center" fz="sm" mt="xs" c="dimmed">
                        If this process takes longer than a few minutes,
                        please reach out to support.
                    </Text>
                </div>
            )}
        </>
    );
}

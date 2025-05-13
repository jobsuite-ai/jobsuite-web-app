'use client';

import React, { useRef, useState } from 'react';

import { Flex, Group, Paper, rem, Text } from '@mantine/core';
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
        '/api/videos',
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

    return response.json();
}

export default function VideoUploader({ jobID, refresh }: { jobID: string, refresh: Function }) {
    const [video, setVideo] = useState<FileWithPath | null>(null);
    const openRef = useRef<() => void>(null);

    const handleFileUpload = async (files: File[]) => {
        if (files.length === 0) return;

        const file = files[0];
        try {
            setVideo(file);
            const presignedPostData = await requestPresignedPost(file, jobID);
            const arrayBuffer = await file.arrayBuffer();

            if (navigator.serviceWorker.controller) {
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
                    message: 'Your video is uploading.',
                });
                updateJobWithVideo(file);
            } else {
                notifications.show({
                    title: 'Upload Failed',
                    position: 'top-center',
                    color: 'red',
                    message: 'The video upload failed, please make sure the video isn\'t over 1GB and try again.',
                });
            }
        } catch (error) {
            notifications.show({
                title: 'Upload Failed',
                position: 'top-center',
                color: 'red',
                message: `Error during upload: ${error}`,
            });
        }
    };

    async function updateJobWithVideo(newVideo: FileWithPath) {
        if (newVideo) {
            const content: UpdateJobContent = {
                video: {
                    name: newVideo.name,
                    size: newVideo.size,
                    lastModified: newVideo.lastModified,
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
            {video == null && (
                <Dropzone
                  openRef={openRef}
                  onDrop={(vids) => handleFileUpload(vids)}
                  maxSize={1024 * 1024 * 1024}
                  accept={[MIME_TYPES.mp4, 'video/quicktime', 'video/hevc']}
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
                            <Dropzone.Reject>Files less than 1GB</Dropzone.Reject>
                            <Dropzone.Idle>Upload walk around video</Dropzone.Idle>
                        </Text>
                        <Text ta="center" fz="sm" mt="xs" c="dimmed">
                            Drag and drop files here to upload. We can only accept files that
                            are less than 1GB in size.
                        </Text>
                    </div>
                </Dropzone>
            )}

            {video && (
                <Paper shadow="sm" radius="md" withBorder pr="lg" pb="lg" pl="lg" className={classes.wrapper}>
                    <Flex direction="column" justify="center" align="center" p="lg" h="100%">
                        <Text ta="center" fz="lg">
                            Your video is uploading
                        </Text>
                        <Text ta="center" fz="sm" mt="xs" c="dimmed">
                            If this process takes longer than 10 minutes,
                            please reach out to support.
                        </Text>
                    </Flex>
                </Paper>
            )}
        </>
    );
}

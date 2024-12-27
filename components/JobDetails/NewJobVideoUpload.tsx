"use client";

import { Group, rem, Text } from '@mantine/core';
import { Dropzone, FileWithPath, MIME_TYPES } from '@mantine/dropzone';
import '@mantine/dropzone/styles.css';
import { notifications } from '@mantine/notifications';
import { IconCloudUpload, IconDownload, IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import classes from './styles/NewJobVideoUpload.module.css';
import { VideoFrame } from './VideoFrame';

export function NewJobVideoUpload({ jobID }: { jobID: string }) {
    const [video, setVideo] = useState<FileWithPath | null>(null);
    const [loading, setLoading] = useState(false);
    const openRef = useRef<() => void>(null);

    useEffect(() => {
        if (!loading && video !== null) {
            convertVideoToAudio();
        }
    }, [loading]);

    const handleVideoDrop = (files: FileWithPath[]) => {
        uploadDocuments(files);
        updateJobWithVideo(files);
    }

    async function convertVideoToAudio() {
        const file = video as FileWithPath;

        const response = await fetch(
            '/api/convert',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filename: file.name, jobID: jobID }),
            }
        )
    }

    async function uploadDocuments(files: FileWithPath[]) {
        const file = files[0];
        setLoading(true);

        const response = await fetch(
            '/api/videos',
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

            if (uploadResponse.ok) {
                setLoading(false);
                setVideo(file);
                notifications.show({
                    title: 'Success!',
                    position: 'top-center',
                    color: 'green',
                    message: 'The video was successfully uploaded, proceed to the next step.',
                });
            } else {
                setLoading(false);
                notifications.show({
                    title: 'Upload Failed',
                    position: 'top-center',
                    color: 'red',
                    message: 'The video upload failed, please make sure the video isn\'t over 50mb and try again.',
                })
            }
        } else {
            notifications.show({
                title: 'Upload Failed',
                position: 'top-center',
                color: 'red',
                message: 'Failed to get presigned url.',
            })
        }
    }

    async function updateJobWithVideo(files: FileWithPath[]) {
        const video = files[0];
        if (video) {
            const content = {
                video: {
                    name: video.name,
                    size: video.size,
                    lastModified: video.lastModified
                }
            }

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

    return (
        <>
            {video == null && (
                <Dropzone
                    loading={loading}
                    openRef={openRef}
                    onDrop={(vids) => handleVideoDrop(vids)}
                    maxSize={150 * 1024 * 1024}
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
                                <IconCloudUpload style={{ width: rem(50), height: rem(50) }} stroke={1.5} />
                            </Dropzone.Idle>
                        </Group>

                        <Text ta="center" fz="lg" mt="xl">
                            <Dropzone.Accept>Drop files here</Dropzone.Accept>
                            <Dropzone.Reject>Files less than 150mb</Dropzone.Reject>
                            <Dropzone.Idle>Upload walk around video</Dropzone.Idle>
                        </Text>
                        <Text ta="center" fz="sm" mt="xs" c="dimmed">
                            Drag and drop files here to upload. We can only accept files that
                            are less than 150mb in size.
                        </Text>
                    </div>
                </Dropzone>
            )}

            {video && (
                <div>
                    <VideoFrame name={video.name} />
                </div>
            )}
        </>
    );
}
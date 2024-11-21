"use client";

import { Button, Group, rem, Text } from '@mantine/core';
import { Dropzone, FileWithPath, MIME_TYPES } from '@mantine/dropzone';
import '@mantine/dropzone/styles.css';
import { UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconCloudUpload, IconDownload, IconMovie, IconX } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import '@mantine/dropzone/styles.css';
import classes from './Styling/NewJobVideoUpload.module.css';

export function NewJobVideoUpload({ form }: { form: UseFormReturnType<any> }) {
    const [video, setVideos] = useState<FileWithPath | null>(null);
    const [loading, setLoading] = useState(false);
    const openRef = useRef<() => void>(null);

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
                body: JSON.stringify({ filename: file.name, contentType: file.type, jobID: form.getValues().jobID }),
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
                setVideos(file);
                notifications.show({
                    title: 'Success!',
                    position: 'top-center',
                    color: 'green',
                    message: 'The video was successfully uploaded, proceed to the next step.',
                });

                form.setValues({
                    video: {
                        aws_key: form.getValues().jobID + '/' + file.name,
                        type: file.type,
                        size: file.size,
                        name: file.name,
                    }
                })
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

    const removeVideoUpload = () => {
        form.setValues({ video: {} })
        setVideos(null);
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
            adjustedSize = adjustedSize / 1024;
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
        <>
            {video == null && (
                <div className={classes.wrapper}>
                    <Dropzone
                        loading={loading}
                        openRef={openRef}
                        onDrop={(vids) => uploadDocuments(vids)}
                        maxSize={150 * 1024 * 1024}
                        accept={[MIME_TYPES.mp4, 'video/quicktime']}
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
                            <Dropzone.Reject>Files less than 30mb</Dropzone.Reject>
                            <Dropzone.Idle>Upload walk around video</Dropzone.Idle>
                        </Text>
                        <Text ta="center" fz="sm" mt="xs" c="dimmed">
                            Drag and drop files here to upload. We can only accept files that
                            are less than 50mb in size.
                        </Text>
                    </Dropzone>

                    <Group justify="center" mt="md">
                        <Button onClick={() => openRef.current?.()}>Select files</Button>
                    </Group>
                </div>
            )}

            {video && (
                <div key={video.name} className={classes.videoWrapper}>
                    <div className={classes.videoBox}>
                        <IconMovie size={40} />
                        <div className={classes.videoDetails}>
                            <Text size="sm" fw={600}>{video.name}</Text>
                            <Text size="xs">{getFileSizeFromBytes(video.size)}</Text>
                        </div>
                        <IconX onClick={removeVideoUpload} size={20} className={classes.removeVideo} />
                    </div>
                </div>
            )}
        </>
    );
}
"use client";

import { Button, Group, rem, Text } from '@mantine/core';
import { Dropzone, FileWithPath, MIME_TYPES } from '@mantine/dropzone';
import { UseFormReturnType } from '@mantine/form';
import { IconMovie, IconCloudUpload, IconDownload, IconX } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import classes from './Styling/NewJobVideoUpload.module.css';


export function NewJobVideoUpload({ form }: { form: UseFormReturnType<any> }) {
    const [video, setVideos] = useState<FileWithPath | null>(null);
    const openRef = useRef<() => void>(null);

    const handleVideoUpload = (videos: FileWithPath[]) => {
        const vid = videos[0];
        form.setValues({ video:{
            type: vid.type,
            path: vid.path,
            size: vid.size,
            name: vid.name,
        }})
        setVideos(vid);
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
        <div
            className={classes.wrapper}
        >
            {video == null && (
                <>
                    <Dropzone
                        openRef={openRef}
                        onDrop={(vid) => handleVideoUpload(vid)}
                        maxSize={50 * 1024 ** 2}
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

                        <Text ta="center" fw={700} fz="lg" mt="xl">
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
                </>
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
        </div>
    );
}
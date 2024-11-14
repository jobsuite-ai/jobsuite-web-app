"use client";

import { Button, Group, rem, Text } from '@mantine/core';
import { Dropzone, FileWithPath, MIME_TYPES } from '@mantine/dropzone';
import { UseFormReturnType } from '@mantine/form';
import { IconCloudUpload, IconDownload, IconX } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import classes from './Styling/NewJobVideoUpload.module.css';


export function NewJobVideoUpload({ form }: { form: UseFormReturnType<any> }) {
    const [videos, setVideos] = useState<FileWithPath[] | []>([]);
    const openRef = useRef<() => void>(null);

    const handleVideoUpload = (video: FileWithPath[]) => {
        form.setValues({ video: video })
        setVideos(video);
    }

    return (
        <div
            className={classes.wrapper}
        >
            <Dropzone
                openRef={openRef}
                onDrop={(video) => handleVideoUpload(video)}
                maxSize={50 * 1024 ** 2}
                accept={[MIME_TYPES.pdf, MIME_TYPES.heic, MIME_TYPES.mp4, MIME_TYPES.jpeg]}
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
                    <Dropzone.Idle>Upload resume</Dropzone.Idle>
                </Text>
                <Text ta="center" fz="sm" mt="xs" c="dimmed">
                    Drag and drop files here to upload. We can only accept files that
                    are less than 50mb in size.
                </Text>
            </Dropzone>

            <Group justify="center" mt="md">
                <Button onClick={() => openRef.current?.()}>Select files</Button>
            </Group>

            {videos.map((video) => (
                <Text size="sm" ta="center" mt="sm" key={video.name}>
                    Picked file: {video.name}
                </Text>
            ))}
        </div>
    );
}
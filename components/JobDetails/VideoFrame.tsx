'use client';

import { useEffect, useState } from 'react';

import { Button, Center, Flex, Modal, Paper, Text } from '@mantine/core';
import { useParams } from 'next/navigation';
import ReactPlayer from 'react-player';

import classes from './styles/JobDetails.module.css';

import { UpdateJobContent } from '@/app/api/jobs/jobTypes';

export function VideoFrame({ name, jobID, refresh }: {
    name: string,
    jobID: string,
    refresh: Function
}) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [objectExists, setObjectExists] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { job_id } = useParams();

    useEffect(() => {
        setIsMobile(window.innerWidth <= 768);
        checkIfVideoExists();
    }, []);

    const key = `${job_id}/${name}`;
    const baseCloudFrontURL = 'https://rl-peek-job-videos.s3.us-west-2.amazonaws.com/';

    async function checkIfVideoExists() {
        const response = await fetch(
            '/api/s3',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ bucketName: process.env.AWS_BUCKET_NAME, objectKey: key }),
            }
        );

        if (response.ok) {
            const { exists, error } = await response.json();
            if (!error) {
                setObjectExists(exists);
            } else {
                setObjectExists(false);
            }
        } else {
            setObjectExists(false);
        }
    }

    const deleteVideo = async () => {
        const content: UpdateJobContent = {
            delete_video: true,
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

        await refresh();
        setIsModalOpen(false);
    };

    return (
        <>
            <Paper shadow="sm" radius="md" withBorder className={classes.videoFrame}>
                {objectExists ?
                    <>
                        {isMobile ? (
                            <ReactPlayer url={baseCloudFrontURL + key} controls width="100%" height="auto" />
                        ) : (
                            <ReactPlayer url={baseCloudFrontURL + key} controls width="640px" height="360px" />
                        )}
                    </>
                    :
                    <Flex direction="column" justify="center" align="center" p="lg" h="100%">
                        <Text ta="center" fz="lg">
                            Your video is uploading
                        </Text>
                        <Text ta="center" fz="sm" mt="xs" c="dimmed">
                            If this process takes longer than 10 minutes,
                            please reach out to support.
                        </Text>
                    </Flex>
                }
                <Center my="md">
                    <Button onClick={() => setIsModalOpen(true)}>Delete Video</Button>
                </Center>
            </Paper>

            <Modal
              opened={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              size="lg"
              title={<Text fz={30} fw={700}>Are you sure?</Text>}
            >
                <Center mt="md">
                    <Flex direction="column">
                        <Text mb="lg">
                            This will delete the video,
                            transcription summary and spanish transcription.
                        </Text>
                        <Flex direction="row" gap="lg" justify="center" align="cemter">
                            <Button type="submit" onClick={deleteVideo}>Confirm</Button>
                            <Button type="submit" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        </Flex>
                    </Flex>
                </Center>
            </Modal>
        </>
    );
}

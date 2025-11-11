'use client';

import { useEffect, useState } from 'react';

import { Button, Center, Flex, Modal, Text } from '@mantine/core';
import ReactPlayer from 'react-player';

import classes from './styles/EstimateDetails.module.css';

import { EstimateResource } from '@/components/Global/model';

export function VideoFrame({ resource, estimateID, refresh }: {
    resource: EstimateResource,
    estimateID: string,
    refresh: Function
}) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        setIsMobile(window.innerWidth <= 768);
    }, []);

    const getVideoBucket = () => {
        const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
        return `jobsuite-resource-videos-${env}`;
    };

    const videoUrl = resource.s3_key
        ? `https://${getVideoBucket()}.s3.us-west-2.amazonaws.com/${resource.s3_key}`
        : null;
    const objectExists = resource.upload_status === 'COMPLETED' && videoUrl !== null;

    const deleteVideo = async () => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) return;

        try {
            const response = await fetch(
                `/api/estimates/${estimateID}/resources/${resource.id}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.ok) {
                await refresh();
                setIsModalOpen(false);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error deleting video:', error);
        }
    };

    return (
        <>
            <div className={classes.videoContainer}>
                {objectExists ?
                    <>
                        <div className={classes.videoPlayerWrapper}>
                            {videoUrl && (isMobile ? (
                                <ReactPlayer url={videoUrl} controls width="100%" height="auto" />
                            ) : (
                                <ReactPlayer url={videoUrl} controls width="640px" height="360px" />
                            ))}
                        </div>
                        <Flex direction="column" align="center" p="md">
                            <Center>
                                <Button onClick={() => setIsModalOpen(true)}>Delete Video</Button>
                            </Center>
                        </Flex>
                    </>
                    :
                    <div className={classes.uploadState}>
                        <Text ta="center" fz="lg">
                            Your video is uploading
                        </Text>
                        <Text ta="center" fz="sm" mt="xs" c="dimmed">
                            If this process takes longer than 10 minutes,
                            please reach out to support.
                        </Text>
                        <Center my="md">
                            <Button onClick={() => setIsModalOpen(true)}>Retry Upload</Button>
                        </Center>
                    </div>
                }
            </div>

            <Modal
              opened={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              size="lg"
              title={<Text fz={30} fw={700}>Are you sure?</Text>}
            >
                <Center mt="md">
                    <Flex direction="column">
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

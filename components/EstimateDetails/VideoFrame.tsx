'use client';

import { useCallback, useState } from 'react';

import { Button, Center, Flex, Modal, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconDownload } from '@tabler/icons-react';
import ReactPlayer from 'react-player';

import classes from './styles/EstimateDetails.module.css';

import { EstimateResource } from '@/components/Global/model';

export function VideoFrame({ resource, estimateID, refresh }: {
    resource: EstimateResource,
    estimateID: string,
    refresh: Function
}) {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [isModalOpen, setIsModalOpen] = useState(false);

    /**
     * Determines if the environment is production based on env variables or
     * fallback to window.location.
     * Uses NEXT_PUBLIC_ENV (from .env), or NODE_ENV as a fallback.
     * - If NEXT_PUBLIC_ENV is set to 'production', returns true.
     * - If NEXT_PUBLIC_ENV is 'development' or 'qa', returns false.
     * - Otherwise, falls back to window.location.hostname for runtime detection (client-side only).
     */
    const isProduction = () => {
        // First, try to use the system environment variable (set via .env file)
        if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_ENV) {
            // You should set NEXT_PUBLIC_ENV in your .env files
            // (.env.production, .env.qa, .env.development)
            // e.g. NEXT_PUBLIC_ENV="production" for prod, "qa" for QA, etc.
            return process.env.NEXT_PUBLIC_ENV === 'production';
        }
        // Fallback: check NODE_ENV
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
            return process.env.NODE_ENV === 'production';
        }
        // Last resort: determine at runtime via window.location (client-side only)
        if (typeof window !== 'undefined') {
            const { hostname } = window.location;
            // If hostname contains 'qa', it's QA environment → use dev bucket
            if (hostname.includes('qa')) {
                return false;
            }
            // Production domain is jobsuite.app (or www.jobsuite.app)
            // Only use prod bucket for production domain
            return hostname === 'jobsuite.app' || hostname === 'www.jobsuite.app';
        }
        // Fallback: default to dev for safety
        return false;
    };

    const getVideoBucket = () => {
        const env = isProduction() ? 'prod' : 'dev';
        return `jobsuite-resource-videos-${env}`;
    };

    // Determine region based on bucket name (more reliable than env vars)
    // If bucket name contains '-prod', use us-east-1, otherwise us-west-2
    const bucketName = resource.s3_bucket || getVideoBucket();
    const isProdBucket = bucketName.includes('-prod');
    const region = isProdBucket ? 'us-east-1' : 'us-west-2';

    const videoUrl = resource.s3_key
        ? `https://${bucketName}.s3.${region}.amazonaws.com/${resource.s3_key}`
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

    const downloadVideo = useCallback(async () => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) return;

        try {
            const response = await fetch(
                `/api/estimates/${estimateID}/resources/${resource.id}/presigned-url`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to get download URL');
            }

            const data = await response.json();
            const presignedUrl = data.presigned_url || data.url;

            if (presignedUrl) {
                window.open(presignedUrl, '_blank');
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to download video:', error);
        }
    }, [estimateID, resource.id]);

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
                        <Flex direction="column" align="center" p="md" gap="sm">
                            <Center>
                                <Button onClick={() => setIsModalOpen(true)}>Delete Video</Button>
                            </Center>
                            {isMobile && (
                              <Button
                                variant="light"
                                leftSection={<IconDownload size={18} />}
                                onClick={downloadVideo}
                              >
                                Download Video
                              </Button>
                            )}
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
              centered
              title={<Text fz={30} fw={700}>Are you sure?</Text>}
            >
                <Center mt="md">
                    <Flex direction="column">
                        <Flex direction="row" gap="lg" justify="center" align="center">
                            <Button type="submit" onClick={deleteVideo}>Confirm</Button>
                            <Button type="submit" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        </Flex>
                    </Flex>
                </Center>
            </Modal>
        </>
    );
}

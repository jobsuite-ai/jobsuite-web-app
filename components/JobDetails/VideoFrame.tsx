"use client";

import { Flex, Paper, Text } from "@mantine/core";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactPlayer from "react-player";
import classes from './styles/JobDetails.module.css';


export function VideoFrame({ name }: { name: string }) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [objectExists, setObjectExists] = useState(true);
    const { job_id } = useParams();

    useEffect(() => {
        setIsMobile(window.innerWidth <= 768);
        checkIfVideoExists();
    }, []);

    const key = job_id + '/' + name;
    const baseCloudFrontURL = "https://rl-peek-job-videos.s3.us-west-2.amazonaws.com/";

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
        )

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

    return (
        <Paper shadow='sm' radius='md' withBorder className={classes.videoFrame}>
            {objectExists ?
                <>
                    {isMobile ? (
                        <ReactPlayer url={baseCloudFrontURL + key} controls={true} width='100%' height='auto' />
                    ) : (
                        <ReactPlayer url={baseCloudFrontURL + key} controls={true} width='640px' height='360px' />
                    )}
                </>
                :
                <Flex direction="column" justify='center' align="center" p="lg" h="100%">
                    <Text ta="center" fz="lg">
                        Your video is uploading
                    </Text>
                    <Text ta="center" fz="sm" mt="xs" c="dimmed">
                        If this process takes longer than 10 minutes, please reach out to support.
                    </Text>
                </Flex>
            }
        </Paper>
    )
}

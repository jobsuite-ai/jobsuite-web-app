"use client";

import { Paper } from "@mantine/core";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactPlayer from "react-player";
import classes from './styles/JobDetails.module.css';



export function VideoFrame({ name }: { name: string }) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const { job_id } = useParams();

    useEffect(() => {
        setIsMobile(window.innerWidth <= 768);
    }, []);

    const key = job_id + '/' + name;
    const baseCloudFrontURL = "https://rl-peek-job-videos.s3.us-west-2.amazonaws.com/";

    return (
        <Paper shadow='sm' radius='md' withBorder className={classes.videoFrame}>
            {isMobile ? (
                <ReactPlayer url={baseCloudFrontURL + key} controls={true} width='100%' height='auto' />
            ) : (
                <ReactPlayer url={baseCloudFrontURL + key} controls={true} width='640px' height='360px' />
            )}
        </Paper>
    )
}

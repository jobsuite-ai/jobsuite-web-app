"use client";

import { Paper } from "@mantine/core";
import { useParams } from "next/navigation";
import ReactPlayer from "react-player";
import classes from './styles/JobDetails.module.css';



export function VideoFrame({ name }: { name: string }) {
    const { job_id } = useParams();
    const key = job_id + '/' + name;

    const baseCloudFrontURL = "https://rl-peek-job-videos.s3.us-west-2.amazonaws.com/";
    const responsiveWidth = window.innerWidth <= 768 ? '320px' : '640px';
    const responsiveHeight = window.innerWidth <= 768 ? '180px' : '360px';

    return (
        <Paper shadow='sm' radius='md' withBorder className={classes.videoFrame}>
            <ReactPlayer url={baseCloudFrontURL + key} controls={true} width={responsiveWidth} height={responsiveHeight}/>
        </Paper>
    )
}

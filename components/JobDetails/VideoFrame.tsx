"use client";

import { Paper } from "@mantine/core";
import { useParams } from "next/navigation";
import ReactPlayer from "react-player";

export function VideoFrame({ name }: { name: string }) {
    const { job_id } = useParams();
    const key = job_id + '/' + name;

    const baseCloudFrontURL = "https://rl-peek-job-videos.s3.us-west-2.amazonaws.com/"

    return (
        <Paper shadow='sm' radius='md' withBorder>
            <ReactPlayer url={baseCloudFrontURL + key} controls={true} />
        </Paper>
    )
}

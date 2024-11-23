"use client";

import { useParams } from "next/navigation";
import ReactPlayer from "react-player";

export function VideoFrame({ name }: { name: string }) {
    const { job_id } = useParams();
    const key = job_id + '/' + name;

    const baseCloudFrontURL = "https://rl-peek-job-videos.s3.us-west-2.amazonaws.com/"

    return (
        <>
            <ReactPlayer url={baseCloudFrontURL + key} controls={true} width={800} height={450} />
        </>
    )
}

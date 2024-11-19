"use client";

import { useParams } from "next/navigation";
import ReactPlayer from "react-player";
import { UploadNewTemplate } from "../Hooks/UploadNewTemplate";

export function VideoFrame() {
    const { job } = useParams();
    const slugArr = job as string[];
    const key = slugArr.join('/');

    const baseCloudFrontURL = "https://rl-peek-job-videos.s3.us-west-2.amazonaws.com/"

    return (
        <>
            <ReactPlayer url={baseCloudFrontURL + key} controls={true} width={800} height={450} />
            <UploadNewTemplate />
        </>
    )
}

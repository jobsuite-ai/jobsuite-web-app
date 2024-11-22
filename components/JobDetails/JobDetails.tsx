"use client";

import { UploadNewTemplate } from '@/components/Hooks/UploadNewTemplate';
import { VideoFrame } from '@/components/JobDetails/VideoFrame';
import { Button } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import classes from './JobDetails.module.css';
import { SingleJob } from '../Global/job';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JobDetails({jobID}: {jobID: string}) {
    const [job, setJob] = useState<SingleJob>();
    const router = useRouter();

    useEffect(() => {
        getJob();
    }, []);

    async function getJob() {
        const response = await fetch(
            `/api/jobs/${jobID}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        )

        const {Item} = await response.json();
        console.log(Item);
        setJob(Item);
        console.log(job);
    }
    return (
        <>
            <div className={classes.header}>
                <Button
                    onClick={() => router.push('/jobs')}
                    style={{ border: 'none' }}
                    variant="default"
                    leftSection={<IconArrowLeft size={14}
                />}>
                    Back To Job List
                </Button>
            </div>
            {job && (
                <>
                    <div>{job.client_name.S}</div>
                    <div>{job.client_address.S}</div>
                    <div>{job.client_email.S}</div>
                    <div>{job.client_phone_number.S}</div>
                    <UploadNewTemplate />
                    {/* <VideoFrame /> */}
                </>
            )}
        </>
    );
}

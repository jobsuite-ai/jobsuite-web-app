"use client";

import { UploadNewTemplate } from '@/components/Hooks/UploadNewTemplate';
import { VideoFrame } from '@/components/JobDetails/VideoFrame';
import { Button } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { SingleJob } from '../Global/job';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NewJobVideoUpload } from './NewJobVideoUpload';
import LoadingState from '../Global/LoadingState';
import UniversalError from '../Global/UniversalError';
import classes from './styles/JobDetails.module.css'


export default function JobDetails({jobID}: {jobID: string}) {
    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState<SingleJob>();
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        getJob().finally(() => setLoading(false));
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
        setJob(Item);
    }

    return (
        <>
            {loading ? <LoadingState /> : <>
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
                    <div className={classes.jobDetailsWrapper}>
                        {job ? <>
                                <div>{job.client_name.S}</div>
                                <div>{job.client_address.S}</div>
                                <div>{job.client_email.S}</div>
                                <div>{job.client_phone_number.S}</div>

                                {job.video?.M?.name
                                    ? <VideoFrame name={job.video.M.name.S} />
                                    : <NewJobVideoUpload jobID={jobID} />
                                }
                                <UploadNewTemplate />
                            </>
                            : <UniversalError />
                        }
                    </div>
                </>
            }
        </>
    );
}

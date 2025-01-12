"use client";

import { VideoFrame } from '@/components/JobDetails/VideoFrame';
import { Flex } from '@mantine/core';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoadingState from '../Global/LoadingState';
import UniversalError from '../Global/UniversalError';
import { SingleJob } from '../Global/model';
import ClientDetails from './ClientDetails';
import ImageCarousel from './ImageCarousel';
import JobComments from './comments/JobComments';
import EstimateDetails from './estimate/EstimateDetails';
import TranscriptionSummary from './estimate/TranscriptionSummary';
import classes from './styles/JobDetails.module.css';
import SpanishTranscription from './estimate/SpanishTranscription';
import LineItems from './estimate/LineItems';
import DescriptionOfWork from './DescriptionOfWork';
import VideoUploader from './VideoUploader';

export default function JobDetails({ jobID }: { jobID: string }) {
    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState<SingleJob>();
    const [images, setImages] = useState<string[] | undefined>();
    const [objectExists, setObjectExists] = useState(false);

    const searchParams = useSearchParams();
    const page = searchParams.get('page');

    // Start polling when component mounts, and stop if video is available
    useEffect(() => {
        if (!job) {
            setLoading(true);
            getJob().finally(() => setLoading(false));
        }

        if (job?.video?.M?.name && !objectExists) {
            const videoExists = setInterval(() => {
                if (job?.video?.M?.name && !objectExists) {            
                    checkIfVideoExists();
                } else {
                    clearInterval(videoExists);
                }
            }, 5000); // Poll every 5 seconds

            return () => {
                clearInterval(videoExists); // Clear interval when component unmounts
            };
        }
    }, [job?.video?.M?.name, objectExists]);

    async function checkIfVideoExists() {
        const response = await fetch(
            '/api/s3',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ bucketName: process.env.AWS_BUCKET_NAME, objectKey: `${jobID}/${job?.video?.M?.name.S}` }),
            }
        )

        if (response.ok) {
            const { exists } = await response.json();
            if (exists) {
                setObjectExists(exists);
                getJob();
            } else {
                setObjectExists(false);
            }
        }
    }

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

        const { Item } = await response.json();
        setJob(Item);
        setImages(job?.images ? job?.images.L.map((image) => image.M.name.S) : undefined)
    }

    const fileNamesFromDynamo = job?.images ? job?.images.L.map((image) => image.M.name.S) : [];
    interface OverviewDetailsProps {
        job: SingleJob | undefined;
        loading: boolean;
        jobID: string;
        fileNamesFromDynamo: string[]; // Assuming this is an array of strings
    }

    const OverviewDetails = ({ job, loading, jobID, fileNamesFromDynamo }: OverviewDetailsProps) => (
        <>
            {loading ? <LoadingState /> : <>
                <div className={classes.jobDetailsWrapper}>
                    {job ?
                        <>
                            <div className={classes.flexContainer}>
                                <div className={classes.videoWrapper}>
                                    {job.video?.M?.name
                                        ? <VideoFrame name={job.video.M.name.S} />
                                        : <VideoUploader jobID={jobID} refresh={getJob} />
                                    }
                                </div>
                                <div className={classes.detailsWrapper}>
                                    <ClientDetails job={job} />
                                </div>
                            </div>
                            <Flex direction='column' gap='md' className={classes.jobFieldWrapper}>
                                <DescriptionOfWork job={job} />
                                <ImageCarousel jobID={jobID} imageNames={fileNamesFromDynamo} />
                                <LineItems job={job} />
                                <TranscriptionSummary job={job} refresh={getJob} />
                                <SpanishTranscription job={job} refresh={getJob} />
                            </Flex>
                        </> : <UniversalError message='Unable to access job details' />
                    }
                </div>
            </>
            }
        </>
    );

    if (job) {
        switch (page) {
            case 'overview':
                return (<OverviewDetails
                    job={job}
                    loading={loading}
                    jobID={jobID}
                    fileNamesFromDynamo={fileNamesFromDynamo}
                />);
            case 'estimate':
                return (<EstimateDetails job={job} />);
            case 'comments':
                return (<JobComments jobID={jobID} />);
            default:
                return (<OverviewDetails
                    job={job}
                    loading={loading}
                    jobID={jobID}
                    fileNamesFromDynamo={fileNamesFromDynamo}
                />);
        }
    }


    return (<OverviewDetails
        job={job}
        loading={loading}
        jobID={jobID}
        fileNamesFromDynamo={fileNamesFromDynamo}
    />)
}

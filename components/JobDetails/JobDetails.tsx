'use client';

import { useEffect, useState } from 'react';

import { Center, Flex, Paper, Text, Button } from '@mantine/core';
import { IconPencil, IconArchive } from '@tabler/icons-react';
import { useSearchParams } from 'next/navigation';

import ClientDetails from './ClientDetails';
import DescriptionOfWork from './DescriptionOfWork';
import JobImage from './JobImage';
import LoadingState from '../Global/LoadingState';
import { SingleJob, JobStatus } from '../Global/model';
import UniversalError from '../Global/UniversalError';
import JobComments from './comments/JobComments';
import EstimateDetails from './estimate/EstimateDetails';
import LineItems from './estimate/LineItems';
import SpanishTranscription from './estimate/SpanishTranscription';
import TranscriptionSummary from './estimate/TranscriptionSummary';
import HoursAndRate from './HoursAndRate';
import ResourceLink from './ResourceLink';
import classes from './styles/JobDetails.module.css';
import VideoUploader from './VideoUploader';
import updateJobStatus from '../Global/updateJobStatus';

import { VideoFrame } from '@/components/JobDetails/VideoFrame';

export default function JobDetails({ jobID }: { jobID: string }) {
    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState<SingleJob>();
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

        return undefined;
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
        );

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
                },
            }
        );

        const { Item } = await response.json();
        setJob(Item);
    }

    const handleOpenExternalLink = (link: string) => {
        window.open(link, '_blank');
    };

    const archiveJob = () => {
        updateJobStatus(JobStatus.ARCHIVED, jobID);
        getJob();
    };

    const fileNameFromDynamo = job?.images ? job?.images.L[0].M.name.S : '';

    const OverviewDetails = () => (
        <>
            {loading ? <LoadingState /> : <>
                <div className={classes.jobDetailsWrapper}>
                    {job ?
                        <>
                            <div className={classes.flexContainer}>
                                <div className={classes.videoWrapper}>
                                    {job.video?.M?.name ?
                                        <VideoFrame
                                          name={job.video.M.name.S}
                                          jobID={jobID}
                                          refresh={getJob}
                                        />
                                        : <VideoUploader jobID={jobID} refresh={getJob} />
                                    }
                                </div>
                                <div className={classes.detailsWrapper}>
                                    <ClientDetails initialJob={job} />
                                    <HoursAndRate job={job} />
                                </div>
                            </div>
                            <Flex direction="column" gap="md" className={classes.jobFieldWrapper}>
                                <DescriptionOfWork job={job} />
                                <div className={classes.imageAndHoverContainer}>
                                    <div style={{ flexGrow: '2' }}>
                                        <JobImage jobID={jobID} imageName={fileNameFromDynamo} />
                                    </div>
                                    <Paper className={classes.hoverIntegration} shadow="sm" radius="md" withBorder>
                                        <Flex h="100%" justify="center" align="center">
                                            <Text py={20}>
                                                Hover Integration Coming Soon...
                                            </Text>
                                        </Flex>
                                    </Paper>
                                </div>
                                <LineItems job={job} />
                                <TranscriptionSummary job={job} refresh={getJob} />
                                <SpanishTranscription job={job} refresh={getJob} />
                                <Center mt="lg">
                                    <Text size="lg">
                                        Resource Links
                                    </Text>
                                </Center>
                                <Flex direction="row" justify="center" gap="xl">
                                    {job.docuseal_link &&
                                        <ResourceLink
                                          handler={() =>
                                            handleOpenExternalLink(job.docuseal_link.S)}
                                          icon={IconPencil}
                                          label="Docuseal"
                                        />
                                    }
                                    {job.jira_link &&
                                        <ResourceLink
                                          handler={() => handleOpenExternalLink(job.jira_link.S)}
                                          icon={IconPencil}
                                          label="Docuseal"
                                        />
                                    }
                                </Flex>
                                <Flex direction="row" justify="center">
                                    <Button
                                      leftSection={<IconArchive size={20} />}
                                      variant="filled"
                                      color="red"
                                      onClick={archiveJob}
                                    >
                                        Archive Job
                                    </Button>
                                </Flex>
                            </Flex>
                        </> : <UniversalError message="Unable to access job details" />
                    }
                </div>
                                          </>
            }
        </>
    );

    if (job) {
        switch (page) {
            case 'overview':
                return (<OverviewDetails />);
            case 'estimate':
                return (<EstimateDetails job={job} />);
            case 'comments':
                return (<JobComments jobID={jobID} />);
            default:
                return (<OverviewDetails />);
        }
    }

    return (<OverviewDetails />);
}

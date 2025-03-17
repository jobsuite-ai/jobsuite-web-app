'use client';

import { useEffect, useState } from 'react';

import { Button, Center, Flex, Modal, Paper, Text } from '@mantine/core';
import { IconArchive, IconFileText, IconPencil } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';

import ClientDetails from './ClientDetails';
import LoadingState from '../Global/LoadingState';
import { JobStatus, SingleJob } from '../Global/model';
import UniversalError from '../Global/UniversalError';
import updateJobStatus from '../Global/updateJobStatus';
import JobComments from './comments/JobComments';
import DescriptionOfWork from './DescriptionOfWork';
import EstimateDetails from './estimate/EstimateDetails';
import LineItems from './estimate/LineItems';
import SpanishTranscription from './estimate/SpanishTranscription';
import TranscriptionSummary from './estimate/TranscriptionSummary';
import HoursAndRate from './HoursAndRate';
import JobImage from './JobImage';
import JobTitle from './JobTitle';
import ResourceLink from './ResourceLink';
import classes from './styles/JobDetails.module.css';
import VideoUploader from './VideoUploader';

import { VideoFrame } from '@/components/JobDetails/VideoFrame';

export default function JobDetails({ jobID }: { jobID: string }) {
    const [loading, setLoading] = useState(true);
    const [objectExists, setObjectExists] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [job, setJob] = useState<SingleJob>();
    const router = useRouter();

    const searchParams = useSearchParams();
    const page = searchParams?.get('page');

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
            }, 5000);

            return () => {
                clearInterval(videoExists);
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
                body: JSON.stringify({
                    bucketName: process.env.AWS_BUCKET_NAME,
                    objectKey: `${jobID}/${job?.video?.M?.name.S}`,
                }),
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
        router.push('/jobs');
    };

    const fileNameFromDynamo = job?.images ? job?.images.L[0].M.name.S : '';

    const OverviewDetails = () => (
        <>
            {loading ? <LoadingState /> : <>
                <div className={classes.jobDetailsWrapper}>
                    {job ?
                        <>
                            <JobTitle initialTitle={job.job_title?.S || ''} jobID={jobID} onSave={getJob} />
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
                                <JobComments jobID={jobID} />
                                {(job.docuseal_link || job.jira_link) &&
                                <>
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
                                              handler={() =>
                                                    handleOpenExternalLink(job.jira_link.S)}
                                              icon={IconFileText}
                                              label="Jira"
                                            />
                                        }
                                    </Flex>
                                </>
                                }
                                <Flex direction="row" justify="center" mt="xl">
                                    <Button
                                      leftSection={<IconArchive size={20} />}
                                      variant="filled"
                                      color="red"
                                      onClick={() => setIsModalOpen(true)}
                                    >
                                        Archive Job
                                    </Button>
                                </Flex>
                            </Flex>
                        </> : <UniversalError message="Unable to access job details" />
                    }
                </div>
                                          </>}
            <Modal
              opened={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              size="lg"
              title={<Text fz={30} fw={700}>Are you sure?</Text>}
            >
                <Center mt="md">
                    <Flex direction="column">
                        <Text mb="lg">
                            This will archive the job, a process that can be reversed but will
                            require manual intervention.
                        </Text>
                        <Flex direction="row" gap="lg" justify="center" align="cemter">
                            <Button type="submit" onClick={archiveJob}>Confirm</Button>
                            <Button type="submit" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        </Flex>
                    </Flex>
                </Center>
            </Modal>
        </>
    );

    if (job) {
        switch (page) {
            case 'overview':
                return (<OverviewDetails />);
            case 'estimate':
                return (<EstimateDetails job={job} />);
            default:
                return (<OverviewDetails />);
        }
    }

    return (<OverviewDetails />);
}

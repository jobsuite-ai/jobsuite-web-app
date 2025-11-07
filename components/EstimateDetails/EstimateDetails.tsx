'use client';

import { Suspense, useEffect, useRef, useState } from 'react';

import { Button, Center, Flex, Modal, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArchive, IconCopy, IconEdit, IconFileText, IconPencil } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';

import CollapsibleSection from './CollapsibleSection';
import LoadingState from '../Global/LoadingState';
import { Estimate, EstimateStatus } from '../Global/model';
import UniversalError from '../Global/UniversalError';
import { BADGE_COLORS } from '../Global/utils';
import JobComments from './comments/JobComments';
import EstimateDetailsView from './estimate/EstimateDetails';
import LineItems from './estimate/LineItems';
import SpanishTranscription from './estimate/SpanishTranscription';
import TranscriptionSummary, { TranscriptionSummaryRef } from './estimate/TranscriptionSummary';
import ImageGallery from './ImageGallery';
import JobTitle from './JobTitle';
import PdfUploader from './PdfUploader';
import { PdfViewer } from './PdfViewer';
import ResourceLink from './ResourceLink';
import SidebarDetails from './SidebarDetails';
import classes from './styles/EstimateDetails.module.css';
import VideoUploader from './VideoUploader';

import { VideoFrame } from '@/components/EstimateDetails/VideoFrame';

function EstimateDetailsContent({ estimateID }: { estimateID: string }) {
    const [loading, setLoading] = useState(true);
    const [objectExists, setObjectExists] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [estimate, setEstimate] = useState<Estimate>();
    const transcriptionSummaryRef = useRef<TranscriptionSummaryRef>(null);
    const router = useRouter();

    const searchParams = useSearchParams();
    const page = searchParams?.get('page');

    useEffect(() => {
        if (!estimate) {
            setLoading(true);
            getEstimate().finally(() => setLoading(false));
        }

        if (estimate?.video && !objectExists) {
            const videoExists = setInterval(() => {
                if (estimate?.video && !objectExists) {
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
    }, [estimate?.video, objectExists]);

    async function checkIfVideoExists() {
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            return;
        }

        const videoName = typeof estimate?.video === 'object' && estimate?.video?.name
            ? estimate.video.name
            : estimate?.video;

        if (!videoName) {
            return;
        }

        try {
            const response = await fetch(
                '/api/s3',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        bucketName: process.env.AWS_BUCKET_NAME,
                        objectKey: `${estimateID}/${videoName}`,
                    }),
                }
            );

            if (response.ok) {
                const { exists } = await response.json();
                if (exists) {
                    setObjectExists(exists);
                    getEstimate();
                } else {
                    setObjectExists(false);
                }
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error checking if video exists:', error);
        }
    }

    async function getEstimate() {
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            return;
        }

        try {
            const response = await fetch(
                `/api/estimates/${estimateID}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // eslint-disable-next-line no-console
                console.error('Error fetching estimate:', errorData);
                return;
            }

            const estimateData = await response.json();
            setEstimate(estimateData);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching estimate:', error);
        }
    }

    const handleOpenExternalLink = (link: string) => {
        window.open(link, '_blank');
    };

    const handleCopySpanishTranscription = async () => {
        if (!estimate?.spanish_transcription) {
            return;
        }

        try {
            await navigator.clipboard.writeText(estimate.spanish_transcription);
            notifications.show({
                title: 'Success!',
                position: 'top-center',
                color: 'green',
                message: 'Translation copied to clipboard',
            });
        } catch (err) {
            notifications.show({
                title: 'Creation Failed',
                position: 'top-center',
                color: 'red',
                message: 'Translation failed to copy to clipboard',
            });
        }
    };

    const handleCopyTranscriptionSummary = () => {
        transcriptionSummaryRef.current?.copyToClipboard();
    };

    const handleEditTranscriptionSummary = () => {
        transcriptionSummaryRef.current?.handleEdit();
    };

    const archiveEstimate = async () => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) return;

        try {
            await fetch(`/api/estimates/${estimateID}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: EstimateStatus.ARCHIVED }),
            });
            router.push('/proposals');
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error archiving estimate:', error);
        }
    };

    const OverviewDetails = () => (
        <>
            {loading ? <LoadingState /> : <>
                {estimate ?
                    <>
                        <div className={classes.twoColumnLayout}>
                            {/* Column 1: Main Content - Video, Images, Description, Activity */}
                            <div className={classes.mainColumn}>
                                <div className={classes.jobTitleWrapper}>
                                    <JobTitle initialTitle={estimate.job_title || ''} estimateID={estimateID} onSave={getEstimate} />
                                </div>
                                <div className={classes.columnContent}>
                                    {/* Video Section */}
                                    <CollapsibleSection title="Video" defaultOpen>
                                        {estimate.video ?
                                            <VideoFrame
                                              name={
                                                typeof estimate.video === 'object' && estimate.video?.name
                                                    ? estimate.video.name
                                                    : estimate.video
                                              }
                                              estimateID={estimateID}
                                              refresh={getEstimate}
                                            />
                                            :
                                            <VideoUploader
                                              estimateID={estimateID}
                                              refresh={getEstimate}
                                            />
                                        }
                                    </CollapsibleSection>

                                    {/* Image Gallery */}
                                    <CollapsibleSection title="Image Gallery" defaultOpen>
                                        <ImageGallery
                                          estimateID={estimateID}
                                          images={estimate.images}
                                          onUpdate={getEstimate}
                                        />
                                    </CollapsibleSection>

                                    {/* Transcription Summary */}
                                    <CollapsibleSection
                                      title="Description"
                                      defaultOpen
                                      headerActions={
                                        estimate?.transcription_summary
                                        && estimate.transcription_summary.trim().length > 0
                                            ? (
                                                <>
                                                    <IconEdit
                                                      onClick={handleEditTranscriptionSummary}
                                                      style={{ cursor: 'pointer' }}
                                                    />
                                                    <IconCopy
                                                      onClick={handleCopyTranscriptionSummary}
                                                      style={{ cursor: 'pointer' }}
                                                    />
                                                </>
                                            )
                                            : undefined
                                      }
                                    >
                                        <TranscriptionSummary
                                          ref={transcriptionSummaryRef}
                                          estimate={estimate}
                                          estimateID={estimateID}
                                          refresh={getEstimate}
                                        />
                                    </CollapsibleSection>

                                    {/* Spanish Transcription */}
                                    <CollapsibleSection
                                      title="Spanish Transcription"
                                      defaultOpen
                                      headerActions={
                                        estimate?.spanish_transcription
                                        && estimate.spanish_transcription.trim().length > 0
                                            ? (
                                                <IconCopy
                                                  onClick={handleCopySpanishTranscription}
                                                  style={{ cursor: 'pointer' }}
                                                />
                                            )
                                            : undefined
                                      }
                                    >
                                        <SpanishTranscription
                                          estimate={estimate}
                                          refresh={getEstimate}
                                        />
                                    </CollapsibleSection>

                                    {/* Line Items */}
                                    <CollapsibleSection title="Line Items" defaultOpen>
                                        <LineItems job={estimate as any} />
                                    </CollapsibleSection>

                                    {/* Activity Section */}
                                    <CollapsibleSection title="Activity" defaultOpen>
                                        <JobComments estimateID={estimateID} />
                                    </CollapsibleSection>
                                </div>
                            </div>

                            {/* Column 2: Sidebar - Status and Detail Fields */}
                            <div className={classes.sidebarColumn}>
                                <div className={classes.sidebarContent}>
                                    {/* Unified Sidebar Details */}
                                    <SidebarDetails
                                      estimate={estimate}
                                      estimateID={estimateID}
                                      onUpdate={getEstimate}
                                    />

                                    {/* Resource Links */}
                                    {(estimate.docuseal_link || estimate.jira_link) &&
                                        <div>
                                            <Text size="lg" fw={700} mb="md">Resource Links</Text>
                                            <Flex direction="row" justify="center" gap="xl">
                                                {estimate.docuseal_link &&
                                                    <ResourceLink
                                                      handler={() =>
                                                        handleOpenExternalLink(
                                                            estimate.docuseal_link!
                                                        )
                                                      }
                                                      icon={IconPencil}
                                                      label="Docuseal"
                                                    />
                                                }
                                                {estimate.jira_link &&
                                                    <ResourceLink
                                                      handler={() =>
                                                        handleOpenExternalLink(estimate.jira_link!)
                                                      }
                                                      icon={IconFileText}
                                                      label="Jira"
                                                    />
                                                }
                                            </Flex>
                                        </div>
                                    }

                                    {/* Archive Button */}
                                    <Flex direction="row" justify="center">
                                        <Button
                                          leftSection={<IconArchive size={20} />}
                                          variant="filled"
                                          color={BADGE_COLORS.ERROR}
                                          onClick={() => setIsModalOpen(true)}
                                          fullWidth
                                        >
                                            Archive Estimate
                                        </Button>
                                    </Flex>
                                </div>
                            </div>
                        </div>
                    </> : <UniversalError message="Unable to access estimate details" />
                }
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
                            This will archive the estimate, a process that can be reversed but will
                            require manual intervention.
                        </Text>
                        <Flex direction="row" gap="lg" justify="center" align="cemter">
                            <Button type="submit" onClick={archiveEstimate}>Confirm</Button>
                            <Button type="submit" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        </Flex>
                    </Flex>
                </Center>
            </Modal>
        </>
    );

    const PdfDetails = () => (
        <>
            {loading ? <LoadingState /> : <>
                <div className={classes.jobDetailsWrapper}>
                    {estimate ?
                        <>
                            <JobTitle initialTitle={estimate.job_title || ''} estimateID={estimateID} onSave={getEstimate} />
                            <div className={classes.flexContainer}>
                                <div className={classes.videoWrapper}>
                                    {estimate.pdf ?
                                        <PdfViewer
                                          name={typeof estimate.pdf === 'object' && estimate.pdf?.name ? estimate.pdf.name : estimate.pdf}
                                          estimateID={estimateID}
                                          refresh={getEstimate}
                                        />
                                        :
                                        <PdfUploader
                                          estimateID={estimateID}
                                          refresh={getEstimate}
                                        />
                                    }
                                </div>
                            </div>
                        </> : <UniversalError message="Unable to access estimate details" />
                    }
                </div>
                                          </>}
        </>
    );

    if (estimate) {
        switch (page) {
            case 'overview':
                return (<OverviewDetails />);
            case 'estimate':
                return (<EstimateDetailsView job={estimate as any} />);
            case 'pdf':
                return (<PdfDetails />);
            default:
                return (<OverviewDetails />);
        }
    }

    return (<OverviewDetails />);
}

export default function EstimateDetails({ estimateID }: { estimateID: string }) {
    return (
        <Suspense fallback={<LoadingState />}>
            <EstimateDetailsContent estimateID={estimateID} />
        </Suspense>
    );
}

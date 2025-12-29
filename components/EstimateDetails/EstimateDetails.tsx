'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ActionIcon, Anchor, Badge, Button, Center, Flex, Menu, Modal, Progress, Skeleton, Table, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconArchive,
    IconCopy,
    IconEdit,
    IconExternalLink,
    IconFile,
    IconFileText,
    IconList,
    IconPencil,
    IconPhoto,
    IconPlus,
    IconReceipt,
    IconVideo,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import ChangeOrders from './ChangeOrders';
import CollapsibleSection from './CollapsibleSection';
import EstimateDetailsSkeleton from './EstimateDetailsSkeleton';
import LoadingState from '../Global/LoadingState';
import { ContractorClient, Estimate, EstimateResource, EstimateStatus } from '../Global/model';
import UniversalError from '../Global/UniversalError';
import { BADGE_COLORS } from '../Global/utils';
import JobComments from './comments/JobComments';
import CreateChangeOrder from './CreateChangeOrder';
import EstimatePreview from './estimate/EstimatePreview';
import { EstimateLineItem } from './estimate/LineItem';
import LineItems, { LineItemsRef } from './estimate/LineItems';
import SpanishTranscription from './estimate/SpanishTranscription';
import TranscriptionSummary, { TranscriptionSummaryRef } from './estimate/TranscriptionSummary';
import FileList from './FileList';
import FileUpload from './FileUpload';
import ImageGallery from './ImageGallery';
import ImageUpload from './ImageUpload';
import JobTitle from './JobTitle';
import ResourceLink from './ResourceLink';
import SidebarDetails from './SidebarDetails';
import classes from './styles/EstimateDetails.module.css';
import VideoUploader from './VideoUploader';

import { VideoFrame } from '@/components/EstimateDetails/VideoFrame';

function EstimateDetailsContent({ estimateID }: { estimateID: string }) {
    const [objectExists, setObjectExists] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [estimate, setEstimate] = useState<Estimate>();
    const [resources, setResources] = useState<EstimateResource[]>([]);
    const [lineItems, setLineItems] = useState<EstimateLineItem[]>([]);
    const [client, setClient] = useState<ContractorClient>();
    const [showVideoUploaderModal, setShowVideoUploaderModal] = useState(false);
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [showFileUploadModal, setShowFileUploadModal] = useState(false);
    const [showDescriptionEditor, setShowDescriptionEditor] = useState(false);
    const [showSpanishTranscriptionEditor, setShowSpanishTranscriptionEditor] = useState(false);
    const [lineItemsCount, setLineItemsCount] = useState(0);
    const [showCreateChangeOrderModal, setShowCreateChangeOrderModal] = useState(false);
    const [firstPdfUrl, setFirstPdfUrl] = useState<string | null>(null);
    const [loadingPdfUrl, setLoadingPdfUrl] = useState(false);
    const transcriptionSummaryRef = useRef<TranscriptionSummaryRef>(null);
    const lineItemsRef = useRef<LineItemsRef>(null);
    const isMountedRef = useRef(true);
    const router = useRouter();

    // Single initial loading state - true until all initial data is loaded
    const [initialLoading, setInitialLoading] = useState(true);
    const [comments, setComments] = useState<any[]>([]);
    const [changeOrders, setChangeOrders] = useState<Estimate[]>([]);
    const [timeEntries, setTimeEntries] = useState<any[]>([]);
    const [showTimeEntryDetails, setShowTimeEntryDetails] = useState(false);
    const [detailsLoaded, setDetailsLoaded] = useState(false);

    // Fetch initial summary data for fast page load
    useEffect(() => {
        isMountedRef.current = true;
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            setInitialLoading(false);
            return;
        }

        const fetchSummary = async () => {
            try {
                setInitialLoading(true);

                // Fetch lightweight summary for initial render
                const summaryRes = await fetch(`/api/estimates/${estimateID}/summary`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!isMountedRef.current) return;

                if (!summaryRes.ok) {
                    // eslint-disable-next-line no-console
                    console.error('Error fetching estimate summary:', await summaryRes.json().catch(() => ({})));
                    setInitialLoading(false);
                    return;
                }

                const summaryData = await summaryRes.json();

                // Process estimate from summary
                if (summaryData.estimate && isMountedRef.current) {
                    const estimateData = { ...summaryData.estimate };
                    // Add hours_worked to estimate if present
                    if (
                        summaryData.hours_worked !== undefined &&
                        summaryData.hours_worked !== null
                    ) {
                        estimateData.hours_worked = summaryData.hours_worked;
                    }
                    setEstimate(estimateData);
                }

                // Process client from summary
                if (summaryData.client && isMountedRef.current) {
                    setClient(summaryData.client);
                }

                // Set flags from summary
                if (summaryData.has_video && isMountedRef.current) {
                    setObjectExists(true);
                }

                // Set counts from summary
                if (isMountedRef.current) {
                    setLineItemsCount(summaryData.line_items_count || 0);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error fetching summary:', error);
            } finally {
                if (isMountedRef.current) {
                    setInitialLoading(false);
                }
            }
        };

        fetchSummary();

        // eslint-disable-next-line consistent-return
        return function cleanup() {
            isMountedRef.current = false;
        };
    }, [estimateID]);

    // Load full details in background after initial render
    useEffect(() => {
        if (initialLoading || detailsLoaded) {
            return;
        }

        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            return;
        }

        const fetchFullDetails = async () => {
            try {
                // Fetch all data from consolidated endpoint in background
                const detailsRes = await fetch(
                    `/api/estimates/${estimateID}/details`,
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!isMountedRef.current) return;

                if (!detailsRes.ok) {
                    // eslint-disable-next-line no-console
                    const errorData = await detailsRes.json().catch(() => ({}));
                    console.error('Error fetching estimate details:', errorData);
                    return;
                }

                const detailsData = await detailsRes.json();

                // Process resources
                if (
                    detailsData.resources &&
                    Array.isArray(detailsData.resources) &&
                    isMountedRef.current
                ) {
                    const resourcesArray = detailsData.resources;
                    setResources(resourcesArray);

                    // Check if any video resource exists
                    const videoResource = resourcesArray.find(
                        (r: EstimateResource) =>
                            r.resource_type === 'VIDEO' &&
                            r.upload_status === 'COMPLETED'
                    );
                    if (videoResource) {
                        setObjectExists(true);
                    }
                }

                // Process line items
                if (
                    detailsData.line_items &&
                    Array.isArray(detailsData.line_items) &&
                    isMountedRef.current
                ) {
                    const itemsArray = detailsData.line_items;
                    setLineItems(itemsArray);
                    setLineItemsCount(itemsArray.length);
                }

                // Process comments
                if (
                    detailsData.comments &&
                    Array.isArray(detailsData.comments) &&
                    isMountedRef.current
                ) {
                    const commentsArray = detailsData.comments;
                    setComments(commentsArray);
                }

                // Process change orders
                if (
                    detailsData.change_orders &&
                    Array.isArray(detailsData.change_orders) &&
                    isMountedRef.current
                ) {
                    const changeOrdersArray = detailsData.change_orders;
                    setChangeOrders(changeOrdersArray);
                } else if (isMountedRef.current) {
                    // Fallback: fetch change orders separately if not in details response
                    fetchChangeOrders();
                }

                // Process time entries
                if (
                    detailsData.time_entries &&
                    Array.isArray(detailsData.time_entries) &&
                    isMountedRef.current
                ) {
                    const timeEntriesArray = detailsData.time_entries;
                    setTimeEntries(timeEntriesArray);
                }

                // Update estimate with any additional data from details
                if (detailsData.estimate && isMountedRef.current) {
                    const estimateData = { ...detailsData.estimate };
                    if (
                        detailsData.hours_worked !== undefined &&
                        detailsData.hours_worked !== null
                    ) {
                        estimateData.hours_worked = detailsData.hours_worked;
                    }
                    setEstimate(estimateData);
                }

                if (isMountedRef.current) {
                    setDetailsLoaded(true);
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error fetching full details:', error);
            }
        };

        // Small delay to ensure initial render completes first
        const timeoutId = setTimeout(() => {
            fetchFullDetails();
        }, 100);

        // eslint-disable-next-line consistent-return
        return function cleanup() {
            clearTimeout(timeoutId);
        };
    }, [estimateID, initialLoading, detailsLoaded]);

    // Separate functions for refreshing data after initial load
    const getEstimate = useCallback(async () => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) return;

        try {
            const response = await fetch(
                `/api/estimates/${estimateID}?include_change_orders=true`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.ok) {
                const estimateData = await response.json();
                setEstimate(estimateData);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching estimate:', error);
        }
    }, [estimateID]);

    const getResources = useCallback(async () => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) return;

        try {
            const response = await fetch(
                `/api/estimates/${estimateID}/resources`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.ok) {
                const resourcesData = await response.json();
                const resourcesArray = Array.isArray(resourcesData) ? resourcesData : [];
                setResources(resourcesArray);

                // Check if any video resource exists
                const videoResource = resourcesArray.find((r: EstimateResource) => r.resource_type === 'VIDEO' && r.upload_status === 'COMPLETED');
                if (videoResource) {
                    setObjectExists(true);
                }
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching resources:', error);
        }
    }, [estimateID]);

    const fetchChangeOrders = useCallback(async () => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) return;

        try {
            const response = await fetch(
                `/api/estimates/${estimateID}/change-orders`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.ok && isMountedRef.current) {
                const changeOrdersData = await response.json();
                const changeOrdersArray = Array.isArray(changeOrdersData) ? changeOrdersData : [];
                setChangeOrders(changeOrdersArray);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching change orders:', error);
        }
    }, [estimateID]);

    // Fallback: If loading takes too long, force completion after 10 seconds
    useEffect(() => {
        if (!initialLoading) {
            return;
        }

        const timeout = setTimeout(() => {
            // eslint-disable-next-line no-console
            console.warn('Initial loading timeout - forcing completion');
            setInitialLoading(false);
        }, 10000);

        // eslint-disable-next-line consistent-return
        return function cleanup() {
            clearTimeout(timeout);
        };
    }, [initialLoading]);

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasUploadingVideoRef = useRef(false);

    // Check if there's an uploading video - memoize to avoid recalculating
    const hasUploadingVideo = useMemo(() => (
        resources.some(r => r.resource_type === 'VIDEO' && r.upload_status !== 'COMPLETED') && !objectExists
    ), [resources, objectExists]);

    // Polling for video upload - only after initial load is complete
    useEffect(() => {
        // Don't start polling until initial load is complete
        if (initialLoading) {
            return;
        }

        // Only update polling if the state actually changed
        if (hasUploadingVideo !== hasUploadingVideoRef.current) {
            hasUploadingVideoRef.current = hasUploadingVideo;

            // Clear any existing interval
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }

            // Start polling if there's an uploading video
            if (hasUploadingVideo) {
                pollingIntervalRef.current = setInterval(() => {
                    getResources();
                }, 5000);
            }
        }

        // eslint-disable-next-line consistent-return
        return function cleanup() {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [hasUploadingVideo, initialLoading]);

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

    // Helper functions to check if sections have data - memoize to prevent recalculation
    const videoResources = useMemo(() => (
        resources.filter(r => r.resource_type === 'VIDEO' && r.upload_status === 'COMPLETED')
    ), [resources]);
    const imageResources = useMemo(() => (
        resources.filter(r => r.resource_type === 'IMAGE' && r.upload_status === 'COMPLETED')
    ), [resources]);
    const fileResources = useMemo(() => (
        resources.filter(r => r.resource_type === 'DOCUMENT' && r.upload_status === 'COMPLETED')
    ), [resources]);
    const firstPdfResource = useMemo(() => (
        fileResources.find(r => r.resource_location?.toLowerCase().endsWith('.pdf'))
    ), [fileResources]);
    const hasVideo = videoResources.length > 0;
    const hasImages = imageResources.length > 0;
    const hasFiles = fileResources.length > 0;
    const hasPdfPreview = firstPdfResource !== undefined;

    const getPdfPresignedUrl = useCallback(async (resource: EstimateResource) => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) return;

        setLoadingPdfUrl(true);
        try {
            const response = await fetch(
                `/api/estimates/${estimateID}/resources/${resource.id}/presigned-url`,
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
                console.error('Error fetching PDF presigned URL:', errorData);
                setFirstPdfUrl(null);
                return;
            }

            const data = await response.json();
            const presignedUrl = data.presigned_url || data.url;
            setFirstPdfUrl(presignedUrl || null);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching PDF presigned URL:', error);
            setFirstPdfUrl(null);
        } finally {
            setLoadingPdfUrl(false);
        }
    }, [estimateID]);

    // Fetch PDF URL only after initial load is complete
    useEffect(() => {
        if (initialLoading) {
            return;
        }

        if (firstPdfResource) {
            getPdfPresignedUrl(firstPdfResource);
        } else {
            setFirstPdfUrl(null);
        }
    }, [firstPdfResource, getPdfPresignedUrl, initialLoading]);
    const hasDescription = estimate?.transcription_summary
        && estimate.transcription_summary.trim().length > 0;
    const hasSpanishTranscription = estimate?.spanish_transcription
        && estimate.spanish_transcription.trim().length > 0;

    const OverviewDetails = useMemo(() => (
        <>
            {initialLoading ? <EstimateDetailsSkeleton /> : <>
                {estimate ?
                    <>
                        <div className={classes.twoColumnLayout}>
                            {/* Column 1: Main Content - Video, Images, Description, Activity */}
                            <div className={classes.mainColumn}>
                                <div className={classes.jobTitleWrapper}>
                                    <Flex justify="space-between" align="center" gap="md" w="100%" direction={{ base: 'column', sm: 'row' }}>
                                        <Flex align="center" gap="md" wrap="wrap">
                                            <JobTitle initialTitle={estimate.title || ''} estimateID={estimateID} onSave={getEstimate} />
                                            {estimate.original_estimate_id && (
                                                <Flex align="center" gap="lg" wrap="wrap">
                                                    <Badge color="orange" size="lg">
                                                        Change Order
                                                    </Badge>
                                                    <Anchor
                                                      component="button"
                                                      onClick={() => router.push(`/proposals/${estimate.original_estimate_id}`)}
                                                      size="sm"
                                                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <IconExternalLink size={16} />
                                                        View Original Estimate
                                                    </Anchor>
                                                </Flex>
                                            )}
                                        </Flex>
                                        <Menu shadow="md" width={200} position="bottom-start" offset={5}>
                                            <Menu.Target>
                                                <ActionIcon
                                                  variant="filled"
                                                  color="blue"
                                                  size="lg"
                                                  radius="md"
                                                >
                                                    <IconPlus size={20} />
                                                </ActionIcon>
                                            </Menu.Target>
                                            <Menu.Dropdown>
                                                {!hasVideo && (
                                                    <Menu.Item
                                                      leftSection={<IconVideo size={16} />}
                                                      onClick={() =>
                                                        setShowVideoUploaderModal(true)
                                                      }
                                                    >
                                                        Add Video
                                                    </Menu.Item>
                                                )}
                                                <Menu.Item
                                                  leftSection={<IconPhoto size={16} />}
                                                  onClick={() => setShowImageUploadModal(true)}
                                                >
                                                    Add Images
                                                </Menu.Item>
                                                <Menu.Item
                                                  leftSection={<IconFile size={16} />}
                                                  onClick={() => setShowFileUploadModal(true)}
                                                >
                                                    Add Files
                                                </Menu.Item>
                                                <Menu.Item
                                                  leftSection={<IconList size={16} />}
                                                  onClick={() =>
                                                      lineItemsRef.current?.openAddModal()
                                                  }
                                                >
                                                    Add Line Item
                                                </Menu.Item>
                                                {!estimate?.original_estimate_id && (
                                                    <Menu.Item
                                                      leftSection={<IconReceipt size={16} />}
                                                      onClick={() =>
                                                        setShowCreateChangeOrderModal(true)
                                                      }
                                                    >
                                                        Create Change Order
                                                    </Menu.Item>
                                                )}
                                            </Menu.Dropdown>
                                        </Menu>
                                    </Flex>
                                </div>
                                <div className={classes.columnContent}>
                                    {
                                        estimate.hours_worked !== undefined &&
                                        estimate.hours_worked !== null &&
                                        estimate.hours_worked > 0 &&
                                        isMountedRef.current && (
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <Flex justify="space-between" align="center" gap="md" mb="xs">
                                                <Text size="sm" fw={500}>
                                                    Hours Worked
                                                </Text>
                                                <Text size="sm" c="dimmed">
                                                    {estimate.hours_worked.toFixed(2)} / {estimate.hours_bid ? estimate.hours_bid.toFixed(2) : '0.00'} hours
                                                </Text>
                                            </Flex>
                                            <Progress
                                              value={
                                                estimate.hours_bid && estimate.hours_bid > 0
                                                    ? Math.min(
                                                        (estimate.hours_worked / estimate.hours_bid
                                                        ) * 100,
                                                        100
                                                    )
                                                    : 0
                                                }
                                              color={estimate.hours_worked > (estimate.hours_bid || 0) ? 'red' : 'green'}
                                              size="lg"
                                              radius="md"
                                            />
                                            {estimate.hours_worked > (estimate.hours_bid || 0) && (
                                                <Text size="xs" c="red" mt="xs">
                                                    Over budget by {
                                                    ((
                                                        estimate.hours_worked -
                                                        (estimate.hours_bid || 0)
                                                    )).toFixed(2)} hours
                                                </Text>
                                            )}
                                            {timeEntries.length > 0 && (
                                                <Button
                                                  variant="subtle"
                                                  size="xs"
                                                  mt="xs"
                                                  onClick={() =>
                                                    setShowTimeEntryDetails(!showTimeEntryDetails)
                                                  }
                                                >
                                                    {showTimeEntryDetails ? 'Hide' : 'Show'} Details
                                                </Button>
                                            )}
                                            {showTimeEntryDetails && timeEntries.length > 0 && (
                                                <div style={{ marginTop: '1rem' }}>
                                                    <Table
                                                      striped
                                                      highlightOnHover
                                                      withTableBorder
                                                      withColumnBorders
                                                    >
                                                        <Table.Thead>
                                                            <Table.Tr>
                                                                <Table.Th>Employee</Table.Th>
                                                                <Table.Th>Hours</Table.Th>
                                                                <Table.Th>Date</Table.Th>
                                                            </Table.Tr>
                                                        </Table.Thead>
                                                        <Table.Tbody>
                                                            {[...timeEntries]
                                                                .sort((a: any, b: any) => {
                                                                    const dateA = a.date
                                                                        ? new Date(a.date).getTime()
                                                                        : 0;
                                                                    const dateB = b.date
                                                                        ? new Date(b.date).getTime()
                                                                        : 0;
                                                                    // Newest first (descending)
                                                                    return dateB - dateA;
                                                                })
                                                                .map((entry: any) => {
                                                                    const hoursDisplay =
                                                                        typeof entry.hours === 'number'
                                                                            ? entry.hours.toFixed(2)
                                                                            : entry.hours || '0.00';
                                                                    const dateDisplay = entry.date
                                                                        ? new Date(entry.date)
                                                                              .toLocaleDateString()
                                                                        : 'N/A';
                                                                    const employeeName =
                                                                        entry.employee_name || 'N/A';
                                                                    return (
                                                                        <Table.Tr key={entry.id}>
                                                                            <Table.Td>
                                                                                {employeeName}
                                                                            </Table.Td>
                                                                            <Table.Td>
                                                                                {hoursDisplay}
                                                                            </Table.Td>
                                                                            <Table.Td>
                                                                                {dateDisplay}
                                                                            </Table.Td>
                                                                        </Table.Tr>
                                                                    );
                                                                })}
                                                        </Table.Tbody>
                                                    </Table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Video Section - Only show if video exists */}
                                    {hasVideo && (
                                        <CollapsibleSection title="Video" defaultOpen>
                                            <VideoFrame
                                              resource={videoResources[0]}
                                              estimateID={estimateID}
                                              refresh={getResources}
                                            />
                                        </CollapsibleSection>
                                    )}

                                    {/* Activity Section - Always show */}
                                    <CollapsibleSection
                                      title="Activity"
                                      defaultOpen
                                    >
                                        <JobComments
                                          estimateID={estimateID}
                                          initialComments={comments}
                                          skipInitialFetch
                                        />
                                    </CollapsibleSection>

                                    {/* Image Gallery - Show if images exist */}
                                    {hasImages && (
                                        <CollapsibleSection title="Image Gallery" defaultOpen>
                                            <ImageGallery
                                              estimateID={estimateID}
                                              resources={imageResources}
                                              coverPhotoResourceId={
                                                estimate.cover_photo_resource_id
                                              }
                                              onUpdate={() => {
                                                getResources();
                                                getEstimate();
                                              }}
                                            />
                                        </CollapsibleSection>
                                    )}

                                    {/* PDF Preview - Show if first file is a PDF */}
                                    {hasPdfPreview && firstPdfResource && (
                                        <CollapsibleSection title="PDF Preview" defaultOpen>
                                            {loadingPdfUrl ? (
                                                <Skeleton height={800} radius="md" />
                                            ) : firstPdfUrl ? (
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    minHeight: '500px',
                                                    width: '100%',
                                                }}>
                                                    <iframe
                                                      title={`PDF preview for ${firstPdfResource.resource_location}`}
                                                      src={firstPdfUrl}
                                                      className={classes.pdfIframe}
                                                      style={{
                                                          width: '100%',
                                                          height: '800px',
                                                          border: 'none',
                                                          borderRadius: '8px',
                                                          maxHeight: '70vh',
                                                      }}
                                                    />
                                                </div>
                                            ) : (
                                                <Text c="dimmed" ta="center" p="md">
                                                    Unable to load PDF preview
                                                </Text>
                                            )}
                                        </CollapsibleSection>
                                    )}

                                    {/* File List - Show if files exist */}
                                    {hasFiles && (
                                        <CollapsibleSection title="Files" defaultOpen>
                                            <FileList
                                              estimateID={estimateID}
                                              resources={fileResources}
                                              onUpdate={getResources}
                                            />
                                        </CollapsibleSection>
                                    )}

                                    {/* Transcription Summary - Only show if description exists */}
                                    {hasDescription && (
                                        <CollapsibleSection
                                          title="Description"
                                          defaultOpen
                                          headerActions={
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
                                          }
                                        >
                                            <TranscriptionSummary
                                              ref={transcriptionSummaryRef}
                                              estimate={estimate}
                                              estimateID={estimateID}
                                              refresh={getEstimate}
                                            />
                                        </CollapsibleSection>
                                    )}

                                    {/* Show description editor if triggered from menu */}
                                    {showDescriptionEditor && !hasDescription && (
                                        <CollapsibleSection title="Description" defaultOpen>
                                            <TranscriptionSummary
                                              ref={transcriptionSummaryRef}
                                              estimate={estimate}
                                              estimateID={estimateID}
                                              refresh={() => {
                                                getEstimate();
                                                setShowDescriptionEditor(false);
                                              }}
                                            />
                                        </CollapsibleSection>
                                    )}

                                    {/* Spanish Transcription - Only show if it exists */}
                                    {hasSpanishTranscription && (
                                        <CollapsibleSection
                                          title="Spanish Transcription"
                                          defaultOpen
                                          headerActions={
                                            <IconCopy
                                              onClick={handleCopySpanishTranscription}
                                              style={{ cursor: 'pointer' }}
                                            />
                                          }
                                        >
                                            <SpanishTranscription
                                              estimate={estimate}
                                              refresh={getEstimate}
                                            />
                                        </CollapsibleSection>
                                    )}

                                    {/* Show Spanish transcription editor if triggered from menu */}
                                    {showSpanishTranscriptionEditor && !hasSpanishTranscription && (
                                        <CollapsibleSection title="Spanish Transcription" defaultOpen>
                                            <SpanishTranscription
                                              estimate={estimate}
                                              refresh={() => {
                                                getEstimate();
                                                setShowSpanishTranscriptionEditor(false);
                                              }}
                                            />
                                        </CollapsibleSection>
                                    )}

                                    {/* Line Items - Always render for ref access */}
                                    {lineItemsCount > 0 ? (
                                        <CollapsibleSection title="Line Items" defaultOpen>
                                            <LineItems
                                              ref={lineItemsRef}
                                              estimateID={estimateID}
                                              onLineItemsChange={(count) => {
                                                setLineItemsCount(count);
                                              }}
                                              onEstimateUpdate={getEstimate}
                                            />
                                        </CollapsibleSection>
                                    ) : (
                                        <div style={{ display: 'none' }}>
                                            <LineItems
                                              ref={lineItemsRef}
                                              estimateID={estimateID}
                                              onLineItemsChange={(count) => {
                                                setLineItemsCount(count);
                                              }}
                                              onEstimateUpdate={getEstimate}
                                            />
                                        </div>
                                    )}

                                    {/* Change Orders Section - Only show if not archived */}
                                    {estimate &&
                                    !estimate.original_estimate_id &&
                                    estimate.status !== EstimateStatus.ARCHIVED && (
                                        <CollapsibleSection title="Change Orders" defaultOpen>
                                            <ChangeOrders
                                              estimate={estimate}
                                              initialChangeOrders={changeOrders}
                                              skipInitialFetch={changeOrders.length > 0}
                                              onUpdate={() => {
                                                getEstimate();
                                                fetchChangeOrders();
                                              }}
                                            />
                                        </CollapsibleSection>
                                    )}

                                    {/* Estimate Preview Section */}
                                    {estimate && (
                                        <CollapsibleSection title="Estimate Preview" defaultOpen>
                                            <EstimatePreview
                                              estimate={estimate}
                                              imageResources={imageResources}
                                              videoResources={videoResources}
                                              lineItems={lineItems}
                                              client={client}
                                            />
                                        </CollapsibleSection>
                                    )}
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
                                            <Flex direction={{ base: 'column', sm: 'row' }} justify="center" gap="xl">
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
            {/* Archive Confirmation Modal */}
            <Modal
              opened={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              size="lg"
              className={classes.archiveModal}
              title={<Text fz={30} fw={700}>Are you sure?</Text>}
            >
                <Center mt="md">
                    <Flex direction="column">
                        <Text mb="lg">
                            This will archive the estimate, a process that can be reversed but will
                            require manual intervention.
                        </Text>
                        <Flex direction="column" gap="lg" justify="center" align="center" className={classes.archiveModalButtons}>
                            <Button type="submit" onClick={archiveEstimate} fullWidth>Confirm</Button>
                            <Button type="submit" onClick={() => setIsModalOpen(false)} fullWidth>Cancel</Button>
                        </Flex>
                    </Flex>
                </Center>
            </Modal>

            {/* Video Upload Modal */}
            <Modal
              opened={showVideoUploaderModal}
              onClose={() => setShowVideoUploaderModal(false)}
              size="lg"
              className={classes.uploadModal}
              centered
              title={<Text fz={24} fw={700}>Upload Video</Text>}
            >
                <VideoUploader
                  estimateID={estimateID}
                  refresh={() => {
                    getResources();
                    setShowVideoUploaderModal(false);
                  }}
                />
            </Modal>

            {/* Image Upload Modal */}
            <Modal
              opened={showImageUploadModal}
              onClose={() => setShowImageUploadModal(false)}
              size="lg"
              className={classes.uploadModal}
              centered
              title={<Text fz={24} fw={700}>Upload Images</Text>}
            >
                <ImageUpload
                  estimateID={estimateID}
                  setImage={() => {
                    getResources();
                    setShowImageUploadModal(false);
                  }}
                  setShowModal={setShowImageUploadModal}
                />
            </Modal>

            {/* File Upload Modal */}
            <Modal
              opened={showFileUploadModal}
              onClose={() => setShowFileUploadModal(false)}
              size="lg"
              className={classes.uploadModal}
              centered
              title={<Text fz={24} fw={700}>Upload Files</Text>}
            >
                <FileUpload
                  estimateID={estimateID}
                  setFile={() => {
                    getResources();
                    setShowFileUploadModal(false);
                  }}
                  setShowModal={setShowFileUploadModal}
                />
            </Modal>

            {/* Create Change Order Modal */}
            {estimate && (
                <CreateChangeOrder
                  opened={showCreateChangeOrderModal}
                  onClose={() => setShowCreateChangeOrderModal(false)}
                  onSuccess={() => {
                    getEstimate();
                    setShowCreateChangeOrderModal(false);
                  }}
                  estimate={estimate}
                />
            )}

            {/* Line Item Modal - Removed since LineItems component has its own modal */}
        </>
    ), [
        initialLoading,
        estimate,
        estimateID,
        hasVideo,
        hasImages,
        hasFiles,
        hasPdfPreview,
        hasDescription,
        hasSpanishTranscription,
        videoResources,
        imageResources,
        fileResources,
        firstPdfResource,
        firstPdfUrl,
        loadingPdfUrl,
        showVideoUploaderModal,
        showImageUploadModal,
        showFileUploadModal,
        showDescriptionEditor,
        showSpanishTranscriptionEditor,
        lineItemsCount,
        isModalOpen,
        showCreateChangeOrderModal,
        comments,
        changeOrders,
        getEstimate,
        getResources,
        handleOpenExternalLink,
        handleCopySpanishTranscription,
        handleEditTranscriptionSummary,
        handleCopyTranscriptionSummary,
        archiveEstimate,
        setIsModalOpen,
        setShowVideoUploaderModal,
        setShowImageUploadModal,
        setShowFileUploadModal,
        setShowCreateChangeOrderModal,
        transcriptionSummaryRef,
        lineItemsRef,
        router,
    ]);

    return OverviewDetails;
}

export default function EstimateDetails({ estimateID }: { estimateID: string }) {
    return (
        <Suspense fallback={<LoadingState />}>
            <EstimateDetailsContent estimateID={estimateID} />
        </Suspense>
    );
}

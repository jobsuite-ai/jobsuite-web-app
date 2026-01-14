'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ActionIcon, Anchor, Badge, Button, Center, Flex, Menu, Modal, Paper, Progress, Skeleton, Stack, Stepper, Table, Text } from '@mantine/core';
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
    IconPrinter,
    IconReceipt,
    IconVideo,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import ChangeOrders from './ChangeOrders';
import CollapsibleSection from './CollapsibleSection';
import ContractorSignatureRequired from './ContractorSignatureRequired';
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

import { getApiHeaders } from '@/app/utils/apiClient';
import { getCachedEstimateSummary, setCachedEstimateSummary } from '@/app/utils/dataCache';
import { VideoFrame } from '@/components/EstimateDetails/VideoFrame';
import { useDataCache } from '@/contexts/DataCacheContext';

function EstimateDetailsContent({ estimateID }: { estimateID: string }) {
    const { estimates: cachedEstimates, clients: cachedClients } = useDataCache();
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
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
    const [loadingSignatureUrl, setLoadingSignatureUrl] = useState(false);
    const [signatureRefreshKey, setSignatureRefreshKey] = useState(0);
    const transcriptionSummaryRef = useRef<TranscriptionSummaryRef>(null);
    const lineItemsRef = useRef<LineItemsRef>(null);
    const isMountedRef = useRef(true);
    const mainColumnRef = useRef<HTMLDivElement>(null);
    const [buttonTransform, setButtonTransform] = useState({ x: 0, y: 0 });
    const router = useRouter();

    // Single initial loading state - true until all initial data is loaded
    const [initialLoading, setInitialLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [changeOrders, setChangeOrders] = useState<Estimate[]>([]);
    const [timeEntries, setTimeEntries] = useState<any[]>([]);
    const [showTimeEntryDetails, setShowTimeEntryDetails] = useState(false);
    const [detailsLoaded, setDetailsLoaded] = useState(false);
    const [signatures, setSignatures] = useState<Array<{
        signature_type: string;
        signer_name?: string;
        signer_email?: string;
        signed_at?: string;
        is_valid?: boolean;
    }>>([]);

    // Load cached estimate data immediately for instant display
    useEffect(() => {
        if (cachedEstimates.length > 0) {
            const cachedEstimate = cachedEstimates.find((e) => e.id === estimateID);
            if (cachedEstimate && isMountedRef.current) {
                // Use cached estimate data immediately - this provides instant UI
                setEstimate(cachedEstimate);

                // Also try to find cached client
                if (cachedEstimate.client_id && cachedClients.length > 0) {
                    const cachedClient = cachedClients.find(
                        (c) => c.id === cachedEstimate.client_id
                    );
                    if (cachedClient && isMountedRef.current) {
                        setClient(cachedClient);
                    }
                }
            }
        }
    }, [cachedEstimates, cachedClients, estimateID]);

    // Fetch initial summary data for fast page load
    useEffect(() => {
        isMountedRef.current = true;
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            setInitialLoading(false);
            setHasError(true);
            return;
        }

        // Check cache first to avoid unnecessary fetch
        const cachedSummary = getCachedEstimateSummary<any>(estimateID);
        if (cachedSummary) {
            // Use cached summary data
            if (cachedSummary.estimate && isMountedRef.current) {
                const estimateData = { ...cachedSummary.estimate };
                if (
                    cachedSummary.hours_worked !== undefined &&
                    cachedSummary.hours_worked !== null
                ) {
                    estimateData.hours_worked = cachedSummary.hours_worked;
                }
                setEstimate(estimateData);
            }
            if (cachedSummary.client && isMountedRef.current) {
                setClient(cachedSummary.client);
            }
            if (cachedSummary.has_video && isMountedRef.current) {
                setObjectExists(true);
            }
            if (isMountedRef.current) {
                setLineItemsCount(cachedSummary.line_items_count || 0);
            }
            setInitialLoading(false);
        }

        const fetchSummary = async () => {
            try {
                // Only show loading if we don't have cached data
                if (!cachedSummary) {
                    setInitialLoading(true);
                }
                setHasError(false);

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
                    const errorData = await summaryRes.json().catch(() => ({}));
                    // eslint-disable-next-line no-console
                    console.error('Error fetching estimate summary:', errorData);

                    // Only set error if we don't have cached data to show
                    if (!cachedSummary && !estimate) {
                        setHasError(true);
                    }
                    if (!cachedSummary) {
                        setInitialLoading(false);
                    }
                    return;
                }

                const summaryData = await summaryRes.json();

                // Cache the summary data
                setCachedEstimateSummary(estimateID, summaryData);

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
                // Only set error if we don't have cached data to show
                if (!cachedSummary && !estimate) {
                    setHasError(true);
                }
            } finally {
                if (isMountedRef.current) {
                    setInitialLoading(false);
                }
            }
        };

        // Only fetch if cache is expired or missing
        if (!cachedSummary) {
            fetchSummary();
        }

        // eslint-disable-next-line consistent-return
        return function cleanup() {
            isMountedRef.current = false;
        };
    }, [estimateID]);

    const fetchSignatures = useCallback(async () => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) return;

        try {
            const response = await fetch(
                `/api/estimates/${estimateID}/signatures`,
                {
                    method: 'GET',
                    headers: getApiHeaders(),
                }
            );

            if (response.ok && isMountedRef.current) {
                const signaturesData = await response.json();
                // Filter out invalid signatures
                const validSignatures = (signaturesData.signatures || []).filter(
                    (sig: any) => sig.is_valid !== false
                );
                setSignatures(validSignatures);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching signatures:', error);
        }
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
                    const errorData = await detailsRes.json().catch(() => ({}));
                    // eslint-disable-next-line no-console
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
                } else if (isMountedRef.current) {
                    // Fallback: fetch comments separately if not in details response
                    fetchComments();
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
                    // Fetch signatures after details are loaded
                    fetchSignatures();
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
    }, [estimateID, initialLoading, detailsLoaded, fetchSignatures]);

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

    const getLineItems = useCallback(async () => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) return;

        try {
            const response = await fetch(
                `/api/estimates/${estimateID}/line-items`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.ok) {
                const itemsData = await response.json();
                const itemsArray = Array.isArray(itemsData) ? itemsData : [];
                setLineItems(itemsArray);
                setLineItemsCount(itemsArray.length);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching line items:', error);
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

    const fetchComments = useCallback(async () => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) return;

        try {
            const response = await fetch(
                `/api/estimate-comments/${estimateID}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.ok && isMountedRef.current) {
                const commentsData = await response.json();
                // API returns { Items: [...] } format
                const commentsArray = Array.isArray(commentsData.Items)
                    ? commentsData.Items
                    : Array.isArray(commentsData)
                    ? commentsData
                    : [];
                setComments(commentsArray);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching comments:', error);
        }
    }, [estimateID]);

    // Fallback: If loading takes too long, force completion after 10 seconds
    // But only show error if we truly don't have any data
    useEffect(() => {
        if (!initialLoading) {
            return;
        }

        const timeout = setTimeout(() => {
            // eslint-disable-next-line no-console
            console.warn('Initial loading timeout - forcing completion');
            setInitialLoading(false);
            // Only set error if we don't have cached estimate data
            if (!estimate) {
                setHasError(true);
            }
        }, 10000);

        // eslint-disable-next-line consistent-return
        return function cleanup() {
            clearTimeout(timeout);
        };
    }, [initialLoading, estimate]);

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

    // Scroll listener for "living" button effect
    useEffect(() => {
        const scrollElement = mainColumnRef.current;
        if (!scrollElement) return;

        let lastScrollTop = scrollElement.scrollTop;
        let scrollVelocity = 0;
        let rafId: number | null = null;
        let returnToCenterRafId: number | null = null;
        let returnToCenterTimeoutId: NodeJS.Timeout | null = null;
        let lastScrollTime = Date.now();

        const animateReturnToCenter = () => {
            setButtonTransform(prev => {
                const newX = prev.x * 0.9;
                const newY = prev.y * 0.9;

                // Continue animating if not close enough to center
                if (Math.abs(newX) > 0.1 || Math.abs(newY) > 0.1) {
                    returnToCenterRafId = requestAnimationFrame(animateReturnToCenter);
                    return { x: newX, y: newY };
                }
                return { x: 0, y: 0 };
            });
        };

        const handleScroll = () => {
            const currentScrollTop = scrollElement.scrollTop;
            const currentTime = Date.now();
            const timeDelta = Math.max(1, currentTime - lastScrollTime);
            const scrollDelta = currentScrollTop - lastScrollTop;

            // Calculate velocity (with damping)
            scrollVelocity = scrollVelocity * 0.6 + (scrollDelta / timeDelta) * 0.4;

            // Apply subtle transform based on scroll velocity
            // Limit the movement to a small range for subtlety
            const maxMovement = 10;
            const movementX = Math.max(-maxMovement, Math.min(maxMovement, scrollVelocity * 2));
            const movementY = Math.max(-maxMovement, Math.min(maxMovement, scrollVelocity * 1.5));

            // Cancel any ongoing return-to-center animation
            if (returnToCenterRafId) {
                cancelAnimationFrame(returnToCenterRafId);
                returnToCenterRafId = null;
            }
            if (returnToCenterTimeoutId) {
                clearTimeout(returnToCenterTimeoutId);
                returnToCenterTimeoutId = null;
            }

            if (rafId) {
                cancelAnimationFrame(rafId);
            }

            rafId = requestAnimationFrame(() => {
                setButtonTransform({ x: movementX, y: movementY });
            });

            lastScrollTop = currentScrollTop;
            lastScrollTime = currentTime;

            // Start return-to-center animation after scroll stops
            returnToCenterTimeoutId = setTimeout(() => {
                returnToCenterRafId = requestAnimationFrame(animateReturnToCenter);
            }, 150);
        };

        scrollElement.addEventListener('scroll', handleScroll, { passive: true });

        // Cleanup function
        function cleanup() {
            if (scrollElement) {
                scrollElement.removeEventListener('scroll', handleScroll);
            }
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
            if (returnToCenterRafId) {
                cancelAnimationFrame(returnToCenterRafId);
            }
            if (returnToCenterTimeoutId) {
                clearTimeout(returnToCenterTimeoutId);
            }
        }
        // eslint-disable-next-line consistent-return
        return cleanup;
    }, []);

    const handleOpenExternalLink = (link: string) => {
        window.open(link, '_blank');
    };

    const handleVideoUploadComplete = useCallback(async () => {
        await getResources();
        // Refresh estimate to ensure all data is up to date
        await getEstimate();
        setShowVideoUploaderModal(false);
    }, [getResources, getEstimate]);

    const handleImageUploadComplete = useCallback(async () => {
        await getResources();
        // Refresh estimate to ensure all data is up to date
        await getEstimate();
        setShowImageUploadModal(false);
    }, [getResources, getEstimate]);

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
    const signedPdfResource = useMemo(() => (
        fileResources.find(r => r.resource_location?.toLowerCase().startsWith('signed-estimate-'))
    ), [fileResources]);
    const hasVideo = videoResources.length > 0;
    const hasImages = imageResources.length > 0;
    const hasFiles = fileResources.length > 0;
    const hasPdfPreview = firstPdfResource !== undefined;
    const hasSignedPdf = signedPdfResource !== undefined;

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

    // Check if both parties have signed
    const isFullySigned = useMemo(() => {
        if (signatures.length === 0) return false;
        const hasClient = signatures.some(
            (sig) => sig.signature_type === 'CLIENT' && sig.is_valid !== false
        );
        const hasContractor = signatures.some(
            (sig) => sig.signature_type === 'CONTRACTOR' && sig.is_valid !== false
        );
        return hasClient && hasContractor;
    }, [signatures]);

    // Check if all resources are ready for signature link generation
    const allResourcesReady = useMemo(() => (
        hasVideo && hasImages && lineItemsCount > 0 && !initialLoading && detailsLoaded
    ), [hasVideo, hasImages, lineItemsCount, initialLoading, detailsLoaded]);

    // Track previous state to detect when all resources become ready
    const prevAllResourcesReadyRef = useRef(false);

    // Generate or fetch signature link when all resources are ready OR when we have a signed PDF
    useEffect(() => {
        // Proceed if all resources are ready, OR if we have a signed PDF (need URL for link)
        const shouldFetch = (
            allResourcesReady || (hasSignedPdf && isFullySigned)
        ) && client?.email && estimate;

        if (!shouldFetch) {
            prevAllResourcesReadyRef.current = allResourcesReady;
            return;
        }

        // Skip if we already processed this state (avoid duplicate calls)
        // Note: This will still refresh when estimate changes since estimate is in dependency array
        if (prevAllResourcesReadyRef.current === allResourcesReady && signatureUrl) {
            return;
        }

        // Mark that we're processing this state
        prevAllResourcesReadyRef.current = allResourcesReady;

        const fetchOrGenerateSignatureLink = async () => {
            try {
                setLoadingSignatureUrl(true);

                // First, try to fetch existing signature links
                const signaturesResponse = await fetch(
                    `/api/estimates/${estimateID}/signatures`,
                    {
                        method: 'GET',
                        headers: getApiHeaders(),
                    }
                );

                if (signaturesResponse.ok) {
                    const signaturesData = await signaturesResponse.json();
                    // Filter out REVOKED and EXPIRED links, only use active ones
                    let activeLinks = signaturesData.signature_links?.filter(
                        (link: any) =>
                            link.client_email === client.email &&
                            link.status !== 'REVOKED' &&
                            link.status !== 'EXPIRED'
                    ) || [];

                    // If we have a signed PDF, prefer SIGNED links
                    if (hasSignedPdf && isFullySigned) {
                        const signedLinks = activeLinks.filter((link: any) => link.status === 'SIGNED');
                        if (signedLinks.length > 0) {
                            activeLinks = signedLinks;
                        }
                    }

                    // Sort by created_at descending to get the most recent active link
                    activeLinks.sort((a: any, b: any) => {
                        const dateA = new Date(a.created_at || 0).getTime();
                        const dateB = new Date(b.created_at || 0).getTime();
                        return dateB - dateA;
                    });

                    const existingLink = activeLinks[0];

                    if (existingLink) {
                        // Use existing signature link
                        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jobsuite.app';
                        setSignatureUrl(`${baseUrl}/sign/${existingLink.signature_hash}`);
                        setLoadingSignatureUrl(false);
                        return;
                    }
                }

                // No existing link found, generate a new one
                const generateResponse = await fetch(
                    `/api/estimates/${estimateID}/signature-links`,
                    {
                        method: 'POST',
                        headers: getApiHeaders(),
                        body: JSON.stringify({
                            client_email: client.email,
                            expires_in_days: 30,
                        }),
                    }
                );

                if (generateResponse.ok) {
                    const generateData = await generateResponse.json();
                    setSignatureUrl(generateData.signature_url);
                } else {
                    // eslint-disable-next-line no-console
                    console.error('Failed to generate signature link');
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error fetching/generating signature link:', error);
            } finally {
                setLoadingSignatureUrl(false);
            }
        };

        // Small delay to ensure resources are fully processed
        const timeoutId = setTimeout(() => {
            fetchOrGenerateSignatureLink();
        }, 500);

        // eslint-disable-next-line consistent-return
        return function cleanup() {
            clearTimeout(timeoutId);
        };
    }, [
        allResourcesReady,
        hasSignedPdf,
        isFullySigned,
        client?.email,
        estimateID,
        estimate,
        signatureUrl,
        fetchSignatures,
    ]);

    const OverviewDetails = useMemo(() => (
        <>
            {initialLoading && !estimate ? (
                <EstimateDetailsSkeleton />
            ) : estimate ? (
                <>
                        <div className={classes.twoColumnLayout}>
                            {/* Column 1: Main Content - Video, Images, Description, Activity */}
                            <div className={classes.mainColumn} ref={mainColumnRef}>
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
                                        <div
                                          className={`${classes.addButtonWrapper} ${classes.addButtonFixed}`}
                                          style={{
                                                transform: `translate(${buttonTransform.x}px, ${buttonTransform.y}px)`,
                                                transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                            }}
                                        >
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
                                        </div>
                                    </Flex>
                                </div>

                                {/* Timeline/Stepper showing progress - Hide once all steps are
                                complete and preview is visible. Only show when page is loaded
                                and resources have been checked. */}
                                {!initialLoading
                                    && detailsLoaded
                                    && (!hasVideo || !hasImages || lineItemsCount === 0) && (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <Stepper
                                          active={(() => {
                                            // Find the first incomplete step
                                            const firstIncomplete = !hasVideo ? 0 :
                                                !hasImages ? 1 :
                                                lineItemsCount === 0 ? 2 : 3;

                                            // If all steps are complete, set to 3
                                            if (firstIncomplete === 3) return 3;

                                            // Set active to first incomplete step
                                            // Note: Mantine Stepper marks steps before active as
                                            // completed, so out-of-order completion won't show
                                            // perfectly in the stepper visual, but the
                                            // description text ("Complete" vs "Required") shows
                                            // the actual status
                                            return firstIncomplete;
                                          })()}
                                          size="sm"
                                          allowNextStepsSelect={false}
                                        >
                                            <Stepper.Step
                                              label="Upload Video"
                                              description={hasVideo ? 'Complete' : 'Required'}
                                              completedIcon={<IconVideo size={18} />}
                                            />
                                            <Stepper.Step
                                              label="Upload Image"
                                              description={hasImages ? 'Complete' : 'Required'}
                                              completedIcon={<IconPhoto size={18} />}
                                            />
                                            <Stepper.Step
                                              label="Add Line Items"
                                              description={
                                                  lineItemsCount > 0 ? 'Complete' : 'Required'
                                              }
                                              completedIcon={<IconList size={18} />}
                                            />
                                        </Stepper>
                                    </div>
                                )}

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
                                          skipInitialFetch={comments.length > 0}
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
                                              onEstimateUpdate={() => {
                                                getEstimate();
                                                getLineItems();
                                              }}
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
                                              onEstimateUpdate={() => {
                                                getEstimate();
                                                getLineItems();
                                              }}
                                            />
                                        </div>
                                    )}

                                    {/* Change Orders Section - Only show if not archived and
                                    there are change orders */}
                                    {estimate &&
                                    !estimate.original_estimate_id &&
                                    estimate.status !== EstimateStatus.ARCHIVED &&
                                    changeOrders.length > 0 && (
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

                                    {/* Estimate Preview or Signature Requirement Section */}
                                    {estimate && (
                                        <CollapsibleSection
                                          title={
                                            estimate.status === EstimateStatus.ESTIMATE_ACCEPTED
                                                ? 'Signature Required'
                                                : hasSignedPdf && isFullySigned
                                                ? 'Signed Estimate'
                                                : 'Estimate Preview'
                                          }
                                          defaultOpen
                                          headerActions={
                                              estimate.status !== EstimateStatus.ESTIMATE_ACCEPTED
                                              && hasVideo && hasImages && lineItemsCount > 0
                                              && !(hasSignedPdf && isFullySigned) ? (
                                                  <ActionIcon
                                                    variant="subtle"
                                                    onClick={() => {
                                                        window.open(`/proposals/${estimateID}/print`, '_blank');
                                                    }}
                                                    title="Print Estimate"
                                                  >
                                                    <IconPrinter size={18} />
                                                  </ActionIcon>
                                              ) : undefined
                                          }
                                        >
                                            {estimate.status === EstimateStatus.ESTIMATE_ACCEPTED
                                            ? (
                                                <ContractorSignatureRequired
                                                  estimateId={estimateID}
                                                  onSignatureComplete={() => {
                                                      getEstimate();
                                                      getResources();
                                                      fetchSignatures();
                                                      setSignatureRefreshKey((prev) => prev + 1);
                                                  }}
                                                />
                                            ) : hasSignedPdf && isFullySigned ? (
                                                <Paper shadow="sm" p="xl" radius="md" withBorder>
                                                    <Stack align="center" gap="md">
                                                        <Text c="dimmed" ta="center">
                                                            This estimate has been signed
                                                            by both parties. The signed PDF
                                                            is available in the Files section.
                                                        </Text>
                                                        {signatureUrl && (
                                                            <Button
                                                              component="a"
                                                              href={signatureUrl}
                                                              target="_blank"
                                                              variant="light"
                                                              leftSection={
                                                                <IconExternalLink size={16} />
                                                              }
                                                              mt="md"
                                                            >
                                                                View Signed Estimate
                                                            </Button>
                                                        )}
                                                    </Stack>
                                                </Paper>
                                            ) : (
                                                <EstimatePreview
                                                  estimate={estimate}
                                                  imageResources={imageResources}
                                                  videoResources={videoResources}
                                                  lineItems={lineItems}
                                                  client={client}
                                                  signatureUrl={signatureUrl}
                                                  loadingSignatureUrl={loadingSignatureUrl}
                                                  signatureRefreshKey={signatureRefreshKey}
                                                />
                                            )}
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
                </>
            ) : null}
            {/* Only show error if we truly don't have data and we're not loading */}
            {hasError && !estimate && !initialLoading && (
                <UniversalError message="Unable to access estimate details" />
            )}

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
                  refresh={handleVideoUploadComplete}
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
                    handleImageUploadComplete();
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

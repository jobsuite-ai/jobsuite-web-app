'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ActionIcon, Anchor, Badge, Button, Center, Flex, Menu, Modal, Progress, Stepper, Table, Text } from '@mantine/core';
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
import { VideoFrame } from '@/components/EstimateDetails/VideoFrame';
import { useDataCache } from '@/contexts/DataCacheContext';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectClientById } from '@/store/slices/clientsSlice';
import {
    selectEstimateDetails,
    selectLineItems,
    selectComments,
    selectChangeOrders,
    selectTimeEntries,
    selectResources,
    selectSignatures,
    setEstimateDetails,
} from '@/store/slices/estimateDetailsSlice';
import {
    selectEstimateById,
    enrichEstimate,
} from '@/store/slices/estimatesSlice';
import { generateEstimatePdf } from '@/utils/estimatePdfGenerator';

function EstimateDetailsContent({ estimateID }: { estimateID: string }) {
    const dispatch = useAppDispatch();
    const {
        updateEstimate,
        refreshData,
    } = useDataCache();

    // Get estimate and client from Redux cache
    const cachedEstimate = useAppSelector((state) => selectEstimateById(state, estimateID));
    const cachedClient = useAppSelector((state) =>
        cachedEstimate?.client_id ? selectClientById(state, cachedEstimate.client_id) : undefined
    );

    // Get cached estimate details from Redux
    const cachedDetails = useAppSelector((state) => selectEstimateDetails(state, estimateID));
    const cachedLineItems = useAppSelector((state) => selectLineItems(state, estimateID));
    const cachedComments = useAppSelector((state) => selectComments(state, estimateID));
    const cachedChangeOrders = useAppSelector((state) => selectChangeOrders(state, estimateID));
    const cachedTimeEntries = useAppSelector((state) => selectTimeEntries(state, estimateID));
    const cachedResources = useAppSelector((state) => selectResources(state, estimateID));
    const cachedSignatures = useAppSelector((state) => selectSignatures(state, estimateID));

    const [objectExists, setObjectExists] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Initialize estimate from cached data immediately (synchronously) to avoid loading flash
    const [estimate, setEstimate] = useState<Estimate | undefined>(cachedEstimate);
    // Initialize resources from cached data immediately
    const [resources, setResources] = useState<EstimateResource[]>(cachedResources);
    // Initialize line items from cached data immediately
    const [lineItems, setLineItems] = useState<EstimateLineItem[]>(cachedLineItems);
    // Initialize line items count from cached data
    const [lineItemsCount, setLineItemsCount] = useState(cachedLineItems.length);
    // Initialize client from cached data immediately
    const [client, setClient] = useState<ContractorClient | undefined>(cachedClient);
    const [showVideoUploaderModal, setShowVideoUploaderModal] = useState(false);
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [showFileUploadModal, setShowFileUploadModal] = useState(false);
    const [showDescriptionEditor, setShowDescriptionEditor] = useState(false);
    const [showSpanishTranscriptionEditor, setShowSpanishTranscriptionEditor] = useState(false);
    const [showCreateChangeOrderModal, setShowCreateChangeOrderModal] = useState(false);
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const transcriptionSummaryRef = useRef<TranscriptionSummaryRef>(null);
    const lineItemsRef = useRef<LineItemsRef>(null);
    const isMountedRef = useRef(true);
    const mainColumnRef = useRef<HTMLDivElement>(null);
    const [buttonTransform, setButtonTransform] = useState({ x: 0, y: 0 });
    const router = useRouter();

    // Single initial loading state - false if we have cached estimate, true otherwise
    // Since we initialize estimate from cachedEstimate synchronously, if cachedEstimate exists,
    // estimate will be set immediately and we can show the UI right away
    const [initialLoading, setInitialLoading] = useState(!cachedEstimate);
    const [hasError, setHasError] = useState(false);
    // Initialize from cached data immediately
    const [comments, setComments] = useState<any[]>(cachedComments);
    const [changeOrders, setChangeOrders] = useState<Estimate[]>(cachedChangeOrders);
    const [timeEntries, setTimeEntries] = useState<any[]>(cachedTimeEntries);
    const [showTimeEntryDetails, setShowTimeEntryDetails] = useState(false);
    const [detailsLoaded, setDetailsLoaded] = useState(false);
    // Initialize signatures from cached data immediately
    const [signatures, setSignatures] = useState<Array<{
        signature_type: string;
        signature_data?: string;
        signer_name?: string;
        signer_email?: string;
        signed_at?: string;
        is_valid?: boolean;
    }>>(cachedSignatures);
    // Set signaturesLoaded to true if we have cached signatures
    const [signaturesLoaded, setSignaturesLoaded] = useState(cachedSignatures.length > 0);
    const hasFetchedInitialDataRef = useRef<string | null>(null);
    const signatureLinksRef = useRef<any[] | null>(null);
    const hasProcessedSignatureLinksRef = useRef<string | null>(null);

    const renderTimeEntryRows = () => {
        const parseEntryDate = (value: any) => {
            if (!value) {
                return null;
            }
            const hasTimeZone =
                typeof value === 'string' && /Z$|[+-]\d{2}:?\d{2}$/.test(value);
            const isoValue =
                typeof value === 'string' && !hasTimeZone ? `${value}Z` : value;
            return new Date(isoValue);
        };

        return [...timeEntries]
            .sort((a: any, b: any) => {
                const dateA = parseEntryDate(a.date);
                const dateB = parseEntryDate(b.date);
                const timeA = dateA ? dateA.getTime() : 0;
                const timeB = dateB ? dateB.getTime() : 0;
                // Newest first (descending)
                return timeB - timeA;
            })
            .map((entry: any) => {
                const hoursDisplay = (() => {
                    if (typeof entry.hours === 'number') {
                        return entry.hours.toFixed(2);
                    }
                    return entry.hours || '0.00';
                })();
                const entryDate = parseEntryDate(entry.date);
                const dateDisplay = entryDate
                    ? entryDate.toLocaleDateString(undefined, { timeZone: 'UTC' })
                    : 'N/A';
                const employeeName = entry.employee_name || 'N/A';
                return (
                    <Table.Tr key={entry.id}>
                        <Table.Td>{employeeName}</Table.Td>
                        <Table.Td>{hoursDisplay}</Table.Td>
                        <Table.Td>{dateDisplay}</Table.Td>
                    </Table.Tr>
                );
            });
    };

    // Load cached details data immediately for instant display
    useEffect(() => {
        if (isMountedRef.current) {
            let hasAnyCachedData = false;

            // Load cached line items
            if (cachedLineItems.length > 0) {
                setLineItems(cachedLineItems);
                setLineItemsCount(cachedLineItems.length);
                hasAnyCachedData = true;
            }
            // Load cached comments
            if (cachedComments.length > 0) {
                setComments(cachedComments);
                hasAnyCachedData = true;
            }
            // Load cached change orders
            if (cachedChangeOrders.length > 0) {
                setChangeOrders(cachedChangeOrders);
                hasAnyCachedData = true;
            }
            // Load cached time entries
            if (cachedTimeEntries.length > 0) {
                setTimeEntries(cachedTimeEntries);
                hasAnyCachedData = true;
            }
            // Load cached resources
            if (cachedResources.length > 0) {
                setResources(cachedResources);
                hasAnyCachedData = true;
                // Check if any video resource exists
                const videoResource = cachedResources.find(
                    (r) => r.resource_type === 'VIDEO' && r.upload_status === 'COMPLETED'
                );
                if (videoResource) {
                    setObjectExists(true);
                }
            }
            // Load cached signatures
            if (cachedSignatures.length > 0) {
                setSignatures(cachedSignatures);
                setSignaturesLoaded(true);
                hasAnyCachedData = true;
            }

            // If we have cached data and cached estimate, show UI immediately
            if (hasAnyCachedData && cachedEstimate) {
                setInitialLoading(false);
                setDetailsLoaded(true);
            }
        }
    }, [
        cachedLineItems,
        cachedComments,
        cachedChangeOrders,
        cachedTimeEntries,
        cachedResources,
        cachedSignatures,
        cachedEstimate,
    ]);

    // Update estimate and client when cached data changes (for when navigating between estimates)
    useEffect(() => {
        if (cachedEstimate && isMountedRef.current) {
            // Use cached estimate data immediately - this provides instant UI
            // Merge to avoid clobbering detail-only fields (e.g. discount_percentage).
            setEstimate((prev) => (prev ? { ...prev, ...cachedEstimate } : cachedEstimate));
            // If we have cached estimate and details, show UI immediately
            if (cachedDetails?.lastFetched !== null ||
                cachedLineItems.length > 0 ||
                cachedResources.length > 0) {
                setInitialLoading(false);
                setDetailsLoaded(true);
            }
        }
        if (cachedClient && isMountedRef.current) {
            setClient((prev) => {
                if (!prev) {
                    return cachedClient;
                }
                const cachedSubClients = cachedClient.sub_clients || [];
                const prevSubClients = prev.sub_clients || [];
                if (cachedSubClients.length === 0 && prevSubClients.length > 0) {
                    return { ...cachedClient, sub_clients: prevSubClients };
                }
                return { ...prev, ...cachedClient };
            });
        }
    }, [cachedEstimate, cachedClient, cachedDetails, cachedLineItems, cachedResources]);

    // Fetch all initial data in parallel for fast page load
    useEffect(() => {
        // Reset ref if estimateID changed (component remounted or navigated to different estimate)
        if (
            hasFetchedInitialDataRef.current !== null &&
            hasFetchedInitialDataRef.current !== estimateID
        ) {
            hasFetchedInitialDataRef.current = null;
        }

        // Prevent infinite loop - only fetch once per estimateID
        if (hasFetchedInitialDataRef.current === estimateID) {
            return;
        }

        isMountedRef.current = true;
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            setInitialLoading(false);
            setHasError(true);
            return;
        }

        // Mark as fetched to prevent re-fetching BEFORE starting the async operation
        hasFetchedInitialDataRef.current = estimateID;

        // Check if we have cached data - if so, we can show it immediately and fetch in background
        // We consider it cached if we have any of the detail data types
        const hasCachedData =
            cachedDetails?.lastFetched !== null ||
            cachedLineItems.length > 0 ||
            cachedResources.length > 0 ||
            cachedComments.length > 0;
        if (hasCachedData) {
            // We have cached data, so we can show it immediately
            // Still fetch fresh data in background, but don't block UI
            setInitialLoading(false);
        } else {
            // No cached data, show loading state
            setInitialLoading(true);
        }

        // Fetch all three endpoints in parallel
        const fetchAllData = async () => {
            try {
                if (!hasCachedData) {
                    setInitialLoading(true);
                }
                setHasError(false);
                if (!hasCachedData) {
                    setSignaturesLoaded(false);
                }

                // Start all three requests in parallel
                const [summaryResult, detailsResult, signaturesResult] = await Promise.allSettled([
                    fetch(`/api/estimates/${estimateID}/summary`, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }),
                    fetch(`/api/estimates/${estimateID}/details`, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }),
                    fetch(`/api/estimates/${estimateID}/signatures`, {
                        method: 'GET',
                        headers: getApiHeaders(),
                    }),
                ]);

                if (!isMountedRef.current) return;

                // Process summary response (for quick UI updates)
                if (summaryResult.status === 'fulfilled' && summaryResult.value.ok) {
                    try {
                        const summaryData = await summaryResult.value.json();

                        // Enrich estimate in Redux cache with summary data
                        if (summaryData.estimate) {
                            dispatch(enrichEstimate({
                                estimateId: estimateID,
                                data: {
                                    ...summaryData.estimate,
                                    hours_worked: summaryData.hours_worked,
                                },
                            }));

                            // Update local state (details will overwrite if it arrives later)
                            const detailsOk = detailsResult.status === 'fulfilled' && detailsResult.value.ok;
                            if (isMountedRef.current && !detailsOk) {
                                const estimateData = { ...summaryData.estimate };
                                if (
                                    summaryData.hours_worked !== undefined &&
                                    summaryData.hours_worked !== null
                                ) {
                                    estimateData.hours_worked = summaryData.hours_worked;
                                }
                                setEstimate(estimateData);
                            }
                        }

                        // Process client from summary (details will overwrite if it arrives later)
                        const detailsOk =
                            detailsResult.status === 'fulfilled' && detailsResult.value.ok;
                        if (summaryData.client && isMountedRef.current && !detailsOk) {
                            setClient(summaryData.client);
                        }

                        // Set flags from summary
                        if (summaryData.has_video && isMountedRef.current) {
                            setObjectExists(true);
                        }

                        // Set counts from summary (details will overwrite if it arrives later)
                        const detailsOkForCount = detailsResult.status === 'fulfilled' && detailsResult.value.ok;
                        if (isMountedRef.current && !detailsOkForCount) {
                            setLineItemsCount(summaryData.line_items_count || 0);
                        }
                    } catch (error) {
                        // eslint-disable-next-line no-console
                        console.error('Error parsing summary response:', error);
                    }
                } else if (
                    summaryResult.status === 'rejected' ||
                    (summaryResult.status === 'fulfilled' && !summaryResult.value.ok)
                ) {
                    const errorData = summaryResult.status === 'fulfilled'
                        ? await summaryResult.value.json().catch(() => ({}))
                        : {};
                    // eslint-disable-next-line no-console
                    console.error('Error fetching estimate summary:', errorData);
                }

                // Process details response (more complete data, overwrites summary)
                if (detailsResult.status === 'fulfilled' && detailsResult.value.ok) {
                    try {
                        const detailsData = await detailsResult.value.json();

                        // Process resources
                        if (
                            detailsData.resources &&
                            Array.isArray(detailsData.resources) &&
                            isMountedRef.current
                        ) {
                            const resourcesArray = detailsData.resources;
                            setResources(resourcesArray);

                            // Update Redux cache
                            dispatch(
                                setEstimateDetails({
                                    estimateId: estimateID,
                                    resources: resourcesArray,
                                })
                            );

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

                            // Update Redux cache
                            dispatch(
                                setEstimateDetails({
                                    estimateId: estimateID,
                                    lineItems: itemsArray,
                                })
                            );
                        }

                        // Process comments
                        if (
                            detailsData.comments &&
                            Array.isArray(detailsData.comments) &&
                            isMountedRef.current
                        ) {
                            const commentsArray = detailsData.comments;
                            setComments(commentsArray);

                            // Update Redux cache
                            dispatch(
                                setEstimateDetails({
                                    estimateId: estimateID,
                                    comments: commentsArray,
                                })
                            );
                        }
                        // Note: Comments should be in details response

                        // Process change orders
                        if (
                            detailsData.change_orders &&
                            Array.isArray(detailsData.change_orders) &&
                            isMountedRef.current
                        ) {
                            const changeOrdersArray = detailsData.change_orders;
                            setChangeOrders(changeOrdersArray);

                            // Update Redux cache
                            dispatch(
                                setEstimateDetails({
                                    estimateId: estimateID,
                                    changeOrders: changeOrdersArray,
                                })
                            );
                        }
                        // Note: Change orders should be in details response

                        // Process time entries
                        if (
                            detailsData.time_entries &&
                            Array.isArray(detailsData.time_entries) &&
                            isMountedRef.current
                        ) {
                            const timeEntriesArray = detailsData.time_entries;
                            setTimeEntries(timeEntriesArray);

                            // Update Redux cache
                            dispatch(
                                setEstimateDetails({
                                    estimateId: estimateID,
                                    timeEntries: timeEntriesArray,
                                })
                            );
                        }

                        // Update estimate with data from details (overwrites summary)
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

                        // Process client from details (overwrites summary)
                        if (detailsData.client && isMountedRef.current) {
                            setClient(detailsData.client);
                        }

                        if (isMountedRef.current) {
                            setDetailsLoaded(true);
                        }
                    } catch (error) {
                        // eslint-disable-next-line no-console
                        console.error('Error parsing details response:', error);
                    }
                } else if (
                    detailsResult.status === 'rejected' ||
                    (detailsResult.status === 'fulfilled' && !detailsResult.value.ok)
                ) {
                    const errorData = detailsResult.status === 'fulfilled'
                        ? await detailsResult.value.json().catch(() => ({}))
                        : {};
                    // eslint-disable-next-line no-console
                    console.error('Error fetching estimate details:', errorData);
                }

                // Process signatures response (independent data)
                if (signaturesResult.status === 'fulfilled' && signaturesResult.value.ok) {
                    try {
                        const signaturesData = await signaturesResult.value.json();
                        if (isMountedRef.current) {
                            // Filter out invalid signatures
                            const validSignatures = (signaturesData.signatures || []).filter(
                                (sig: any) => sig.is_valid !== false
                            );
                            setSignatures(validSignatures);

                            // Store signature links for later use (avoid duplicate fetch)
                            signatureLinksRef.current = signaturesData.signature_links || [];

                            // Update Redux cache
                            dispatch(
                                setEstimateDetails({
                                    estimateId: estimateID,
                                    signatures: validSignatures,
                                })
                            );
                        }
                    } catch (error) {
                        // eslint-disable-next-line no-console
                        console.error('Error parsing signatures response:', error);
                    }
                } else if (
                    signaturesResult.status === 'rejected' ||
                    (signaturesResult.status === 'fulfilled' && !signaturesResult.value.ok)
                ) {
                    // eslint-disable-next-line no-console
                    const errorMsg = signaturesResult.status === 'rejected'
                        ? signaturesResult.reason
                        : 'Request failed';
                    // eslint-disable-next-line no-console
                    console.error('Error fetching signatures:', errorMsg);
                }

                // Check if we have any data to show
                if (!estimate) {
                    // If both summary and details failed, set error
                    const summaryFailed =
                        summaryResult.status === 'rejected' ||
                        (summaryResult.status === 'fulfilled' && !summaryResult.value.ok);
                    const detailsFailed =
                        detailsResult.status === 'rejected' ||
                        (detailsResult.status === 'fulfilled' && !detailsResult.value.ok);
                    if (summaryFailed && detailsFailed) {
                        setHasError(true);
                    }
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Error fetching estimate data:', error);
                // Only set error if we don't have data to show
                if (!estimate) {
                    setHasError(true);
                }
            } finally {
                if (isMountedRef.current) {
                    setInitialLoading(false);
                    setSignaturesLoaded(true);
                }
            }
        };

        // Fetch in background (don't await - let it run async)
        fetchAllData();

        // eslint-disable-next-line consistent-return
        return function cleanup() {
            isMountedRef.current = false;
        };
        // dispatch is stable from Redux, but we capture it in the async function
    }, [estimateID]);

    const fetchSignatures = useCallback(async () => {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            // Mark as loaded even if no token (to avoid infinite waiting)
            setSignaturesLoaded(true);
            return;
        }

        try {
            setSignaturesLoaded(false);
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

                // Update Redux cache
                dispatch(
                    setEstimateDetails({
                        estimateId: estimateID,
                        signatures: validSignatures,
                    })
                );
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching signatures:', error);
        } finally {
            if (isMountedRef.current) {
                setSignaturesLoaded(true);
            }
        }
    }, [estimateID, dispatch]);

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
                // Update cache immediately so SidebarDetails and other components see the changes
                updateEstimate(estimateData);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching estimate:', error);
        }
    }, [estimateID, updateEstimate]);

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

                // Update Redux cache
                dispatch(
                    setEstimateDetails({
                        estimateId: estimateID,
                        resources: resourcesArray,
                    })
                );

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
    }, [estimateID, dispatch]);

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

                // Update Redux cache
                dispatch(
                    setEstimateDetails({
                        estimateId: estimateID,
                        lineItems: itemsArray,
                    })
                );
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching line items:', error);
        }
    }, [estimateID, dispatch]);

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

                // Update Redux cache
                dispatch(
                    setEstimateDetails({
                        estimateId: estimateID,
                        changeOrders: changeOrdersArray,
                    })
                );
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching change orders:', error);
        }
    }, [estimateID, dispatch]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

                // Update Redux cache
                dispatch(
                    setEstimateDetails({
                        estimateId: estimateID,
                        comments: commentsArray,
                    })
                );
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching comments:', error);
        }
    }, [estimateID, dispatch]);

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

    const handlePrint = async () => {
        if (!estimate || !client || lineItems.length === 0) {
            notifications.show({
                title: 'Error',
                message: 'Unable to print: Missing required data',
                color: 'red',
                position: 'top-center',
            });
            return;
        }

        try {
            // Fetch signatures if not already loaded
            let pdfSignatures: Array<{
                signature_type: string;
                signature_data: string;
                signer_name?: string;
                is_valid?: boolean;
            }> = [];

            try {
                const signaturesResponse = await fetch(
                    `/api/estimates/${estimateID}/signatures`,
                    {
                        method: 'GET',
                        headers: getApiHeaders(),
                    }
                );

                if (signaturesResponse.ok) {
                    const signaturesData = await signaturesResponse.json();
                    pdfSignatures = (signaturesData.signatures || [])
                        .filter((sig: any) => sig.is_valid !== false)
                        .map((sig: any) => ({
                            signature_type: sig.signature_type,
                            signature_data: sig.signature_data || '',
                            signer_name: sig.signer_name,
                            is_valid: sig.is_valid !== false,
                        }));
                }
            } catch (sigErr) {
                // eslint-disable-next-line no-console
                console.warn('Error fetching signatures for print:', sigErr);
            }

            // Build the template HTML (same as preview)
            const { buildEstimateTemplateHtml } = await import('@/utils/estimatePdfGenerator');
            const fullHtml = await buildEstimateTemplateHtml({
                estimate,
                client,
                lineItems,
                imageResources: resources.filter(
                    (r) => r.resource_type === 'IMAGE' && r.upload_status === 'COMPLETED'
                ),
            });

            // Extract styles and body content
            const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
            const styles = styleMatch ? styleMatch[1] : '';
            const htmlWithoutStyles = fullHtml.replace(/<style[\s\S]*?<\/style>/i, '');

            // Create a new window with just the estimate content
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) {
                notifications.show({
                    title: 'Error',
                    message: 'Please allow popups to print the estimate',
                    color: 'red',
                    position: 'top-center',
                });
                return;
            }

            // Write the HTML with print-specific styles
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Estimate ${estimateID}</title>
                    <style>
                        ${styles}
                        /* Print-specific styles - minimize page margins to account for browser headers/footers */
                        @page {
                            margin: 0;
                            size: letter;
                        }
                        @media print {
                            /* Remove body margins and padding */
                            body {
                                margin: 0 !important;
                                padding: 0.5in !important;
                                box-sizing: border-box !important;
                            }
                            /* Ensure container uses available width and is centered */
                            .container {
                                margin: 0 auto !important;
                                max-width: 100% !important;
                                width: 100% !important;
                                padding: 40px !important;
                                box-sizing: border-box !important;
                            }
                            /* Hide any potential header/footer elements in content */
                            header, footer, .header, .footer {
                                display: none !important;
                            }
                            /* Prevent overflow and ensure proper sizing */
                            html, body {
                                width: 100% !important;
                                overflow: visible !important;
                                box-sizing: border-box !important;
                            }
                            * {
                                box-sizing: border-box !important;
                            }
                        }
                        /* Ensure signature fields have visible borders */
                        signature-field,
                        signature-field.signature-field,
                        .signature-field {
                            display: block !important;
                            border-bottom: 1px solid #333 !important;
                            width: 300px !important;
                            height: 80px !important;
                            min-height: 80px !important;
                            box-sizing: border-box !important;
                            margin-bottom: 5px !important;
                        }
                        body {
                            margin: 0;
                            padding: 20px;
                            font-family: Helvetica Neue, Helvetica, Arial, sans-serif;
                        }
                    </style>
                </head>
                <body>
                    ${htmlWithoutStyles}
                </body>
                </html>
            `);
            printWindow.document.close();

            // Wait for content to load, then place signatures and print
            const placeSignaturesAndPrint = () => {
                // Place signatures in the print window
                if (pdfSignatures.length > 0) {
                    const signatureFields = printWindow.document.querySelectorAll('signature-field');
                    signatureFields.forEach((field) => {
                        const role = field.getAttribute('role');
                        if (!role) return;

                        let signatureType: string | null = null;
                        if (role === 'Service Provider') {
                            signatureType = 'CONTRACTOR';
                        } else if (role === 'Property Owner') {
                            signatureType = 'CLIENT';
                        }

                        if (!signatureType) return;

                        const signature = pdfSignatures.find(
                            (sig) => sig.signature_type === signatureType && sig.is_valid !== false
                        );

                        const signatureField = field as HTMLElement;
                        signatureField.style.borderBottom = '1px solid #333';
                        signatureField.style.display = 'block';
                        signatureField.style.width = '300px';
                        signatureField.style.height = '80px';
                        signatureField.style.minHeight = '80px';
                        signatureField.style.boxSizing = 'border-box';

                        if (signature && signature.signature_data) {
                            let signatureDataUrl = signature.signature_data;
                            if (!signatureDataUrl.startsWith('data:')) {
                                signatureDataUrl = `data:image/png;base64,${signatureDataUrl}`;
                            }

                            const img = printWindow.document.createElement('img');
                            img.src = signatureDataUrl;
                            img.style.width = '100%';
                            img.style.height = 'auto';
                            img.style.maxHeight = '80px';
                            img.style.objectFit = 'contain';
                            img.style.display = 'block';

                            signatureField.innerHTML = '';
                            signatureField.appendChild(img);
                        } else {
                            const spacer = printWindow.document.createElement('div');
                            spacer.style.width = '100%';
                            spacer.style.height = '79px';
                            spacer.style.minHeight = '79px';
                            spacer.style.display = 'block';
                            signatureField.innerHTML = '';
                            signatureField.appendChild(spacer);
                        }
                    });
                }

                // Wait for images to load, then print
                const images = printWindow.document.querySelectorAll('img');
                const imagePromises = Array.from(images).map((img) => {
                    if (img.complete) return Promise.resolve();
                    return new Promise<void>((resolve) => {
                        img.onload = () => resolve();
                        img.onerror = () => resolve();
                        setTimeout(() => resolve(), 2000);
                    });
                });

                Promise.all(imagePromises).then(() => {
                    setTimeout(() => {
                        // Show a brief notification about disabling headers/footers
                        notifications.show({
                            title: 'Print Tip',
                            message: 'In the print dialog, uncheck "Headers and footers" for a cleaner print',
                            color: 'blue',
                            position: 'top-center',
                            autoClose: 3000,
                        });

                        // Focus the print window and print
                        printWindow.focus();
                        printWindow.print();

                        // Note: The print dialog is modal and will block the parent window
                        // This is standard browser behavior and cannot be avoided.
                        // Close the print window after a delay to free up resources
                        setTimeout(() => {
                            try {
                                if (printWindow && !printWindow.closed) {
                                    printWindow.close();
                                }
                            } catch (e) {
                                // Window might already be closed, ignore
                            }
                            // Refocus the parent window
                            window.focus();
                        }, 3000);
                    }, 300);
                });
            };

            // Use both onload and a timeout as fallback
            if (printWindow.document.readyState === 'complete') {
                setTimeout(placeSignaturesAndPrint, 100);
            } else {
                printWindow.onload = () => {
                    setTimeout(placeSignaturesAndPrint, 100);
                };
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error preparing print:', err);
            notifications.show({
                title: 'Error',
                message: 'Failed to prepare print. Please try again.',
                color: 'red',
                position: 'top-center',
            });
        }
    };

    // Removed handleDownloadPdf - using handlePrint instead
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _handleDownloadPdf = async () => {
        if (!estimate || !client || lineItems.length === 0) {
            notifications.show({
                title: 'Error',
                message: 'Unable to generate PDF: Missing required data',
                color: 'red',
                position: 'top-center',
            });
            return;
        }

        if (downloadingPdf) {
            return;
        }

        try {
            setDownloadingPdf(true);

            // Fetch signatures if not already loaded
            let pdfSignatures: Array<{
                signature_type: string;
                signature_data: string;
                signer_name?: string;
                is_valid?: boolean;
            }> = [];

            try {
                const signaturesResponse = await fetch(
                    `/api/estimates/${estimateID}/signatures`,
                    {
                        method: 'GET',
                        headers: getApiHeaders(),
                    }
                );

                if (signaturesResponse.ok) {
                    const signaturesData = await signaturesResponse.json();
                    // Filter out invalid signatures and format exactly like sign page
                    pdfSignatures = (signaturesData.signatures || [])
                        .filter((sig: any) => sig.is_valid !== false)
                        .map((sig: any) => ({
                            signature_type: sig.signature_type,
                            signature_data: sig.signature_data || '',
                            signer_name: sig.signer_name,
                            is_valid: sig.is_valid !== false,
                        }));
                }
            } catch (sigErr) {
                // eslint-disable-next-line no-console
                console.warn('Error fetching signatures for PDF:', sigErr);
                // Continue without signatures
            }

            // Format line items exactly like sign page (lines 230-237)
            const pdfLineItems: EstimateLineItem[] = lineItems.map((item) => ({
                id: item.id,
                title: item.title || '',
                description: item.description || '',
                hours: item.hours || 0,
                rate: item.rate || 0,
                created_at: item.created_at || new Date().toISOString(),
            }));

            // Filter image resources exactly like sign page (lines 239-241)
            const pdfImageResources = resources.filter(
                (r) => r.resource_type === 'IMAGE' && r.upload_status === 'COMPLETED'
            );

            // Generate PDF using the same function and format as sign page
            const pdfBlob = await generateEstimatePdf({
                estimate,
                client,
                lineItems: pdfLineItems,
                imageResources: pdfImageResources,
                signatures: pdfSignatures,
            });

            // Create download link and trigger download
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `estimate-${estimateID}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            notifications.show({
                title: 'Success',
                message: 'PDF downloaded successfully',
                color: 'green',
                position: 'top-center',
            });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error generating PDF:', err);
            notifications.show({
                title: 'Error',
                message: 'Failed to generate PDF. Please try again.',
                color: 'red',
                position: 'top-center',
            });
        } finally {
            setDownloadingPdf(false);
        }
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
    const signedPdfResource = useMemo(() => (
        fileResources.find(r => {
            const location = r.resource_location?.toLowerCase() || '';
            return location.includes('-signed-estimate.pdf') || location === 'fully-signed-estimate.pdf';
        })
    ), [fileResources]);
    const hasVideo = videoResources.length > 0;
    const hasImages = imageResources.length > 0;
    const hasFiles = fileResources.length > 0;
    const hasSignedPdf = signedPdfResource !== undefined;
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

    const hasClientSignature = useMemo(() => (
        signatures.some((sig) => sig.signature_type === 'CLIENT' && sig.is_valid !== false)
    ), [signatures]);

    const hasContractorSignature = useMemo(() => (
        signatures.some((sig) => sig.signature_type === 'CONTRACTOR' && sig.is_valid !== false)
    ), [signatures]);

    const isSignatureRequired = hasClientSignature && !hasContractorSignature;

    // Process signature links from initial fetch (only if estimate has been sent)
    // We no longer generate signature links automatically - they're only created when sending
    useEffect(() => {
        // Reset ref if estimateID changed
        if (
            hasProcessedSignatureLinksRef.current !== null &&
            hasProcessedSignatureLinksRef.current !== estimateID
        ) {
            hasProcessedSignatureLinksRef.current = null;
        }

        // Prevent processing multiple times for the same estimate
        if (hasProcessedSignatureLinksRef.current === estimateID) {
            return;
        }

        // Check if estimate has been sent (by status or by having signature links)
        const estimateHasBeenSent = estimate?.status === EstimateStatus.ESTIMATE_SENT ||
            estimate?.status === EstimateStatus.ESTIMATE_OPENED ||
            estimate?.status === EstimateStatus.ESTIMATE_ACCEPTED ||
            estimate?.status === EstimateStatus.ACCOUNTING_NEEDED ||
            estimate?.status === EstimateStatus.CONTRACTOR_SIGNED ||
            estimate?.status?.toString().startsWith('PROJECT_') ||
            (hasSignedPdf && isFullySigned);

        // Only process if estimate has been sent and we have client email
        const shouldProcess = estimateHasBeenSent && client?.email && estimate;

        if (!shouldProcess) {
            return;
        }

        // Use signature links from initial fetch (stored in ref) instead of fetching again
        const processSignatureLinks = () => {
            const signatureLinks = signatureLinksRef.current || [];

            // If signature links aren't available yet, don't process
            // They'll be processed when the useEffect runs again after they're loaded
            if (signatureLinks.length === 0 && !signaturesLoaded) {
                return;
            }

            // Mark as processed to prevent re-processing
            hasProcessedSignatureLinksRef.current = estimateID;

            // Filter out REVOKED and EXPIRED links, only use active ones
            let activeLinks = signatureLinks.filter(
                (link: any) =>
                    link.client_email === client.email &&
                    link.status !== 'REVOKED' &&
                    link.status !== 'EXPIRED'
            );

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
            }
        };

        // Small delay to ensure signature links are available from initial fetch
        const timeoutId = setTimeout(() => {
            processSignatureLinks();
        }, 500);

        // eslint-disable-next-line consistent-return
        return function cleanup() {
            clearTimeout(timeoutId);
        };
    }, [
        hasSignedPdf,
        isFullySigned,
        client?.email,
        estimateID,
        estimate?.status,
        estimate,
        signaturesLoaded,
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
                                            {estimate.quickbooks_invoice_id && (
                                                <Anchor
                                                  component="button"
                                                  onClick={() => {
                                                      // QuickBooks invoice URL
                                                      const baseUrl =
                                                          'https://app.qbo.intuit.com/app/invoice';
                                                      const qbUrl = `${baseUrl}?txnId=${
                                                          estimate.quickbooks_invoice_id
                                                      }`;
                                                      window.open(qbUrl, '_blank');
                                                  }}
                                                  size="sm"
                                                  style={{
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      gap: '4px',
                                                      color: 'var(--mantine-color-blue-6)',
                                                  }}
                                                >
                                                    <IconReceipt size={16} />
                                                    View QuickBooks Invoice
                                                </Anchor>
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
                                                    {!hasDescription && (
                                                        <Menu.Item
                                                          leftSection={<IconEdit size={16} />}
                                                          onClick={() =>
                                                            setShowDescriptionEditor(true)
                                                          }
                                                        >
                                                            Add Description
                                                        </Menu.Item>
                                                    )}
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
                                    && (
                                        (!hasVideo && !hasDescription)
                                        || !hasImages
                                        || lineItemsCount === 0
                                    ) && (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <Stepper
                                          active={(() => {
                                            // Find the first incomplete step
                                            const firstIncomplete = (!hasVideo && !hasDescription)
                                                ? 0
                                                : !hasImages
                                                    ? 1
                                                    : lineItemsCount === 0 ? 2 : 3;

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
                                              label="Add Description or Video"
                                              description={(hasVideo || hasDescription)
                                                ? 'Complete'
                                                : 'Required'}
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
                                                            {renderTimeEntryRows()}
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
                                              onEstimateUpdate={async () => {
                                                // Update estimate, line items, and cache
                                                await Promise.all([
                                                    getEstimate(),
                                                    getLineItems(),
                                                ]);
                                                // Refresh cache in background
                                                refreshData('estimates').catch(() => {});
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
                                              onEstimateUpdate={async () => {
                                                // Update estimate, line items, and cache
                                                await Promise.all([
                                                    getEstimate(),
                                                    getLineItems(),
                                                ]);
                                                // Refresh cache in background
                                                refreshData('estimates').catch(() => {});
                                              }}
                                            />
                                        </div>
                                    )}

                                    {/* Estimate Preview - show only when all resources present */}
                                    {estimate &&
                                    detailsLoaded &&
                                    signaturesLoaded &&
                                    (hasVideo || hasDescription) &&
                                    hasImages &&
                                    lineItemsCount > 0 && (
                                        <CollapsibleSection
                                          title={
                                            isSignatureRequired
                                                ? 'Signature Required'
                                                : 'Estimate Preview'
                                          }
                                          defaultOpen={!hasSignedPdf && !isSignatureRequired}
                                          headerActions={
                                              !isSignatureRequired
                                              && !hasSignedPdf ? (
                                                  <ActionIcon
                                                    variant="subtle"
                                                    onClick={handlePrint}
                                                    title="Print Estimate"
                                                  >
                                                    <IconPrinter size={18} />
                                                  </ActionIcon>
                                              ) : undefined
                                          }
                                        >
                                            {isSignatureRequired ? (
                                                <ContractorSignatureRequired
                                                  estimateId={estimateID}
                                                  onSignatureComplete={() => {
                                                      getEstimate();
                                                      getResources();
                                                      fetchSignatures();
                                                  }}
                                                />
                                            ) : (
                                                <EstimatePreview
                                                  estimate={estimate}
                                                  imageResources={imageResources}
                                                  videoResources={videoResources}
                                                  lineItems={lineItems}
                                                  client={client}
                                                  signatureUrl={signatureUrl}
                                                  loadingSignatureUrl={false}
                                                  signatures={signatures}
                                                  onSignatureUrlGenerated={(url) => {
                                                      setSignatureUrl(url);
                                                  }}
                                                  onResourcesRefresh={getResources}
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
                                      detailsLoaded={detailsLoaded}
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
              centered
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

            {/* Description Modal */}
            {estimate && (
                <Modal
                  opened={showDescriptionEditor}
                  onClose={() => setShowDescriptionEditor(false)}
                  size="lg"
                  className={classes.uploadModal}
                  centered
                  closeOnClickOutside={false}
                  closeOnEscape={false}
                  title={<Text fz={24} fw={700}>Add Description</Text>}
                >
                    <TranscriptionSummary
                      ref={transcriptionSummaryRef}
                      estimate={estimate}
                      estimateID={estimateID}
                      refresh={getEstimate}
                      autoEdit
                      showSaveButton={false}
                      useRichTextEditor
                      onSaveSuccess={() => setShowDescriptionEditor(false)}
                    />
                    <Flex justify="center" mt="lg">
                        <Button
                          onClick={() =>
                            transcriptionSummaryRef.current?.handleSave()
                          }
                        >
                            Complete
                        </Button>
                    </Flex>
                </Modal>
            )}

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
        hasDescription,
        hasSpanishTranscription,
        videoResources,
        imageResources,
        fileResources,
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

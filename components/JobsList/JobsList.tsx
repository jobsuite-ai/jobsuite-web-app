'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    ActionIcon,
    Badge,
    Card,
    Center,
    Flex,
    Group,
    ScrollArea,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowsMoveHorizontal, IconRefresh } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import classes from './JobsList.module.css';
import { Estimate, EstimateStatus, EstimateType, Job, JobStatus } from '../Global/model';
import { ColumnConfig, loadColumnSettings } from '../Global/settings';
import { getEstimateBadgeColor, getFormattedEstimateStatus, getFormattedEstimateType } from '../Global/utils';

import { getApiHeaders } from '@/app/utils/apiClient';
import { useDataCache } from '@/contexts/DataCacheContext';
import { useAppSelector } from '@/store/hooks';
import { selectProjectsLastFetched } from '@/store/slices/projectsSlice';

// Utility functions for dates and hours
function formatDate(dateString?: string): string {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return '';
    }
}

function getTotalHours(estimate: Estimate): number {
    // Prefer actual_hours if available, otherwise use hours_bid
    if (estimate.actual_hours && estimate.actual_hours > 0) {
        return estimate.actual_hours;
    }
    return estimate.hours_bid || 0;
}

function getDateTimestamp(dateString?: string): number | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    return date.getTime();
}

type DateDisplayInfo = {
    label: string;
    value: string;
};

function getColumnDateInfo(columnId: string, estimate: Estimate): DateDisplayInfo | null {
    const createdAt = estimate.created_at;

    const buildInfo = (primaryDate?: string, primaryLabel?: string) => {
        if (primaryDate) {
            const formatted = formatDate(primaryDate);
            if (formatted) {
                return { label: primaryLabel || 'Date', value: formatted };
            }
        }
        const createdFormatted = formatDate(createdAt);
        return createdFormatted ? { label: 'Created Date', value: createdFormatted } : null;
    };

    switch (columnId) {
        case 'accounting-needed':
        case 'scheduling':
            return buildInfo(estimate.sold_date, 'Sold Date');
        case 'project-scheduled':
            return buildInfo(estimate.scheduled_date, 'Scheduled Date');
        case 'in-progress':
            return buildInfo(estimate.started_date, 'Started Date');
        case 'billing-needed':
            return buildInfo(estimate.finished_date, 'Finished Date');
        case 'accounts-receivable':
            return buildInfo(estimate.invoiced_date, 'Invoiced Date');
        case 'payments-received':
            return buildInfo(estimate.payment_received_date, 'Payment Received Date');
        case 'historical':
            return buildInfo(estimate.finished_date, 'Finished Date');
        default:
            return buildInfo();
    }
}

function getSortDateForColumn(columnId: string, estimate: Estimate): number {
    const createdTimestamp = getDateTimestamp(estimate.created_at) || 0;
    const resolveTimestamp = (dateString?: string) =>
        getDateTimestamp(dateString) ?? createdTimestamp;

    switch (columnId) {
        case 'accounting-needed':
        case 'scheduling':
            return resolveTimestamp(estimate.sold_date);
        case 'project-scheduled':
            return resolveTimestamp(estimate.scheduled_date);
        case 'in-progress':
            return resolveTimestamp(estimate.started_date);
        case 'billing-needed':
            return resolveTimestamp(estimate.finished_date);
        case 'accounts-receivable':
            return resolveTimestamp(estimate.invoiced_date);
        case 'payments-received':
            return resolveTimestamp(estimate.payment_received_date);
        case 'historical':
            return resolveTimestamp(estimate.finished_date);
        default:
            return createdTimestamp;
    }
}

function getInteriorExteriorTotals(jobs: Job[]) {
    return jobs.reduce(
        (totals, job) => {
            const estimate = job as Estimate;
            const totalHours = getTotalHours(estimate);

            if (!totalHours) {
                return totals;
            }

            switch (estimate.estimate_type) {
                case EstimateType.INTERIOR:
                    totals.interior += totalHours;
                    break;
                case EstimateType.EXTERIOR:
                    totals.exterior += totalHours;
                    break;
                case EstimateType.BOTH: {
                    const splitHours = totalHours / 2;
                    totals.interior += splitHours;
                    totals.exterior += splitHours;
                    break;
                }
                default:
                    break;
            }

            return totals;
        },
        { interior: 0, exterior: 0 }
    );
}

// Sortable job card component
interface SortableJobCardProps {
    project: Estimate;
    onClick: (event: React.MouseEvent) => void;
    resolveClientName: (project: Estimate) => string | undefined;
    columnId: string;
}

function SortableJobCard({
    project,
    onClick,
    resolveClientName,
    columnId,
}: SortableJobCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: project.id });

    const resolvedClientName = resolveClientName(project);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    const dateInfo = getColumnDateInfo(columnId, project);

    return (
        <Card
          ref={setNodeRef}
          shadow="sm"
          padding="lg"
          radius="md"
          w="100%"
          withBorder={false}
          {...attributes}
          {...listeners}
          className={classes.sortableJobCard}
          style={style}
          onClick={(event) => {
                // Only trigger click if not dragging
                if (!isDragging) {
                    onClick(event);
                }
            }}
        >
            <Group justify="space-between" mb="xs">
                <Text fw={500} size="sm" lineClamp={1}>
                    {project.title || resolvedClientName || 'Untitled Project'}
                </Text>
                <Badge
                  className={classes.badge}
                  color={getEstimateBadgeColor(
                    project.status || EstimateStatus.NEW_LEAD
                  )}
                  size="sm"
                >
                    {String(getFormattedEstimateStatus(project.status) || 'UNKNOWN')}
                </Badge>
            </Group>

            {project.estimate_type && (
                <Text size="xs" c="dimmed" mb="xs">
                    {getFormattedEstimateType(project.estimate_type)}
                </Text>
            )}

            <Stack gap={2}>
                <Text size="xs" c="dimmed" lineClamp={1}>
                    {project.address_street || project.client_address || 'No address'}
                </Text>
                <Text size="xs" c="dimmed">
                    {project.address_city || project.city}, {project.address_state || project.state}{' '}
                    {project.address_zipcode || project.zip_code}
                </Text>
            </Stack>

            <Group justify="space-between" mt="xs" gap="xs">
                <Text size="xs" c="dimmed">
                    {getTotalHours(project) > 0 ? `${getTotalHours(project).toFixed(1)} hrs` : 'No hours'}
                </Text>
                {dateInfo && (
                    <Text size="xs" c="dimmed">
                        {dateInfo.label}: {dateInfo.value}
                    </Text>
                )}
            </Group>
        </Card>
    );
}

// Column component
interface KanbanColumnProps {
    column: ColumnConfig;
    jobs: Job[];
    onJobClick: (job: Job, event?: React.MouseEvent) => void;
    resolveClientName: (project: Estimate) => string | undefined;
    isLoading?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    columnRef?: React.RefObject<HTMLDivElement>;
    isOver?: boolean;
    hoursSummary?: { interior: number; exterior: number };
}

function KanbanColumn({
    column,
    jobs,
    onJobClick,
    resolveClientName,
    isLoading,
    isCollapsed,
    onToggleCollapse,
    columnRef,
    isOver: isOverProp,
    hoursSummary,
}: KanbanColumnProps) {
    const jobIds = jobs.map((job) => job.id);
    const { setNodeRef, isOver: isOverDroppable } = useDroppable({
        id: column.id,
    });
    // Use prop if provided (from parent state), otherwise use droppable's isOver
    const isOver = isOverProp !== undefined ? isOverProp : isOverDroppable;

    const isHistorical = column.id === 'historical';

    if (isHistorical && isCollapsed) {
        const collapsedClassName = `${classes.kanbanColumn} ${classes.historicalCollapsed} ${
            isOver ? classes.kanbanColumnOver : classes.kanbanColumnNotOver
        }`;

        return (
            <Card
              ref={(node) => {
                  setNodeRef(node);
                  if (columnRef && node) {
                      (columnRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                  }
              }}
              withBorder
              shadow="sm"
              className={collapsedClassName}
            >
                <Stack align="center" gap="md" h="100%" justify="center">
                    <Stack gap={2} align="center">
                        <Title
                          order={5}
                          className={classes.rotatedTitle}
                          ta="center"
                        >
                            {column.title}
                        </Title>
                    </Stack>
                    <Badge size="lg" variant="light">{jobs.length}</Badge>
                    <Center>
                      <ActionIcon
                        variant="subtle"
                        onClick={onToggleCollapse}
                        className={classes.collapseButton}
                      >
                          <IconArrowsMoveHorizontal size={16} />
                      </ActionIcon>
                    </Center>
                </Stack>
            </Card>
        );
    }

    const isAccountingNeeded = column.id === 'accounting-needed';
    const columnClassName = `${classes.kanbanColumn} ${isOver ? classes.kanbanColumnOver : classes.kanbanColumnNotOver} ${isAccountingNeeded ? classes.accountingNeededColumn : ''}`;

    return (
        <Card
          ref={(node) => {
              setNodeRef(node);
              if (columnRef && node) {
                  (columnRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
              }
          }}
          withBorder
          shadow="sm"
          className={columnClassName}
        >
            <Flex justify="space-between" align="center" mb="md">
                <Stack gap={2} style={{ flex: 1 }}>
                    <Title order={5} ta="center">
                        {column.title}
                    </Title>
                    {column.id === 'scheduling' && hoursSummary ? (
                        <Group gap="xs" justify="center">
                            <Text size="xs" c="dimmed">
                                Interior: {hoursSummary.interior.toFixed(1)} hrs
                            </Text>
                            <Text size="xs" c="dimmed">•</Text>
                            <Text size="xs" c="dimmed">
                                Exterior: {hoursSummary.exterior.toFixed(1)} hrs
                            </Text>
                        </Group>
                    ) : null}
                </Stack>
                {isHistorical && onToggleCollapse ? (
                    <Group gap="xs">
                        <Badge size="lg" variant="light">{jobs.length}</Badge>
                        <ActionIcon
                          variant="subtle"
                          onClick={onToggleCollapse}
                          size="sm"
                        >
                            <IconArrowsMoveHorizontal size={16} />
                        </ActionIcon>
                    </Group>
                ) : (
                    <Badge size="lg" variant="light">{jobs.length}</Badge>
                )}
            </Flex>
            <ScrollArea className={classes.scrollArea}>
                <SortableContext
                  items={jobIds}
                  strategy={verticalListSortingStrategy}
                >
                    <Stack gap="xs">
                        {jobs.length > 0 ? (
                            jobs.map((job) => (
                                <SortableJobCard
                                  key={job.id}
                                  project={job}
                                  resolveClientName={resolveClientName}
                                  onClick={(event) => onJobClick(job, event)}
                                  columnId={column.id}
                                />
                            ))
                        ) : (
                            <Card
                              shadow="sm"
                              padding="lg"
                              radius="md"
                              withBorder={false}
                              className={classes.emptyStateCard}
                            >
                                <Text fw={500} ta="center" size="sm" c="dimmed">
                                    {isLoading ? 'Loading…' : 'No jobs'}
                                </Text>
                            </Card>
                        )}
                    </Stack>
                </SortableContext>
            </ScrollArea>
        </Card>
    );
}

// localStorage key for job order persistence
const JOB_ORDER_STORAGE_KEY = 'jobsuite_job_order';

// Type for storing job order per column
type JobOrderMap = Record<string, string[]>; // columnId -> array of job IDs

function loadJobOrder(): JobOrderMap {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem(JOB_ORDER_STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved) as JobOrderMap;
        } catch {
            return {};
        }
    }
    return {};
}

function saveJobOrder(orderMap: JobOrderMap): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(JOB_ORDER_STORAGE_KEY, JSON.stringify(orderMap));
}

export default function JobsList() {
    const {
        clients,
        projects,
        loading: cacheLoading,
        errors: cacheErrors,
        refreshData,
        updateEstimate,
        updateProject,
    } = useDataCache();

    // Initialize jobs from Redux state (via context)
    const [jobs, setJobs] = useState<Job[]>(projects.length > 0 ? projects : []);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);
    const [columns, setColumns] = useState<ColumnConfig[]>(loadColumnSettings());
    const [jobOrder, setJobOrder] = useState<JobOrderMap>(loadJobOrder());
    const [isHistoricalCollapsed, setIsHistoricalCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        const saved = localStorage.getItem('historical_column_collapsed');
        return saved === 'true';
    });
    const [refreshing, setRefreshing] = useState(false);
    const [autoCreateEnabled, setAutoCreateEnabled] = useState<boolean>(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const hasAttemptedAutoRefreshRef = useRef(false);
    const hasEverHadDataRef = useRef(projects.length > 0);
    const lastProjectsErrorRef = useRef<string | null>(null);
    const router = useRouter();
    const lastFetched = useAppSelector(selectProjectsLastFetched);
    const clientNameById = useMemo(
        () => new Map(clients.map((client) => [client.id, client.name])),
        [clients]
    );
    const resolveClientName = useCallback(
        (project: Estimate) => project.client_name || clientNameById.get(project.client_id),
        [clientNameById]
    );

    // Configure sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Check QuickBooks auto-create setting
    useEffect(() => {
        const checkAutoCreate = async () => {
            try {
                const response = await fetch('/api/quickbooks/status', {
                    method: 'GET',
                    headers: getApiHeaders(),
                });

                if (response.ok) {
                    const statusData = await response.json();
                    setAutoCreateEnabled(
                        statusData.auto_create_customers_and_estimates || false
                    );
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Error checking QuickBooks auto-create setting:', err);
            }
        };

        checkAutoCreate();
    }, []);

    // Update jobs when cache data changes
    // Always keep lanes visible - loading happens in background
    useEffect(() => {
        // Update jobs when we get fresh data from Redux
        if (projects.length > 0) {
            setJobs(projects);
            hasEverHadDataRef.current = true;
        } else if (hasEverHadDataRef.current) {
            // If we've had data before but now it's empty, keep the empty state
            // Don't clear jobs to prevent flash
        }
    }, [projects]);

    // Auto-refresh if data is empty after initial load (e.g., after login or cache expired)
    // Only runs once per mount to prevent infinite loops
    useEffect(() => {
        // Only auto-refresh if:
        // 1. Not currently loading
        // 2. Data is empty
        // 3. We have an access token (user is logged in)
        // 4. We haven't already attempted an auto-refresh
        const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        if (
            !cacheLoading.projects &&
            jobs.length === 0 &&
            accessToken &&
            !hasAttemptedAutoRefreshRef.current &&
            !lastFetched
        ) {
            // Small delay to avoid race conditions with initial cache load
            const timeoutId = setTimeout(() => {
                if (
                    jobs.length === 0 &&
                    !cacheLoading.projects &&
                    !hasAttemptedAutoRefreshRef.current
                ) {
                    hasAttemptedAutoRefreshRef.current = true;
                    // Don't call invalidateCache - it clears state and causes loops
                    // Just refresh the data
                    refreshData('projects');
                }
            }, 1000); // Increased delay to let DataCacheContext finish initial load
            return () => clearTimeout(timeoutId);
        }
        return undefined;
    }, [jobs.length, cacheLoading.projects, refreshData]);

    useEffect(() => {
        if (cacheErrors.projects && cacheErrors.projects !== lastProjectsErrorRef.current) {
            lastProjectsErrorRef.current = cacheErrors.projects;
            notifications.show({
                title: 'Project request failed',
                message: cacheErrors.projects,
                color: 'red',
                position: 'bottom-right',
                autoClose: 5000,
            });
        }
        if (!cacheErrors.projects) {
            lastProjectsErrorRef.current = null;
        }
    }, [cacheErrors.projects]);

    // Listen for storage changes to reload column settings
    useEffect(() => {
        const handleStorageChange = () => {
            setColumns(loadColumnSettings());
        };

        window.addEventListener('storage', handleStorageChange);
        // Also listen for custom event for same-origin storage changes
        window.addEventListener('localStorageChange', handleStorageChange as EventListener);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('localStorageChange', handleStorageChange as EventListener);
        };
    }, []);

    // Save collapse state to localStorage
    useEffect(() => {
        localStorage.setItem('historical_column_collapsed', String(isHistoricalCollapsed));
    }, [isHistoricalCollapsed]);

    // Save job order to localStorage whenever it changes
    useEffect(() => {
        saveJobOrder(jobOrder);
    }, [jobOrder]);

    // Scroll to end when historical column is expanded (transitioning from collapsed)
    const prevCollapsedRef = useRef(isHistoricalCollapsed);
    const historicalColumnRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        // Only scroll if transitioning from collapsed to expanded
        if (prevCollapsedRef.current && !isHistoricalCollapsed && scrollContainerRef.current) {
            // Wait for layout to fully update after expansion
            const scrollToEnd = () => {
                if (scrollContainerRef.current) {
                    const container = scrollContainerRef.current;

                    // Try to scroll the historical column into view first
                    if (historicalColumnRef.current) {
                        historicalColumnRef.current.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest',
                            inline: 'end',
                        });
                    } else {
                        // Fallback: calculate max scroll and scroll there
                        const maxScroll = container.scrollWidth - container.clientWidth;
                        container.scrollTo({
                            left: maxScroll,
                            behavior: 'smooth',
                        });
                    }

                    // Double-check after animation completes to ensure we're at the end
                    setTimeout(() => {
                        if (scrollContainerRef.current) {
                            const scrollContainer = scrollContainerRef.current;
                            const currentMax =
                                scrollContainer.scrollWidth - scrollContainer.clientWidth;
                            if (scrollContainer.scrollLeft < currentMax - 1) {
                                scrollContainer.scrollLeft = currentMax;
                            }
                        }
                    }, 600); // Wait for smooth scroll to complete
                }
            };

            // Use multiple requestAnimationFrame calls to ensure layout is updated
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setTimeout(scrollToEnd, 200);
                    });
                });
            });
        }
        prevCollapsedRef.current = isHistoricalCollapsed;
    }, [isHistoricalCollapsed, columns]);

    const toggleHistoricalCollapse = () => {
        setIsHistoricalCollapsed((prev) => !prev);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            // Refresh data in background without clearing cache
            // This keeps the lanes visible during refresh
            await refreshData('projects', true);
        } finally {
            setRefreshing(false);
        }
    };

    function getColumnIdForEstimate(estimate: Estimate): string | null {
        const jobStatus = String(estimate.status);
        const column = columns.find((col) =>
            col.statuses.some((status) => String(status) === jobStatus)
        );
        return column?.id ?? null;
    }

    // Helper function to check if a project was completed within the past 2 weeks
    function isCompletedWithinTwoWeeks(estimate: Estimate): boolean {
        if (!estimate.finished_date) return false;
        const finishedDate = new Date(estimate.finished_date);
        if (Number.isNaN(finishedDate.getTime())) return false;
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        return finishedDate >= twoWeeksAgo;
    }

    // Get jobs for each column
    function getJobsForColumn(columnId: string): Job[] {
        const column = columns.find((col) => col.id === columnId);
        if (!column) return [];

        const filteredJobs = jobs.filter((job) => {
            // Handle both string and EstimateStatus enum values
            const estimate = job as Estimate;
            const jobStatus = typeof estimate.status === 'string'
                ? estimate.status
                : estimate.status;

            // Special handling for historical column:
            // include projects completed within past 2 weeks
            // and has PROJECT_COMPLETED status
            if (columnId === 'historical') {
                const isStatusMatch = column.statuses.includes(jobStatus as JobStatus);
                const isRecentlyCompleted = isCompletedWithinTwoWeeks(estimate);
                return isStatusMatch && isRecentlyCompleted;
            }

            // For other columns, show projects matching their status
            // (projects finished within 2 weeks will ALSO appear in historical,
            // but not be removed from here)
            return column.statuses.includes(jobStatus as JobStatus);
        });

        // Check if we have a saved order for this column
        const savedOrder = jobOrder[columnId];
        if (savedOrder && savedOrder.length > 0) {
            // Create a map for quick lookup
            const jobMap = new Map(filteredJobs.map(job => [job.id, job]));

            // Sort by saved order, then add any new jobs that aren't in the saved order
            const orderedJobs: Job[] = [];
            const usedIds = new Set<string>();

            // Add jobs in saved order
            for (const jobId of savedOrder) {
                const job = jobMap.get(jobId);
                if (job) {
                    orderedJobs.push(job);
                    usedIds.add(jobId);
                }
            }

            // Add any new jobs that weren't in the saved order
            // (sorted by the column-specific date)
            const newJobs = filteredJobs
                .filter(job => !usedIds.has(job.id))
                .sort((a, b) => {
                    const estimateA = a as Estimate;
                    const estimateB = b as Estimate;
                    return getSortDateForColumn(columnId, estimateA) -
                        getSortDateForColumn(columnId, estimateB);
                });

            return [...orderedJobs, ...newJobs];
        }

        // No saved order, sort by the column-specific date
        return filteredJobs.sort((a, b) => {
            const estimateA = a as Estimate;
            const estimateB = b as Estimate;
            return getSortDateForColumn(columnId, estimateA) -
                getSortDateForColumn(columnId, estimateB);
        });
    }

    // Handle drag start
    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string);
    }

    // Handle drag over - allows dropping on sortable items by treating them as column drops
    function handleDragOver(event: DragOverEvent) {
        const { over } = event;

        if (!over) {
            setOverId(null);
            return;
        }

        const overItemId = over.id as string;

        // If dragging over a sortable item (job), find which column it belongs to
        const job = jobs.find((j) => j.id === overItemId);
        if (job) {
            // Find the column that contains this job
            const column = columns.find((col) => {
                const estimate = job as Estimate;
                const jobStatus = typeof estimate.status === 'string'
                    ? estimate.status
                    : estimate.status;
                return col.statuses.includes(jobStatus as JobStatus);
            });
            if (column) {
                setOverId(column.id);
                return;
            }
        }

        // If dragging over a column directly, use that
        const column = columns.find((col) => col.id === overItemId);
        if (column) {
            setOverId(column.id);
            return;
        }

        setOverId(null);
    }

    // Handle drag end
    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveId(null);

        // Use overId state if available (from drag over), otherwise use over from event
        const targetColumnId = overId || (over?.id as string);

        setOverId(null);

        if (!targetColumnId) return;

        const estimateId = active.id as string;

        // Find the estimate
        const estimate = jobs.find((j) => j.id === estimateId) as Estimate | undefined;
        if (!estimate) return;

        // Find the target column
        const targetColumn = columns.find((col) => col.id === targetColumnId);
        if (!targetColumn) return;

        // Check if estimate is already in this column
        const currentStatus = String(estimate.status);
        const isSameColumn = targetColumn.statuses.some(
            (status) => String(status) === currentStatus
        );

        if (isSameColumn) {
            // Reordering within the same column
            // Get the current order for this column, or create one from current jobs
            const currentOrder = jobOrder[targetColumnId] ||
                getJobsForColumn(targetColumnId).map(j => j.id);
            const oldIndex = currentOrder.indexOf(estimateId);

            // Check if we're dragging over another job in the same column
            const overJobId = over?.id && typeof over.id === 'string' ? over.id : null;

            if (overJobId && oldIndex !== -1) {
                const newIndex = currentOrder.indexOf(overJobId);

                if (oldIndex !== newIndex && newIndex !== -1) {
                    // Reorder the array
                    const newOrder = arrayMove(currentOrder, oldIndex, newIndex);

                    // Update the job order state
                    setJobOrder((prev) => ({
                        ...prev,
                        [targetColumnId]: newOrder,
                    }));
                }
            }
            return;
        }

        // Moving to a different column - update estimate status
        const newStatus = targetColumn.defaultStatus as EstimateStatus;

        // Store original estimate for potential revert
        const originalEstimate = { ...estimate };

        // If moving to historical, ensure finished_date is set if not already set
        const isMovingToHistorical = targetColumnId === 'historical';
        const finishedDate = isMovingToHistorical && !estimate.finished_date
            ? new Date().toISOString()
            : estimate.finished_date;

        // Create optimistic update
        const finishedDateUpdate = isMovingToHistorical && !estimate.finished_date
            ? { finished_date: finishedDate }
            : {};
        const optimisticEstimate = {
            ...estimate,
            status: newStatus,
            ...finishedDateUpdate,
        };

        // Optimistically update the UI
        setJobs((prevJobs) =>
            prevJobs.map((j) =>
                j.id === estimateId
                    ? { ...j, status: newStatus, ...finishedDateUpdate }
                    : j
            )
        );

        // Optimistically update the cache
        updateEstimate(optimisticEstimate);
        updateProject(optimisticEstimate);

        // Remove from old column's order and add to new column's order
        const oldColumn = columns.find((col) =>
            col.statuses.some((status) => String(status) === currentStatus)
        );

        setJobOrder((prev) => {
            const newOrder = { ...prev };

            // Remove from old column's order
            if (oldColumn && newOrder[oldColumn.id]) {
                newOrder[oldColumn.id] = newOrder[oldColumn.id].filter(
                    id => id !== estimateId
                );
            }

            // Add to new column's order at the end
            // (or at a specific position if dragging over a job)
            const targetJobs = getJobsForColumn(targetColumnId);
            const overJob = over?.id && typeof over.id === 'string'
                ? targetJobs.find((j) => j.id === over.id)
                : null;

            if (overJob) {
                const insertIndex = targetJobs.findIndex((j) => j.id === overJob.id);
                if (!newOrder[targetColumnId]) {
                    newOrder[targetColumnId] = targetJobs.map((j) => j.id);
                }
                const currentOrder = newOrder[targetColumnId];
                const currentIndex = currentOrder.indexOf(estimateId);
                if (currentIndex === -1) {
                    // Insert at the position
                    currentOrder.splice(insertIndex, 0, estimateId);
                } else {
                    // Move within the array
                    const reordered = arrayMove(currentOrder, currentIndex, insertIndex);
                    newOrder[targetColumnId] = reordered;
                }
            } else {
                // Add to end
                if (!newOrder[targetColumnId]) {
                    newOrder[targetColumnId] = [];
                }
                if (!newOrder[targetColumnId].includes(estimateId)) {
                    newOrder[targetColumnId] = [...newOrder[targetColumnId], estimateId];
                }
            }

            return newOrder;
        });

        // Update via API
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            // Revert if no token
            setJobs((prevJobs) =>
                prevJobs.map((j) =>
                    j.id === estimateId
                        ? {
                            ...j,
                            status: originalEstimate.status,
                            finished_date: originalEstimate.finished_date,
                        }
                        : j
                )
            );
            // Revert cache update
            updateEstimate(originalEstimate);
            updateProject(originalEstimate);
            return;
        }

        try {
            const updatePayload: { status: EstimateStatus; finished_date?: string } = {
                status: newStatus,
            };
            // If moving to historical and finished_date is not set, include it in the update
            if (isMovingToHistorical && !estimate.finished_date) {
                updatePayload.finished_date = finishedDate;
            }

            const response = await fetch(`/api/estimates/${estimateId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatePayload),
            });

            if (!response.ok) {
                // Revert on error
                setJobs((prevJobs) =>
                    prevJobs.map((j) =>
                        j.id === estimateId
                            ? {
                                ...j,
                                status: originalEstimate.status,
                                finished_date: originalEstimate.finished_date,
                            }
                            : j
                    )
                );
                // Revert cache update
                updateEstimate(originalEstimate);
                updateProject(originalEstimate);
                const errorData = await response.json().catch(() => ({}));
                // eslint-disable-next-line no-console
                console.error('Error updating estimate status:', errorData);
            } else {
                // Get the updated estimate from response
                const updatedEstimate = await response.json();
                // Update cache with the confirmed estimate from server
                updateEstimate(updatedEstimate);
                updateProject(updatedEstimate);
                // Optionally refresh in background for consistency (non-blocking)
                refreshData('projects').catch(() => {});
            }
        } catch (error) {
            // Revert on error
            setJobs((prevJobs) =>
                prevJobs.map((j) =>
                    j.id === estimateId
                        ? {
                            ...j,
                            status: originalEstimate.status,
                            finished_date: originalEstimate.finished_date,
                        }
                        : j
                )
            );
            // Revert cache update
            updateEstimate(originalEstimate);
            updateProject(originalEstimate);
            // eslint-disable-next-line no-console
            console.error('Error updating estimate status:', error);
        }
    }

    function handleJobClick(job: Job, event?: React.MouseEvent) {
        if (event?.metaKey || event?.ctrlKey) {
              window.open(`/proposals/${job.id}`, '_blank');
            } else {
              router.push(`/proposals/${job.id}`);
            }
    }

    // Get active job for drag overlay
    const activeJob = activeId ? jobs.find((job) => job.id === activeId) : null;
    const activeJobDateInfo = activeJob
        ? getColumnDateInfo(getColumnIdForEstimate(activeJob as Estimate) ?? 'unknown', activeJob as Estimate)
        : null;

    return (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
            <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className={classes.refreshButton}>
                    <ActionIcon
                      variant="light"
                      onClick={handleRefresh}
                      loading={refreshing || cacheLoading.projects}
                      title={
                          refreshing || cacheLoading.projects
                              ? 'Refreshing...'
                              : 'Refresh projects'
                      }
                      size={40}
                      className={
                          refreshing || cacheLoading.projects
                              ? classes.refreshButtonLoading
                              : undefined
                      }
                    >
                        <IconRefresh size={24} />
                    </ActionIcon>
                </div>
                <div ref={scrollContainerRef} className={classes.flexWrapper}>
                <Flex
                  direction={{ base: 'column', md: 'row' }}
                  justify="flex-start"
                  align="flex-start"
                  gap="md"
                  h="100%"
                  className={classes.flexContainer}
                >
                    {columns
                        .filter((column) => {
                            // Hide Accounting Needed column if auto-create is enabled
                            if (column.id === 'accounting-needed' && autoCreateEnabled) {
                                return false;
                            }
                            return true;
                        })
                        .map((column) => {
                            const columnJobs = getJobsForColumn(column.id);
                            const hoursSummary =
                                column.id === 'scheduling'
                                    ? getInteriorExteriorTotals(columnJobs)
                                    : undefined;

                            return (
                                <KanbanColumn
                                  key={column.id}
                                  column={column}
                                  jobs={columnJobs}
                                  onJobClick={handleJobClick}
                                  resolveClientName={resolveClientName}
                                  isLoading={cacheLoading.projects}
                                  isCollapsed={column.id === 'historical' ? isHistoricalCollapsed : false}
                                  onToggleCollapse={column.id === 'historical' ? toggleHistoricalCollapse : undefined}
                                  columnRef={column.id === 'historical' ? historicalColumnRef : undefined}
                                  isOver={overId === column.id}
                                  hoursSummary={hoursSummary}
                                />
                            );
                        })}
                </Flex>
                </div>
            </div>

            <DragOverlay>
                {activeJob ? (
                  <Card
                    shadow="lg"
                    padding="lg"
                    radius="md"
                    w="220px"
                    withBorder
                    className={classes.dragOverlayCard}
                  >
                    <Group justify="space-between" mb="xs">
                      <Text fw={500} size="sm" lineClamp={1}>
                        {(activeJob as Estimate).title ||
                            resolveClientName(activeJob as Estimate) ||
                            'Untitled Project'}
                      </Text>
                      <Badge
                        className={classes.badge}
                        color={getEstimateBadgeColor(
                          activeJob.status || EstimateStatus.NEW_LEAD
                        )}
                        size="sm"
                      >
                        {String(getFormattedEstimateStatus(activeJob.status) || 'UNKNOWN')}
                      </Badge>
                    </Group>

                    {(activeJob as Estimate).estimate_type && (
                      <Text size="xs" c="dimmed" mb="xs">
                        {getFormattedEstimateType((activeJob as Estimate).estimate_type)}
                      </Text>
                    )}

                    <Stack gap={2}>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {(activeJob as Estimate).address_street ||
                            (activeJob as Estimate).client_address ||
                            'No address'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {(activeJob as Estimate).address_city ||
                            (activeJob as Estimate).city}
                        ,{' '}
                        {(activeJob as Estimate).address_state ||
                            (activeJob as Estimate).state}{' '}
                        {(activeJob as Estimate).address_zipcode ||
                            (activeJob as Estimate).zip_code}
                      </Text>
                    </Stack>

                    <Group justify="space-between" mt="xs" gap="xs">
                      <Text size="xs" c="dimmed">
                        {getTotalHours(activeJob as Estimate) > 0
                          ? `${getTotalHours(activeJob as Estimate).toFixed(1)} hrs`
                          : 'No hours'}
                      </Text>
                      {activeJobDateInfo && (
                        <Text size="xs" c="dimmed">
                          {activeJobDateInfo.label}: {activeJobDateInfo.value}
                        </Text>
                      )}
                    </Group>
                  </Card>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

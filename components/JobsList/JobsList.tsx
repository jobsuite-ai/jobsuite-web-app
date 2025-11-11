'use client';

import { useEffect, useRef, useState } from 'react';

import {
    DndContext,
    DragEndEvent,
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
import { IconArrowsMoveHorizontal } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import classes from './JobsList.module.css';
import LoadingState from '../Global/LoadingState';
import { Estimate, EstimateStatus, Job, JobStatus } from '../Global/model';
import { ColumnConfig, loadColumnSettings } from '../Global/settings';
import { getEstimateBadgeColor } from '../Global/utils';

// Sortable job card component
interface SortableJobCardProps {
    project: Estimate;
    onClick: () => void;
}

function SortableJobCard({ project, onClick }: SortableJobCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: project.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

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
          onClick={() => {
                // Only trigger click if not dragging
                if (!isDragging) {
                    onClick();
                }
            }}
        >
            <Group justify="space-between" mb="xs">
                <Text fw={500} size="sm" lineClamp={1}>
                    {project.title || project.client_name || 'Untitled Project'}
                </Text>
                <Badge
                  className={classes.badge}
                  color={getEstimateBadgeColor(
                    (project.status) || EstimateStatus.NEW_LEAD
                  )}
                  size="sm"
                >
                    {String(project.status || 'UNKNOWN')}
                </Badge>
            </Group>

            {project.estimate_type && (
                <Text size="xs" c="dimmed" mb="xs">
                    {project.estimate_type}
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
        </Card>
    );
}

// Column component
interface KanbanColumnProps {
    column: ColumnConfig;
    jobs: Job[];
    onJobClick: (job: Job, event?: React.MouseEvent) => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    columnRef?: React.RefObject<HTMLDivElement>;
}

function KanbanColumn({
    column,
    jobs,
    onJobClick,
    isCollapsed,
    onToggleCollapse,
    columnRef,
}: KanbanColumnProps) {
    const jobIds = jobs.map((job) => job.id);
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
    });

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
                    <Title
                      order={5}
                      className={classes.rotatedTitle}
                      ta="center"
                    >
                        {column.title}
                    </Title>
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
          className={`${classes.kanbanColumn} ${isOver ? classes.kanbanColumnOver : classes.kanbanColumnNotOver}`}
        >
            <Flex justify="space-between" align="center" mb="md">
                <Title order={5} ta="center">
                    {column.title}
                </Title>
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
                                  onClick={() => onJobClick(job)}
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
                                    No jobs
                                </Text>
                            </Card>
                        )}
                    </Stack>
                </SortableContext>
            </ScrollArea>
        </Card>
    );
}

export default function JobsList() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [columns, setColumns] = useState<ColumnConfig[]>(loadColumnSettings());
    const [isHistoricalCollapsed, setIsHistoricalCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        const saved = localStorage.getItem('historical_column_collapsed');
        return saved === 'true';
    });
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Configure sensors for drag and drop
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    useEffect(() => {
        setLoading(true);
        getJobs().finally(() => setLoading(false));
    }, []);

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

    async function getJobs() {
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            return;
        }

        try {
            const response = await fetch('/api/projects', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // eslint-disable-next-line no-console
                console.error('Error fetching jobs:', errorData);
                return;
            }

            const data = await response.json();
            const jobsList = data.Items || data || [];
            setJobs(Array.isArray(jobsList) ? jobsList : []);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error fetching jobs:', error);
        }
    }

    // Get jobs for each column
    function getJobsForColumn(columnId: string): Job[] {
        const column = columns.find((col) => col.id === columnId);
        if (!column) return [];

        return jobs
            .filter((job) => {
                // Handle both string and EstimateStatus enum values
                const estimate = job as Estimate;
                const jobStatus = typeof estimate.status === 'string'
                    ? estimate.status
                    : estimate.status;
                return column.statuses.includes(jobStatus as JobStatus);
            })
            .sort((a, b) =>
                // Sort by updated_at (newest first)
                 (
                    new Date((b as Estimate).updated_at).getTime() -
                    new Date((a as Estimate).updated_at).getTime()
                )
            );
    }

    // Handle drag start
    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string);
    }

    // Handle drag end
    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const estimateId = active.id as string;
        const targetColumnId = over.id as string;

        // Find the estimate
        const estimate = jobs.find((j) => j.id === estimateId) as Estimate | undefined;
        if (!estimate) return;

        // Find the target column
        const targetColumn = columns.find((col) => col.id === targetColumnId);
        if (!targetColumn) return;

        // Check if estimate is already in this column
        const currentStatus = String(estimate.status);
        if (targetColumn.statuses.some((status) => String(status) === currentStatus)) {
            return;
        }

        // Update estimate status
        const newStatus = targetColumn.defaultStatus as EstimateStatus;

        // Optimistically update the UI
        setJobs((prevJobs) =>
            prevJobs.map((j) =>
                j.id === estimateId ? { ...j, status: newStatus } : j
            )
        );

        // Update via API
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            // Revert if no token
            setJobs((prevJobs) =>
                prevJobs.map((j) =>
                    j.id === estimateId ? { ...j, status: estimate.status } : j
                )
            );
            return;
        }

        try {
            const response = await fetch(`/api/estimates/${estimateId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus,
                }),
            });

            if (!response.ok) {
                // Revert on error
                setJobs((prevJobs) =>
                    prevJobs.map((j) =>
                        j.id === estimateId
                            ? { ...j, status: estimate.status }
                            : j
                    )
                );
                const errorData = await response.json().catch(() => ({}));
                // eslint-disable-next-line no-console
                console.error('Error updating estimate status:', errorData);
            }
        } catch (error) {
            // Revert on error
            setJobs((prevJobs) =>
                prevJobs.map((j) =>
                    j.id === estimateId ? { ...j, status: estimate.status } : j
                )
            );
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

    if (loading) {
        return <LoadingState />;
    }

    return (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
            <div ref={scrollContainerRef} className={classes.flexWrapper}>
                <Flex
                  direction="row"
                  justify="flex-start"
                  align="flex-start"
                  gap="md"
                  h="100%"
                  className={classes.flexContainer}
                >
                    {columns.map((column) => (
                        <KanbanColumn
                          key={column.id}
                          column={column}
                          jobs={getJobsForColumn(column.id)}
                          onJobClick={handleJobClick}
                          isCollapsed={column.id === 'historical' ? isHistoricalCollapsed : false}
                          onToggleCollapse={column.id === 'historical' ? toggleHistoricalCollapse : undefined}
                          columnRef={column.id === 'historical' ? historicalColumnRef : undefined}
                        />
                    ))}
                </Flex>
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
                            (activeJob as Estimate).client_name ||
                            'Untitled Project'}
                      </Text>
                      <Badge
                        className={classes.badge}
                        color={getEstimateBadgeColor(
                          activeJob.status || EstimateStatus.NEW_LEAD
                        )}
                        size="sm"
                      >
                        {String(activeJob.status || 'UNKNOWN')}
                      </Badge>
                    </Group>

                    {(activeJob as Estimate).estimate_type && (
                      <Text size="xs" c="dimmed" mb="xs">
                        {(activeJob as Estimate).estimate_type}
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
                  </Card>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

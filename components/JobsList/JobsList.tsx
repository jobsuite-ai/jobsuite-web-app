'use client';

import { useEffect, useState } from 'react';

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
    Badge,
    Card,
    Flex,
    Group,
    ScrollArea,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import { useRouter } from 'next/navigation';

import classes from './JobsList.module.css';
import LoadingState from '../Global/LoadingState';
import { Job, JobStatus } from '../Global/model';
import { ColumnConfig, loadColumnSettings } from '../Global/settings';
import { getBadgeColor } from '../Global/utils';

// Sortable job card component
interface SortableJobCardProps {
    job: Job;
    onClick: () => void;
}

function SortableJobCard({ job, onClick }: SortableJobCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: job.id });

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
          mb="md"
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
                    {(job as any).job_name || (job as any).client_name || 'Untitled Job'}
                </Text>
                <Badge
                  className={classes.badge}
                  color={getBadgeColor((job.job_status as any) || JobStatus.NEW_LEAD)}
                  size="sm"
                >
                    {String(job.job_status || 'UNKNOWN')}
                </Badge>
            </Group>

            {job.job_type && (
                <Text size="xs" c="dimmed" mb="xs">
                    {job.job_type}
                </Text>
            )}

            <Stack gap={2}>
                <Text size="xs" c="dimmed" lineClamp={1}>
                    {(job as any).address_street || (job as any).client_address || 'No address'}
                </Text>
                <Text size="xs" c="dimmed">
                    {(job as any).address_city || job.city}, {(job as any).address_state || job.state}{' '}
                    {(job as any).address_zipcode || job.zip_code}
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
}

function KanbanColumn({ column, jobs, onJobClick }: KanbanColumnProps) {
    const jobIds = jobs.map((job) => job.id);
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
    });

    return (
        <Card
          ref={setNodeRef}
          withBorder
          shadow="sm"
          className={`${classes.kanbanColumn} ${isOver ? classes.kanbanColumnOver : classes.kanbanColumnNotOver}`}
        >
            <Title order={4} mb="md" ta="center">
                {column.title}
            </Title>
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
                                  job={job}
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

    async function getJobs() {
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            return;
        }

        try {
            const response = await fetch('/api/jobs', {
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
            // eslint-disable-next-line no-console
            console.log('Fetched jobs:', jobsList);
            // eslint-disable-next-line no-console
            console.log('Job statuses:', jobsList.map((j: Job) => ({ id: j.id, status: j.job_status })));
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
                // Handle both string and JobStatus enum values
                const jobStatus = typeof job.job_status === 'string'
                    ? job.job_status
                    : job.job_status;
                return column.statuses.includes(jobStatus as JobStatus);
            })
            .sort((a, b) =>
                // Sort by updated_at (newest first)
                 (
                    new Date(b.updated_at).getTime() -
                    new Date(a.updated_at).getTime()
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

        const jobId = active.id as string;
        const targetColumnId = over.id as string;

        // Find the job
        const job = jobs.find((j) => j.id === jobId);
        if (!job) return;

        // Find the target column
        const targetColumn = columns.find((col) => col.id === targetColumnId);
        if (!targetColumn) return;

        // Check if job is already in this column
        const currentStatus = String(job.job_status);
        if (targetColumn.statuses.some((status) => String(status) === currentStatus)) {
            return;
        }

        // Update job status
        const newStatus = targetColumn.defaultStatus;

        // Optimistically update the UI
        setJobs((prevJobs) =>
            prevJobs.map((j) =>
                j.id === jobId ? { ...j, job_status: newStatus } : j
            )
        );

        // Update via API
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            // Revert if no token
            setJobs((prevJobs) =>
                prevJobs.map((j) =>
                    j.id === jobId ? { ...j, job_status: job.job_status } : j
                )
            );
            return;
        }

        try {
            const response = await fetch(`/api/jobs/${jobId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    job_status: newStatus,
                }),
            });

            if (!response.ok) {
                // Revert on error
                setJobs((prevJobs) =>
                    prevJobs.map((j) =>
                        j.id === jobId
                            ? { ...j, job_status: job.job_status }
                            : j
                    )
                );
                const errorData = await response.json().catch(() => ({}));
                // eslint-disable-next-line no-console
                console.error('Error updating job status:', errorData);
            }
        } catch (error) {
            // Revert on error
            setJobs((prevJobs) =>
                prevJobs.map((j) =>
                    j.id === jobId ? { ...j, job_status: job.job_status } : j
                )
            );
            // eslint-disable-next-line no-console
            console.error('Error updating job status:', error);
        }
    }

    function handleJobClick(job: Job, event?: React.MouseEvent) {
        if (event?.metaKey || event?.ctrlKey) {
              window.open(`/jobs/${job.id}`, '_blank');
            } else {
              router.push(`/jobs/${job.id}`);
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
            <div className={classes.flexWrapper}>
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
                        {(activeJob as any).job_name ||
                            (activeJob as any).client_name ||
                            'Untitled Job'}
                      </Text>
                      <Badge
                        className={classes.badge}
                        color={getBadgeColor(
                          (activeJob.job_status as any) || JobStatus.NEW_LEAD
                        )}
                        size="sm"
                      >
                        {String(activeJob.job_status || 'UNKNOWN')}
                      </Badge>
                    </Group>

                    {activeJob.job_type && (
                      <Text size="xs" c="dimmed" mb="xs">
                        {activeJob.job_type}
                      </Text>
                    )}

                    <Stack gap={2}>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {(activeJob as any).address_street ||
                            (activeJob as any).client_address ||
                            'No address'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {(activeJob as any).address_city || activeJob.city},{' '}
                        {(activeJob as any).address_state || activeJob.state}{' '}
                        {(activeJob as any).address_zipcode || activeJob.zip_code}
                      </Text>
                    </Stack>
                  </Card>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

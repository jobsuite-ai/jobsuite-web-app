'use client';

import { useEffect, useState } from 'react';

import { Flex, Text, Card, Group, Badge, Center } from '@mantine/core';
import { useRouter } from 'next/navigation';

import classes from './JobsList.module.css';
import LoadingState from '../Global/LoadingState';
import { Job, JobStatus } from '../Global/model';
import { getBadgeColor, getFormattedStatus } from '../Global/utils';

// Archive column statuses
const ARCHIVE_STATUSES = [
    JobStatus.ESTIMATE_DECLINED,
    JobStatus.ARCHIVED,
    JobStatus.STALE_ESTIMATE,
];

export default function ArchivedJobsList() {
    const [jobs, setJobs] = useState(new Array<Job>());
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        getJobs().finally(() => setLoading(false));
    }, []);

    async function getJobs() {
        const response = await fetch(
            `/api/jobs/by-status?status=${ARCHIVE_STATUSES.join('&status=')}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const { Items }: { Items: Job[] } = await response.json();
        // Sort by status order first, then by updated_at (newest first) within each status
        const archivedJobs = Items.sort((a, b) => {
            // First sort by status order
            const statusOrder = ARCHIVE_STATUSES.indexOf(a.job_status) -
                ARCHIVE_STATUSES.indexOf(b.job_status);
            if (statusOrder !== 0) return statusOrder;
            // Then sort by updated_at within each status
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
        setJobs(archivedJobs);
    }

    // Helper function to render a job card
    const renderJobCard = (job: Job) => (
        <Card
          key={job.id}
          shadow="sm"
          padding="lg"
          radius="md"
          w="100%"
          withBorder
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
                if (e.metaKey || e.ctrlKey) {
                    // Open in new tab
                    window.open(`/jobs/${job.id}`, '_blank');
                } else {
                    // Normal navigation
                    router.push(`/jobs/${job.id}`);
                }
            }}
        >
            <Center>
                {job.job_type &&
                    <Text size="sm" fw={700}>{job.job_type}</Text>
                }
            </Center>
            <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>{job.client_name}</Text>
                <Badge style={{ color: '#ffffff' }} color={getBadgeColor(job.job_status)}>
                    {getFormattedStatus(job.job_status)}
                </Badge>
            </Group>

            <Flex direction="column" align="flex-start">
                <Text size="sm" c="dimmed">{job.client_address}</Text>
                <Text size="sm" c="dimmed">{job.city}, {job.state}</Text>
                <Text size="sm" c="dimmed">{job.zip_code}</Text>
            </Flex>
        </Card>
    );

    return (
        <>
            {loading ? <LoadingState /> :
                <div className={classes.flexWrapper}>
                    <Flex direction="column" w="95%" mt="lg">
                        <Text fw={700} size="lg">Archived Jobs</Text>

                        <Flex
                          direction="column"
                          mb="lg"
                          gap="md"
                          justify="flex-start"
                          align="center"
                          w="100%"
                          mt="md"
                        >
                            {jobs.length > 0 ? (
                                jobs.map(renderJobCard)
                            ) : (
                                <Card
                                  shadow="sm"
                                  padding="lg"
                                  radius="md"
                                  w="100%"
                                  withBorder
                                >
                                    <Text fw={500} ta="center">No archived jobs</Text>
                                </Card>
                            )}
                        </Flex>
                    </Flex>
                </div>
            }
        </>
    );
}

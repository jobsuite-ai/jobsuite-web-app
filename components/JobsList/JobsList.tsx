'use client';

import { useEffect, useState } from 'react';

import { Badge, Card, Center, Flex, Group, Text, Button, Collapse } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import classes from './JobsList.module.css';
import LoadingState from '../Global/LoadingState';
import { Job, JobStatus } from '../Global/model';
import UniversalError from '../Global/UniversalError';
import { getBadgeColor, getFormattedStatus } from '../Global/utils';

// Define column status groups and their order
const COLUMN_ONE_STATUSES = [
  JobStatus.NEW_LEAD,
  JobStatus.ESTIMATE_NOT_SCHEDULED,
  JobStatus.ESTIMATE_SCHEDULED,
  JobStatus.ESTIMATE_IN_PROGRESS,
];

const COLUMN_TWO_STATUSES = [
  JobStatus.NEEDS_FOLLOW_UP,
  JobStatus.RLPP_OPENED,
  JobStatus.RLPP_DECLINED,
  JobStatus.ESTIMATE_SENT,
  JobStatus.ESTIMATE_OPENED,
  JobStatus.ESTIMATE_ACCEPTED,
];

// Archive column statuses
const ARCHIVE_STATUSES = [
  JobStatus.ESTIMATE_DECLINED,
  JobStatus.RLPP_SIGNED,
  JobStatus.JOB_COMPLETE,
  JobStatus.ARCHIVED,
];

export default function JobsList() {
    const [jobs, setJobs] = useState(new Array<Job>());
    const [columnOneJobs, setColumnOneJobs] = useState(new Array<Job>());
    const [columnTwoJobs, setColumnTwoJobs] = useState(new Array<Job>());
    const [archiveJobs, setArchiveJobs] = useState(new Array<Job>());
    const [archiveExpanded, setArchiveExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        getJobs().finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        // Sort jobs into columns based on status
        const sortedColumnOne = jobs
            .filter(job => COLUMN_ONE_STATUSES.includes(job.job_status))
            .sort((a, b) =>
                COLUMN_ONE_STATUSES.indexOf(a.job_status) -
                COLUMN_ONE_STATUSES.indexOf(b.job_status));

        const sortedColumnTwo = jobs
            .filter(job => COLUMN_TWO_STATUSES.includes(job.job_status))
            .sort((a, b) =>
                COLUMN_TWO_STATUSES.indexOf(a.job_status) -
                COLUMN_TWO_STATUSES.indexOf(b.job_status));

        const sortedArchive = jobs
            .filter(job => ARCHIVE_STATUSES.includes(job.job_status))
            .sort((a, b) =>
                ARCHIVE_STATUSES.indexOf(a.job_status) -
                ARCHIVE_STATUSES.indexOf(b.job_status));

        setColumnOneJobs(sortedColumnOne);
        setColumnTwoJobs(sortedColumnTwo);
        setArchiveJobs(sortedArchive);
    }, [jobs]);

    async function getJobs() {
        const response = await fetch(
            '/api/jobs',
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const { Items }: { Items: Job[] } = await response.json();
        setJobs(Items);
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
          onClick={() => router.push(`/jobs/${job.id}`)}
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

    // Helper function to render a column
    const renderColumn = (columnJobs: Job[], title: string) => (
        <Flex
          direction="column"
          mb="lg"
          gap="md"
          justify="flex-start"
          align="center"
          w="48%"
        >
            <Text fw={700} size="lg">{title}</Text>
            {columnJobs.length > 0 ? (
                columnJobs.map(renderJobCard)
            ) : (
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  w="100%"
                  withBorder
                >
                    <Text fw={500} ta="center">No jobs in this category</Text>
                </Card>
            )}
        </Flex>
    );

    return (
        <>
            {loading ? <LoadingState /> :
                <div className={classes.flexWrapper}>
                    {jobs ? (
                        <>
                            <Flex
                              direction="row"
                              justify="space-between"
                              align="flex-start"
                              w="95%"
                              gap="md"
                              mt="lg"
                            >
                                {renderColumn(columnOneJobs, 'New & Scheduled')}
                                {renderColumn(columnTwoJobs, 'In Progress')}
                            </Flex>

                            {/* Archive section */}
                            <Flex
                              direction="column"
                              w="95%"
                              mt="md"
                            >
                                <Button
                                  variant="subtle"
                                  onClick={() => setArchiveExpanded(!archiveExpanded)}
                                  rightSection={archiveExpanded ?
                                    <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                                  style={{ alignSelf: 'center' }}
                                >
                                    {archiveExpanded ? 'Hide Completed & Archived Jobs' : 'Show Completed & Archived Jobs'}
                                    {!archiveExpanded && archiveJobs.length > 0 && ` (${archiveJobs.length})`}
                                </Button>

                                <Collapse in={archiveExpanded}>
                                    <Flex
                                      direction="column"
                                      mb="lg"
                                      gap="md"
                                      justify="flex-start"
                                      align="center"
                                      w="100%"
                                      mt="md"
                                    >
                                        {archiveJobs.length > 0 ? (
                                            archiveJobs.map(renderJobCard)
                                        ) : (
                                            <Card
                                              shadow="sm"
                                              padding="lg"
                                              radius="md"
                                              w="100%"
                                              withBorder
                                            >
                                                <Text fw={500} ta="center">No completed or archived jobs</Text>
                                            </Card>
                                        )}
                                    </Flex>
                                </Collapse>
                            </Flex>
                        </>
                    ) : (
                        <div style={{ marginTop: '100px' }}>
                            <UniversalError message="Unable to access list of jobs" />
                        </div>
                    )}
                </div>}
        </>
    );
}

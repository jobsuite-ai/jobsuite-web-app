'use client';

import { useEffect, useState } from 'react';

import { Badge, Card, Center, Flex, Group, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';

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
  JobStatus.ESTIMATE_ACCEPTED,
  JobStatus.RLPP_DECLINED,
  JobStatus.ESTIMATE_SENT,
  JobStatus.ESTIMATE_OPENED,
];

export default function EstimatesList() {
    const [jobs, setJobs] = useState(new Array<Job>());
    const [columnOneJobs, setColumnOneJobs] = useState(new Array<Job>());
    const [columnTwoJobs, setColumnTwoJobs] = useState(new Array<Job>());
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
            .sort((a, b) => {
                // First sort by status order
                const statusDiff = COLUMN_ONE_STATUSES.indexOf(a.job_status) -
                    COLUMN_ONE_STATUSES.indexOf(b.job_status);
                if (statusDiff !== 0) return statusDiff;
                // Then sort by updated_at (newest first) within each status
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });

        const sortedColumnTwo = jobs
            .filter(job => COLUMN_TWO_STATUSES.includes(job.job_status))
            .sort((a, b) => {
                // First sort by status order
                const statusDiff = COLUMN_TWO_STATUSES.indexOf(a.job_status) -
                    COLUMN_TWO_STATUSES.indexOf(b.job_status);
                if (statusDiff !== 0) return statusDiff;
                // Then sort by updated_at (newest first) within each status
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });

        setColumnOneJobs(sortedColumnOne);
        setColumnTwoJobs(sortedColumnTwo);
    }, [jobs]);

    async function getJobs() {
        // Get access token from localStorage
        const accessToken = localStorage.getItem('access_token');

        if (!accessToken) {
            return;
        }

        // Fetch all estimates (backend will filter if needed, but we filter client-side)
        const response = await fetch('/api/estimates', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return;
        }

        const { Items } = await response.json();
        setJobs(Items || []);
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
                <div>
                    {jobs ? (
                        <Flex
                          direction="row"
                          justify="space-between"
                          align="flex-start"
                          w="95%"
                          gap="md"
                          mt="lg"
                        >
                            {renderColumn(columnOneJobs, 'Estimate Pipeline')}
                            {renderColumn(columnTwoJobs, 'Estimate Follow-up')}
                        </Flex>
                    ) : (
                        <div style={{ marginTop: '100px' }}>
                            <UniversalError message="Unable to access list of jobs" />
                        </div>
                    )}
                </div>}
        </>
    );
}

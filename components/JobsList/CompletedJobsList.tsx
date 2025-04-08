'use client';

import { useEffect, useState } from 'react';

import { Flex, Text, Card, Group, Badge, Center } from '@mantine/core';
import { useRouter } from 'next/navigation';

import classes from './JobsList.module.css';
import LoadingState from '../Global/LoadingState';
import { Job, JobStatus } from '../Global/model';
import { getBadgeColor, getFormattedStatus } from '../Global/utils';

export default function CompletedJobsList() {
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
            .filter(job => job.job_status === JobStatus.RLPP_SIGNED)
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        const sortedColumnTwo = jobs
            .filter(job => job.job_status === JobStatus.JOB_COMPLETE)
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        setColumnOneJobs(sortedColumnOne);
        setColumnTwoJobs(sortedColumnTwo);
    }, [jobs]);

    async function getJobs() {
        const response = await fetch(
            `/api/jobs/by-status?status=${JobStatus.RLPP_SIGNED}&status=${JobStatus.JOB_COMPLETE}`,
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
                <div className={classes.flexWrapper}>
                    <Flex direction="column" w="95%" mt="lg">
                        <Flex
                          direction="row"
                          justify="space-between"
                          align="flex-start"
                          w="100%"
                          gap="md"
                          mt="md"
                        >
                            {renderColumn(columnOneJobs, 'Estimate Accepted')}
                            {renderColumn(columnTwoJobs, 'Job Complete')}
                        </Flex>
                    </Flex>
                </div>
            }
        </>
    );
}

"use client";

import { ActionIcon, Badge, Card, Center, Flex, Group, Menu, rem, Text, Tooltip } from "@mantine/core";
import { useEffect, useState } from "react";
import { Job, JobStatus } from "../Global/model";
import { useRouter } from "next/navigation";
import { getBadgeColor, getFormattedStatus } from "../Global/utils";
import UniversalError from "../Global/UniversalError";
import LoadingState from "../Global/LoadingState";
import { IconFilter, IconFilterOff } from "@tabler/icons-react";
import classes from './JobsList.module.css';

export default function JobsList() {
    const [jobs, setJobs] = useState(new Array<Job>());
    const [filteredJobs, setFilteredJobs] = useState<Job[]>();
    const [loading, setLoading] = useState(true);
    const [clearFilterClicked, setClearFilterClicked] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        getJobs().finally(() => setLoading(false));
    }, []);

    async function getJobs() {
        const response = await fetch(
            '/api/jobs',
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        )

        const { Items }: { Items: Job[] } = await response.json();

        setJobs(Items);
        setFilteredJobs(Items.filter((job) => job.job_status !== JobStatus.ESTIMATE_DECLINED));
    }

    const filterData = (status: JobStatus) => {
        setFilteredJobs(jobs.filter((job) => job.job_status == status));
    }

    return (
        <>
            {loading ? <LoadingState /> :
                <div className={classes.flexWrapper}>
                    {jobs ? (
                        <>
                            <Flex direction='row' justify='space-between' align='center' w='85%'>
                                <h1>Jobs List</h1>

                                <Group>
                                    {filteredJobs ?
                                        <Tooltip
                                            label={
                                                clearFilterClicked ? "Clear job status filter" 
                                                : " Clear filter - \'Estimate declined\' is filtered out by default"
                                            }
                                            transitionProps={{ transition: 'scale-y', duration: 500 }}
                                            withArrow
                                        >
                                            <ActionIcon
                                                variant='transparent'
                                                pb='2px'
                                                onClick={() => {
                                                    setFilteredJobs(undefined);
                                                    setClearFilterClicked(true);
                                                }}
                                            >
                                                <IconFilterOff color="#555555" size={30} />
                                            </ActionIcon>
                                        </Tooltip>
                                        :
                                        <Menu shadow="md" width={200}>
                                            <Menu.Target>
                                                <Tooltip
                                                    label="Filter list by job status"
                                                    transitionProps={{ transition: 'scale-y', duration: 500 }}
                                                    withArrow
                                                >
                                                    <ActionIcon variant='transparent' pb='2px'>
                                                        <IconFilter color="#555555" size={30} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Menu.Target>

                                            <Menu.Dropdown>
                                                <Menu.Label>Status</Menu.Label>
                                                {Object.values(JobStatus).map((status) => (
                                                    <Menu.Item onClick={() => filterData(status)} key={status}>
                                                        {getFormattedStatus(status)}
                                                    </Menu.Item>
                                                ))}
                                            </Menu.Dropdown>
                                        </Menu>
                                    }
                                </Group>
                            </Flex>
                            <Flex direction='column' mb='lg' gap='md' justify='center' align='center' w='100%'>
                                {(filteredJobs || jobs).map((job) => (
                                    <Card
                                        key={job.id}
                                        shadow="sm"
                                        padding="lg"
                                        radius="md"
                                        w='85%'
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

                                        <Flex direction='row' justify='space-between' gap="lg" mt="md" mb="xs">
                                            <Flex direction='column'>
                                                <Text size="sm" c="dimmed">{job.client_email}</Text>
                                                <Text size="sm" c="dimmed">Client Phone: {job.client_phone_number}</Text>
                                                {job.estimate_date &&
                                                    <Text size="sm" c="dimmed">Estimate date: {job.estimate_date.split('T')[0]}</Text>
                                                }
                                            </Flex>
                                            <Flex direction='column' align='flex-end'>
                                                <Text size="sm" c="dimmed">{job.client_address}</Text>
                                                <Text size="sm" c="dimmed">{job.city}, {job.state}</Text>
                                                <Text size="sm" c="dimmed">{job.zip_code}</Text>
                                            </Flex>
                                        </Flex>
                                    </Card>
                                ))}
                            </Flex>
                        </>
                    ) : (
                        <div style={{ marginTop: '100px' }} >
                            <UniversalError message='Unable to access list of jobs' />
                        </div>
                    )}
                </div>}
        </>
    );
}
"use client";

import { ActionIcon, Badge, Card, Flex, Group, Menu, rem, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { Job, JobStatus } from "../Global/model";
import { useRouter } from "next/navigation";
import { getBadgeColor, getFormattedStatus } from "../Global/utils";
import UniversalError from "../Global/UniversalError";
import LoadingState from "../Global/LoadingState";
import { IconFilter, IconFilterOff } from "@tabler/icons-react";

export default function JobsList() {
    const [jobs, setJobs] = useState(new Array<Job>());
    const [filteredJobs, setFilteredJobs] = useState<Job[]>();
    const [loading, setLoading] = useState(true);
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
    }

    const filterData = (status: JobStatus) => {
        setFilteredJobs(jobs.filter((job) => job.job_status == status));
    }

    return (
        <>
            {loading ? <LoadingState /> :
                <Flex w='930px' justify='center' direction='column' gap='lg' style={{ justifySelf: 'center' }}>
                    {jobs ? (
                        <>
                            <Flex direction='row' justify='space-between' align='center'>
                                <h1>Jobs List</h1>

                                <Group>
                                    {filteredJobs ?
                                        <ActionIcon
                                            variant='transparent'
                                            pb='2px'
                                            onClick={() => setFilteredJobs(undefined)}
                                        >
                                            <IconFilterOff color="#555555" size={30} />
                                        </ActionIcon>
                                        :
                                        <Menu shadow="md" width={200}>
                                            <Menu.Target>
                                                <ActionIcon variant='transparent' pb='2px'>
                                                    <IconFilter color="#555555" size={30} />
                                                </ActionIcon>
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
                            {(filteredJobs || jobs).map((job) => (
                                <Card
                                    key={job.id}
                                    shadow="sm"
                                    padding="lg"
                                    radius="md"
                                    withBorder
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => router.push(`/jobs/${job.id}`)}
                                >
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
                                            <Text size="sm" c="dimmed">Estimate date: {job.estimate_date.split('T')[0]}</Text>
                                        </Flex>
                                        <Flex direction='column' align='flex-end'>
                                            <Text size="sm" c="dimmed">{job.client_address}</Text>
                                            <Text size="sm" c="dimmed">{job.city}, {job.state}</Text>
                                            <Text size="sm" c="dimmed">{job.zip_code}</Text>
                                        </Flex>
                                    </Flex>
                                </Card>
                            ))}
                        </>
                    ) : (
                        <div style={{ marginTop: '100px' }} >
                            <UniversalError message='Unable to access list of jobs' />
                        </div>
                    )}
                </Flex>}
        </>
    );
}
"use client";

import { ActionIcon, Badge, Card, Center, Checkbox, Flex, Group, Menu, rem, Text, Tooltip } from "@mantine/core";
import { useEffect, useState } from "react";
import { Job, JobStatus } from "../Global/model";
import { useRouter } from "next/navigation";
import { getBadgeColor, getFormattedStatus } from "../Global/utils";
import UniversalError from "../Global/UniversalError";
import LoadingState from "../Global/LoadingState";
import { IconArchive, IconFilter, IconSelect, IconX } from "@tabler/icons-react";
import classes from './JobsList.module.css';
import updateJobStatus from "../Global/updateJobStatus";

const FILTER_STATUSES = [
    JobStatus.ESTIMATE_ACCEPTED,
    JobStatus.ESTIMATE_NOT_SCHEDULED,
    JobStatus.ESTIMATE_OPENED,
    JobStatus.ESTIMATE_SENT,
    JobStatus.PENDING_ESTIMATE,
    JobStatus.RLPP_DECLINED,
    JobStatus.RLPP_OPENED,
    JobStatus.RLPP_SIGNED,
    JobStatus.ESTIMATE_DECLINED,
];

export default function JobsList() {
    const [checkedStatusMap, setCheckedStatusMap] = useState<Record<JobStatus, boolean>>(
        Object.values(FILTER_STATUSES).reduce(
          (acc, status) => ({ ...acc, [status.valueOf()]: JobStatus.ESTIMATE_DECLINED === status ? false : true}),
          {} as Record<JobStatus, boolean>
        )
    );
    const [jobs, setJobs] = useState(new Array<Job>());
    const [filteredJobs, setFilteredJobs] = useState(new Array<Job>());
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        getJobs().finally(() => setLoading(false));
    }, []);

    useEffect(() => setFilteredJobs(jobs.filter((job) => checkedStatusMap[job.job_status])), [checkedStatusMap]);
  
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
        setFilteredJobs(Items.filter((job) => checkedStatusMap[job.job_status]));
    }

    const toggleFilter = (status: JobStatus) => {
        setCheckedStatusMap((prev) => ({ ...prev, [status]: !prev[status] }));
    };

    const clearAll = () => {
        setCheckedStatusMap(Object.values(FILTER_STATUSES).reduce(
            (acc, status) => ({ ...acc, [status.valueOf()]: false}),
            {} as Record<JobStatus, boolean>
        ));
    }

    const selectAll = () => {
        setCheckedStatusMap(Object.values(FILTER_STATUSES).reduce(
            (acc, status) => ({ ...acc, [status.valueOf()]: true}),
            {} as Record<JobStatus, boolean>
        ));
    }

    const archiveJob = (jobID: string) => {
        updateJobStatus(JobStatus.ARCHIVED, jobID);
        filteredJobs && setFilteredJobs(filteredJobs.filter((job) => job.id !== jobID));
    }

    return (
        <>
            {loading ? <LoadingState /> :
                <div className={classes.flexWrapper}>
                    {filteredJobs ? (
                        <>
                            <Flex direction='row' justify='space-between' align='center' w='85%'>
                                <h1>Jobs List</h1>

                                <Group>
                                    <Menu shadow="md" width={250} closeOnItemClick={false}>
                                        <Menu.Target>
                                            <Tooltip
                                                label="Filter list by job status"
                                                transitionProps={{ transition: 'scale-y', duration: 500 }}
                                                withArrow
                                            >
                                                <ActionIcon variant='transparent' pb='2px'>
                                                    <IconFilter color="#000000" size={30} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            <Menu.Label>Status</Menu.Label>
                                            <div style={{ position: 'relative' }} key='tooltip'>
                                                <Tooltip
                                                    label={'Clear all'}
                                                    position="top"
                                                    withArrow
                                                >
                                                    <IconX
                                                        color="#858E96"
                                                        onClick={() => clearAll()}
                                                        className={classes.clearAllIcon}
                                                    />
                                                </Tooltip>
                                                <Tooltip
                                                    label={'Select all'}
                                                    position="top"
                                                    withArrow
                                                >
                                                    <IconSelect
                                                        color="#858E96"
                                                        onClick={() => selectAll()}
                                                        className={classes.selectAllIcon}
                                                    />
                                                </Tooltip>
                                            </div>
                                            {FILTER_STATUSES.map((status) => (
                                                <Menu.Item 
                                                    key={status} 
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Checkbox
                                                        style={{ cursor: 'pointer' }}
                                                        label={getFormattedStatus(status)}
                                                        checked={checkedStatusMap[status]}
                                                        onChange={(event) => toggleFilter(status)}
                                                    />
                                                </Menu.Item>
                                            ))}
                                        </Menu.Dropdown>
                                    </Menu>
                                </Group>
                            </Flex>
                            {filteredJobs.length ?
                                <Flex direction='column' mb='lg' gap='md' justify='center' align='center' w='100%'>
                                    {filteredJobs.map((job) => (
                                        <>
                                            <div style={{ position: 'relative' }} key='tooltip'>
                                                <Tooltip
                                                    label={'Archive Job'}
                                                    position="top"
                                                    withArrow
                                                >
                                                    <IconArchive
                                                        onClick={() => archiveJob(job.id)}
                                                        className={classes.archiveIcon}
                                                    />
                                                </Tooltip>
                                            </div>
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

                                                <Flex direction='column' align='flex-start'>
                                                    <Text size="sm" c="dimmed">{job.client_address}</Text>
                                                    <Text size="sm" c="dimmed">{job.city}, {job.state}</Text>
                                                    <Text size="sm" c="dimmed">{job.zip_code}</Text>
                                                </Flex>
                                            </Card>
                                        </>
                                    ))}
                                </Flex>
                                :
                                <Flex direction='column' mb='lg' gap='md' justify='center' align='center' w='100%'>
                                    <Card
                                        key='no-jobs'
                                        shadow="sm"
                                        padding="lg"
                                        radius="md"
                                        w='85%'
                                        withBorder
                                    >
                                        <Group justify="space-between" mt="md" mb="xs">
                                            <Text fw={500}>0 Jobs</Text>
                                            <Badge style={{ color: '#ffffff' }}>
                                                No jobs in filtered list
                                            </Badge>
                                        </Group>
                                    </Card>
                                </Flex>
                            }
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
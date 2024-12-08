"use client";

import { ActionIcon, Badge, Card, Flex, Menu, Text } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { JobStatus, SingleJob } from '../Global/model';
import updateJobStatus from '../Global/updateJobStatus';
import { getBadgeColor, getFormattedStatus } from "../Global/utils";
import { useState } from 'react';

export default function ClientDetails({ job }: { job: SingleJob }) {
    const [jobStatus, setJobStateStatus] = useState(job.job_status.S);

    const setJobStatus = (status: JobStatus) => {
        updateJobStatus(status, job.id.S)
        setJobStateStatus(status);
    }

    return (
        <Card
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            style={{ height: '99%' }}
        >
            <Flex direction='column' gap="lg">
                <Text fw={500}>{job.client_name.S}</Text>
                <Flex direction='row' gap={5}>
                    <Badge style={{ color: '#ffffff' }} color={getBadgeColor(jobStatus)} mr='10px'>
                        {getFormattedStatus(jobStatus)}
                    </Badge>
                    {[JobStatus.ESTIMATE_ACCEPTED, JobStatus.IN_PROGRESS, JobStatus.COMPLETED].includes(jobStatus) && 
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <ActionIcon size={20} variant='transparent'  pb='2px'>
                                    <IconPencil/>
                                </ActionIcon>
                            </Menu.Target>

                            <Menu.Dropdown>
                                <Menu.Item onClick={() => setJobStatus(JobStatus.IN_PROGRESS)}>
                                    Mark Job In Progress
                                </Menu.Item>
                                <Menu.Item onClick={() => setJobStatus(JobStatus.COMPLETED)}>
                                    Mark Job Complete
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    }
                </Flex>
            </Flex>
            <Flex direction='column' gap="lg" mt="md" mb="xs">
                <Flex direction='column'>
                    <Text size="sm" c="dimmed">{job.client_email.S}</Text>
                    <Text size="sm" c="dimmed">Client Phone: {job.client_phone_number.S}</Text>
                    <Text size="sm" c="dimmed">Estimate date: {job.estimate_date.S.split('T')[0]}</Text>
                </Flex>
                <Flex direction='column'>
                    <Text size="sm" c="dimmed">{job.client_address.S}</Text>
                    <Text size="sm" c="dimmed">{job.city.S}, {job.state.S}</Text>
                    <Text size="sm" c="dimmed">{job.zip_code.S}</Text>
                </Flex>
            </Flex>
        </Card>
    );
}

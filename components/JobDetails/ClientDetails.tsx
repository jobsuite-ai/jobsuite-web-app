"use client";

import { Badge, Card, Flex, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { SingleJob } from '../Global/model';
import { getBadgeColor, getFormattedStatus } from "../Global/utils";

export default function ClientDetails({ job }: { job: SingleJob }) {
    const router = useRouter();

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
                <Badge color={getBadgeColor(job.job_status.S)}>{getFormattedStatus(job.job_status.S)}</Badge>
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

"use client";

import { Badge, Card, Flex, Group, rem, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { Job } from "../Global/model";
import { useRouter } from "next/navigation";
import { getBadgeColor, getFormattedStatus } from "../Global/utils";
import UniversalError from "../Global/UniversalError";
import LoadingState from "../Global/LoadingState";

export default function JobsList() {
    const [jobs, setJobs] = useState(new Array<Job>());
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
        console.log(Items);
    }

    return (
        <>
            {loading ? <LoadingState /> : 
        <div>
            {jobs ? (
                <>
                    <h1>Jobs List</h1>
                    {jobs.map((job) => (
                        <Card
                            key={job.id}
                            shadow="sm"
                            padding="lg"
                            radius="md"
                            withBorder
                            style={{ marginTop: rem(20), marginBottom: rem(20), cursor: 'pointer' }}
                            onClick={() => router.push(`/jobs/${job.id}`)}
                        >
                            <Group justify="space-between" mt="md" mb="xs">
                                <Text fw={500}>{job.client_name}</Text>
                                <Badge color={getBadgeColor(job.status)}>{getFormattedStatus(job.status)}</Badge>
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
        </div>
}
</>
    );
}
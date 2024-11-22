"use client";

import { Badge, Button, Card, Group, rem, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { Job } from "../Global/job";
import { useRouter } from "next/navigation";

export default function JobsList() {
    const [jobs, setJobs] = useState(new Array<Job>());
    const router = useRouter();

    useEffect(() => {
        getJobs();
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

        const { Items }: {Items: Job[]} = await response.json();
        setJobs(Items);
        console.log(Items);
    }

    return (
        <div>
            {jobs.map((job) => (
                <Card
                    key={job.id}
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    withBorder
                    style={{ marginTop: rem(20), marginBottom: rem(20) }}
                    onClick={() => router.push(`/jobs/${job.id}`)}
                >
                    <Group justify="space-between" mt="md" mb="xs">
                        <Text fw={500}>{job.client_name}</Text>
                        <Badge color="pink">{job.status}</Badge>
                    </Group>

                    <Text size="sm" c="dimmed">{job.client_email}</Text>
                    <Text size="sm" c="dimmed">{job.client_address}</Text>
                    <Text size="sm" c="dimmed">Client Phone: {job.client_phone_number}</Text>
                    <Text size="sm" c="dimmed">Estimate date: {job.estimate_date.split('T')[0]}</Text>
                </Card>
            ))}
        </div>
    );
}
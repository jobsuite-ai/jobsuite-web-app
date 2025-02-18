"use client";

import { UpdateClientDetailsInput, UpdateJobContent } from '@/app/api/jobs/jobTypes';
import { Badge, Button, Card, Center, Flex, Modal, Text, TextInput } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { useForm } from '@mantine/form';
import { IconEdit } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoadingState from '../Global/LoadingState';
import { DynamoClient, SingleJob } from '../Global/model';
import { getBadgeColor, getFormattedStatus } from "../Global/utils";

export default function ClientDetails({ initialJob }: { initialJob: SingleJob }) {
    const [job, setJob] = useState(initialJob);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [client, setClient] = useState<DynamoClient>();
    const router = useRouter();

    useEffect(() => {
        const loadClientDetails = async () => {
            const response = await fetch(
                `/api/clients/${job.client_id.S}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            )
    
            const { Item } = await response.json();
            setClient(Item);
        }
        if (!client) {
            loadClientDetails();
        }
    }, [client]);

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            client_address: job.client_address.S,
            city: job.city.S,
            zip_code: job.zip_code.S,
        },
        validate: (values) => {
            return {
                client_address: values.client_address === '' ? 'Must enter client address' : null,
                zip_code: values.zip_code === '' ? 'Must enter zip code' : null,
                city: values.city === '' ? 'Must enter city' : null,
            }
        },
    });

    const updateJob = async () => {
        const formValues = form.getValues();

        const updateJobContent: UpdateClientDetailsInput = {
            city: formValues.city,
            zip_code: formValues.zip_code,
            client_address: formValues.client_address,
        }

        const content: UpdateJobContent = {
            update_client_details: updateJobContent
        }

        const response = await fetch(
            '/api/jobs',
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: content, jobID: job.id.S }),
            }
        )

        await response.json();

        setJob(prevJob => ({
            ...prevJob,
            city: { S: formValues.city },
            zip_code: { S: formValues.zip_code },
            client_address: { S: formValues.client_address }
        }));
        setIsModalOpen(false);
    };

    return (
        <>
            {client ?
                <Card
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    withBorder
                >
                    <div style={{ position: 'relative' }}>
                        <IconEdit
                            onClick={() => setIsModalOpen(true)}
                            style={{ cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }}
                        />
                    </div>
                    <Flex direction='column' gap="lg">
                        <Text 
                            fw={500}
                            style={{ cursor: 'pointer' }}
                            onClick={() => router.push(`/clients/${job.client_id.S}`)}
                        >
                            {job.client_name.S}
                        </Text>
                        <Flex direction='row' gap={5}>
                            <Badge style={{ color: '#ffffff' }} color={getBadgeColor(job.job_status.S)} mr='10px'>
                                {getFormattedStatus(job.job_status.S)}
                            </Badge>
                        </Flex>
                    </Flex>
                    <Flex direction='column' gap="lg" mt="md" mb="xs">
                        <Flex direction='column'>
                            <Text size="sm" c="dimmed">{client.email.S}</Text>
                            <Text size="sm" c="dimmed">Client Phone: {client.phone_number.S}</Text>
                        </Flex>
                        <Flex direction='column'>
                            <Text size="sm" c="dimmed">{job.client_address.S}</Text>
                            <Text size="sm" c="dimmed">{job.city.S}, {job.state.S}</Text>
                            <Text size="sm" c="dimmed">{job.zip_code.S}</Text>
                        </Flex>
                    </Flex>
                </Card> : <LoadingState />
            }
            {isModalOpen &&
                <Modal
                    opened={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={<Text fz={24} fw={700}>Update Client Details</Text>}
                    size="lg"
                >
                    <Text fz={12} c='dimmed'>
                        To update client contact information, please go to the client tab
                    </Text>
                    <div style={{ marginTop: '10px' }}>
                        <TextInput
                            withAsterisk
                            label="Address"
                            placeholder="Client address"
                            key={form.key('client_address')}
                            {...form.getInputProps('client_address')}
                        />
                        <TextInput
                            withAsterisk
                            label="City"
                            placeholder="City"
                            key={form.key('city')}
                            {...form.getInputProps('city')}
                        />
                        <TextInput
                            withAsterisk
                            label="Zip Code"
                            placeholder="Zip Code"
                            key={form.key('zip_code')}
                            {...form.getInputProps('zip_code')}
                        />

                        <Center mt="md">
                            <Button type="submit" onClick={updateJob}>Update Client Details</Button>
                        </Center>
                    </div>
                </Modal>
            }
        </>
    );
}

'use client';

import { useEffect, useState } from 'react';

import { Badge, Button, Card, Center, Flex, Menu, Modal, Text, TextInput } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { useForm } from '@mantine/form';
import { IconChevronDown, IconEdit } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import LoadingState from '../Global/LoadingState';
import { DropdownJobStatus, DynamoClient, JobStatus, SingleJob } from '../Global/model';
import { getBadgeColor, getFormattedStatus } from '../Global/utils';

import { UpdateClientDetailsInput, UpdateJobContent } from '@/app/api/jobs/jobTypes';
import { logToCloudWatch } from '@/public/logger';

export default function ClientDetails({ initialJob }: { initialJob: SingleJob }) {
    const [job, setJob] = useState(initialJob);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [client, setClient] = useState<DynamoClient>();
    const [menuOpened, setMenuOpened] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const loadClientDetails = async () => {
            const response = await fetch(
                `/api/clients/${job.client_id.S}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const { Item } = await response.json();
            setClient(Item);
        };
        if (!client) {
            loadClientDetails();
        }
    }, [client]);

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            client_address: job.client_address?.S ?? '',
            city: job.city?.S ?? '',
            zip_code: job.zip_code?.S ?? '',
        },
        validate: (values) => ({
            client_address: values.client_address === '' ? 'Must enter client address' : null,
            zip_code: values.zip_code === '' ? 'Must enter zip code' : null,
            city: values.city === '' ? 'Must enter city' : null,
        }),
    });

    const updateJob = async () => {
        const formValues = form.getValues();

        const updateJobContent: UpdateClientDetailsInput = {
            city: formValues.city,
            zip_code: formValues.zip_code,
            client_address: formValues.client_address,
        };

        const content: UpdateJobContent = {
            update_client_details: updateJobContent,
        };

        const response = await fetch(
            '/api/jobs',
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content, jobID: job.id.S }),
            }
        );

        await response.json();

        setJob(prevJob => ({
            ...prevJob,
            city: { S: formValues.city },
            zip_code: { S: formValues.zip_code },
            client_address: { S: formValues.client_address },
        }));
        setIsModalOpen(false);
    };

    const updateJobStatus = async (status: JobStatus) => {
        const content: UpdateJobContent = {
            job_status: status,
        };

        try {
            const response = await fetch(
                '/api/jobs',
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content, jobID: job.id.S }),
                }
            );

            await response.json();

            // Update local state
            setJob(prevJob => ({
                ...prevJob,
                job_status: { S: status },
            }));

            setMenuOpened(false);
        } catch (error) {
            logToCloudWatch(`Failed to update job status: ${error}`);
        }
    };

    const statusOptions = Object.values(DropdownJobStatus).filter(
        status => status !== job.job_status.S
    );

    const statusDropdownOptions = statusOptions.map((status) => (
        <Menu.Item
          key={status}
          onClick={() => updateJobStatus(status)}
        >
            {getFormattedStatus(status)}
        </Menu.Item>
    ));

    return (
        <>
            {client ?
                <Card
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  flex-grow={1}
                >
                    <div style={{ position: 'relative' }}>
                        <IconEdit
                          onClick={() => setIsModalOpen(true)}
                          style={{ cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }}
                        />
                    </div>
                    <Flex direction="column" gap="lg">
                        <Text
                          fw={500}
                          style={{ cursor: 'pointer' }}
                          onClick={() => router.push(`/clients/${job.client_id.S}`)}
                        >
                            {job.client_name.S}
                        </Text>
                        <Flex direction="row" gap={5}>
                            <Menu
                              opened={menuOpened}
                              onChange={setMenuOpened}
                              width={200}
                              position="bottom-start"
                            >
                                <Menu.Target>
                                    <Badge
                                      style={{
                                            color: '#ffffff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                        }}
                                      color={getBadgeColor(job.job_status.S)}
                                      mr="10px"
                                      rightSection={<IconChevronDown size={12} />}
                                    >
                                        {getFormattedStatus(job.job_status.S)}
                                    </Badge>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Label>Change Status</Menu.Label>
                                    {statusDropdownOptions}
                                </Menu.Dropdown>
                            </Menu>
                        </Flex>
                    </Flex>
                    <Flex direction="column" gap="lg" mt="md" mb="xs">
                        <Flex direction="column">
                            <Text size="sm" c="dimmed">{client.email?.S}</Text>
                            <Text size="sm" c="dimmed">Client Phone: {client.phone_number?.S}</Text>
                        </Flex>
                        <Flex direction="column">
                            <Text size="sm" c="dimmed">{job.client_address?.S}</Text>
                            <Text size="sm" c="dimmed">{job.city?.S}, {job.state?.S}</Text>
                            <Text size="sm" c="dimmed">{job.zip_code?.S}</Text>
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
                    <Text fz={12} c="dimmed">
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

"use client";

import { Badge, Button, Card, Center, Flex, Modal, Paper, Text, TextInput, Title } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingState from "../Global/LoadingState";
import { DynamoClient, Job } from "../Global/model";
import { getBadgeColor, getFormattedStatus } from "../Global/utils";
import classes from './Clients.module.css';
import { IconEdit } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { UpdateJobContent } from "@/app/api/jobs/jobTypes";

export default function SingleClient({ initialClient }: { initialClient: DynamoClient }) {
    const [client, setClient] = useState(initialClient);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [jobs, setJobs] = useState(new Array<Job>());
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        setLoading(true);
        getPageData().finally(() => setLoading(false));
    }, []);

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: { 
            email: client?.email.S,
            client_name: client?.client_name.S,
            phone_number: client?.phone_number.S,
        },
        validate: (values) => {
            return {
                email: values.email === '' ? 'Must enter client email' : null,
                phone_number: values.phone_number === '' ? 'Must enter client phone number' : null,
                client_name: values.client_name === '' ? 'Must enter client name' : null,
            }
        },
    });

    async function getPageData() {
        await getJobs();
    }

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

    async function updateClient() {
        const formValues = form.getValues();
        
        const response = await fetch(
            `/api/clients/${client.id.S}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_name: formValues.client_name,
                    email: formValues.email,
                    phone_number: formValues.phone_number,
                }),
            }
        )

        await response.json();

        const jobPromises = client.jobs.L.map(async (job) => {
            const content: UpdateJobContent = {
                update_client_name: formValues.client_name
            };
        
            const jobsResponse = await fetch('/api/jobs', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: content, jobID: job.S }),
            });
        
            return jobsResponse.json();
        });
        
        await Promise.all(jobPromises);

        setClient(prevClient => ({
            ...prevClient,
            client_name: { S: formValues.client_name },
            email: { S: formValues.email },
            phone_number: { S: formValues.phone_number },
        }));
        closeModals();
    }

    function closeModals() {
        setIsModalOpen(false);
        setIsConfirmationModalOpen(false);
    }

    const getJobsForClient = (clientID: string): Job[] => jobs.filter((job) => job.client_id == clientID);

    return (
        <>
            {loading ? <LoadingState /> :
                <div className={classes.flexWrapper}>
                    {client && 
                    <>
                        <Card
                            key={client.id.S}
                            shadow="sm"
                            padding="lg"
                            radius="md"
                            mt="lg"
                            withBorder
                            w='85%'
                        >
                            <div style={{ position: 'relative' }}>
                                <IconEdit
                                    onClick={() => setIsModalOpen(true)}
                                    style={{ cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }}
                                />
                            </div>
                            <Text fz={24} fw={700}>{client.client_name.S}</Text>

                            <Flex direction='row' justify='space-between' gap="lg" mt="md" mr='lg' mb="xs">
                                <Flex direction='column' justify='space-between' gap="md">
                                    <Text size="sm" fw={700}>Job Count: {client.jobs.L.length}</Text>
                                    <Text size="sm" c="dimmed">
                                        Client Email: <a href={`mailto:${client.email.S}`}>
                                            {client.email.S}
                                        </a>
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        Client Phone: <a href={`tel:+1${client?.phone_number.S}`}>
                                            {client.phone_number.S}
                                        </a>
                                    </Text>
                                </Flex>
                            </Flex>
                        </Card>

                        <Card
                            shadow="sm"
                            padding="lg"
                            radius="md"
                            mt="lg"
                            withBorder
                            w='85%'
                        >
                            <Center><Text fz={24} fw={700}>Jobs</Text></Center>
                            <Flex direction='column' gap='md' justify='center' align='center' mt='xl'>
                                {getJobsForClient(client.id.S).map((job) => (
                                    <Paper
                                        key={job.id}
                                        shadow='sm'
                                        radius='md'
                                        w='85%'
                                        withBorder
                                        p='lg'
                                        onClick={() => router.push(`/jobs/${job.id}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <Flex direction='row' justify='space-between'>
                                            <Flex direction='column' align='flex-start'>
                                                <Text size="sm" c="dimmed">{job.client_address}</Text>
                                                <Text size="sm" c="dimmed">{job.city}, {job.state}</Text>
                                                <Text size="sm" c="dimmed">{job.zip_code}</Text>
                                                {job.estimate_date && <Text size="sm" c="dimmed">{job.estimate_date.split('T')[0]}</Text>}
                                            </Flex>
                                            <Badge style={{ color: '#ffffff' }} color={getBadgeColor(job.job_status)}>
                                                {getFormattedStatus(job.job_status)}
                                            </Badge>
                                        </Flex>
                                    </Paper>
                                ))}
                            </Flex>
                        </Card>
                    </>}
                </div>
            }
            <Modal
                opened={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Update Client Details"
                size="lg"
            >
                <div>
                    <TextInput
                        withAsterisk
                        label="Client Name"
                        placeholder={client?.client_name.S}
                        key={form.key('client_name')}
                        {...form.getInputProps('client_name')}
                    />
                    <TextInput
                        withAsterisk
                        label="Email"
                        placeholder={client?.email.S}
                        key={form.key('email')}
                        {...form.getInputProps('email')}
                    />
                    <TextInput
                        withAsterisk
                        label="Phone Number"
                        placeholder={client?.phone_number.S}
                        key={form.key('phone_number')}
                        {...form.getInputProps('phone_number')}
                    />

                    <Center mt="md">
                        <Button type="submit" onClick={() => setIsConfirmationModalOpen(true)}>
                            Update Client Details
                        </Button>
                    </Center>
                </div>
            </Modal>
            <Modal
                opened={isConfirmationModalOpen}
                onClose={() => setIsConfirmationModalOpen(false)}
                size="lg"
                title={<Text fz={30} fw={700}>Are you sure?</Text>}
            >
                <Center mt="md">
                    <Flex direction='column'>
                        <Text mb="lg">
                            This will update the client details for all jobs associated with this client.
                            Currently that is {client.jobs.L.length} jobs.
                        </Text>
                        <Flex direction='row' gap='lg' justify='center' align='cemter'>
                            <Button type="submit" onClick={updateClient}>Confirm</Button>
                            <Button type="submit" onClick={closeModals}>Cancel</Button>
                        </Flex>
                    </Flex>
                </Center>
            </Modal>
        </>
    );
}
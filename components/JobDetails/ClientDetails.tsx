"use client";

import { Badge, Button, Card, Center, Flex, Group, Modal, Select, Text, TextInput } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import { JobStatus, SingleJob } from '../Global/model';
import updateJobStatus from '../Global/updateJobStatus';
import { getBadgeColor, getFormattedStatus } from "../Global/utils";
import { useEffect, useState } from 'react';
import { DatePickerInput, DateValue } from '@mantine/dates';
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import { UpdateClientDetailsInput, UpdateJobContent } from '@/app/api/jobs/jobTypes';
import { useForm } from '@mantine/form';
import { USStatesMap } from '../Global/usStates';
import { setDate } from 'date-fns';

export default function ClientDetails({ initialJob }: { initialJob: SingleJob }) {
    const [job, setJob] = useState(initialJob);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [estimateDate, setEstimateDate] = useState<DateValue | null>(null);

    useEffect(() => {
        // Synchronize estimate_date after the first render to avoid mismatch
        if (initialJob.estimate_date?.S && !estimateDate) {
            setEstimateDate(new Date(initialJob.estimate_date.S));
        }
    }, [initialJob.estimate_date?.S, estimateDate]);

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            client_name: job.client_name.S,
            client_address: job.client_address.S,
            city: job.city.S,
            state: job.state.S,
            zip_code: job.zip_code.S,
            client_email: job.client_email.S,
            client_phone_number: job.client_phone_number.S,
        },
        validate: (values) => {
            return {
                client_name: values.client_name === '' ? 'Must enter client name' : null,
                client_address: values.client_address === '' ? 'Must enter client address' : null,
                client_email: /^\S+@\S+$/.test(values.client_email) ? null : 'Invalid email',
                client_phone_number: values.client_phone_number === '' ? 'Must enter client phone number' : null,
                zip_code: values.zip_code === '' ? 'Must enter zip code' : null,
                city: values.city === '' ? 'Must enter city' : null,
                state: values.state === '' ? 'Must enter state' : null,
            }
        },
    });

    const setJobStatus = (status: JobStatus) => {
        updateJobStatus(status, job.id.S);
        setJob(prevJob => ({
            ...prevJob,
            job_status: { S: status }
        }));
    }

    const handleEstimateDateChange = async (estimateDate: DateValue) => {
        const content: UpdateJobContent = {
            estimate_date: estimateDate
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

        const { Attributes } = await response.json();
        setJob(prevJob => ({
            ...prevJob,
            estimate_date: { S: estimateDate?.toISOString() as string }
        }));

        if (job.job_status.S === JobStatus.ESTIMATE_NOT_SCHEDULED) {
            setJobStatus(JobStatus.PENDING_ESTIMATE);
        }
    }

    const updateJob = async () => {
        const formValues = form.getValues();

        const updateJobContent: UpdateClientDetailsInput = {
            client_name: formValues.client_name,
            city: formValues.city,
            state: formValues.state,
            zip_code: formValues.zip_code,
            client_email: formValues.client_email,
            client_phone_number: formValues.client_phone_number,
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

        const { Attributes } = await response.json();

        setJob(prevJob => ({
            ...prevJob,
            client_name: { S: formValues.client_name },
            city: { S: formValues.city },
            state: { S: formValues.state },
            zip_code: { S: formValues.zip_code },
            client_email: { S: formValues.client_email },
            client_phone_number: { S: formValues.client_phone_number },
            client_address: { S: formValues.client_address }
        }));
        setIsModalOpen(false);
    };

    return (
        <>
            <Card
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                style={{ height: '99%' }}
            >
                <div style={{ position: 'relative' }}>
                    <IconEdit
                        onClick={() => setIsModalOpen(true)}
                        style={{ cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }}
                    />
                </div>
                <Flex direction='column' gap="lg">
                    <Text fw={500}>{job.client_name.S}</Text>
                    <Flex direction='row' gap={5}>
                        <Badge style={{ color: '#ffffff' }} color={getBadgeColor(job.job_status.S)} mr='10px'>
                            {getFormattedStatus(job.job_status.S)}
                        </Badge>
                    </Flex>
                </Flex>
                <Flex direction='column' gap="lg" mt="md" mb="xs">
                    <Flex direction='column'>
                        <Text size="sm" c="dimmed">{job.client_email.S}</Text>
                        <Text size="sm" c="dimmed">Client Phone: {job.client_phone_number.S}</Text>
                        {estimateDate ? (
                            <Text size="sm" c="dimmed">Estimate date: {estimateDate.toISOString().split('T')[0]}</Text>
                        ) : (
                            <DatePickerInput
                                label='Estimate Date'
                                value={estimateDate}
                                valueFormat='MMM DD, YYYY'
                                placeholder='Set estimate date'
                                onChange={handleEstimateDateChange}
                            />
                        )}
                    </Flex>
                    <Flex direction='column'>
                        <Text size="sm" c="dimmed">{job.client_address.S}</Text>
                        <Text size="sm" c="dimmed">{job.city.S}, {job.state.S}</Text>
                        <Text size="sm" c="dimmed">{job.zip_code.S}</Text>
                    </Flex>
                </Flex>
            </Card>
            {isModalOpen &&
                <Modal
                    opened={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="Update Client Details"
                    size="lg"
                >
                    <div>
                        <TextInput
                            withAsterisk
                            label="Name"
                            placeholder="Client name"
                            key={form.key('client_name')}
                            {...form.getInputProps('client_name')}
                        />
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
                        <Select
                            withAsterisk
                            clearable
                            searchable
                            data={USStatesMap}
                            label="State"
                            placeholder="State"
                            key={form.key('state')}
                            {...form.getInputProps('state')}
                        />
                        <TextInput
                            withAsterisk
                            label="Zip Code"
                            placeholder="Zip Code"
                            key={form.key('zip_code')}
                            {...form.getInputProps('zip_code')}
                        />
                        <TextInput
                            withAsterisk
                            label="Email"
                            placeholder="Client email"
                            key={form.key('client_email')}
                            {...form.getInputProps('client_email')}
                        />
                        <TextInput
                            withAsterisk
                            label="Phone Number"
                            placeholder="Client phone number"
                            key={form.key('client_phone_number')}
                            {...form.getInputProps('client_phone_number')}
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

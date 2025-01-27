"use client";

import { ActionIcon, Badge, Card, Flex, Menu, Text, TextInput } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { JobStatus, SingleJob } from '../Global/model';
import updateJobStatus from '../Global/updateJobStatus';
import { getBadgeColor, getFormattedStatus } from "../Global/utils";
import { useState } from 'react';
import { DatePickerInput, DateValue } from '@mantine/dates';
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import { UpdateJobContent } from '@/app/api/jobs/jobTypes';

export default function ClientDetails({ job }: { job: SingleJob }) {
    const [jobStatus, setJobStateStatus] = useState(job.job_status.S);
    const [estimateDate, setEstimateStateDate] = useState(job.estimate_date?.S ?? '');
    const [estimateHoursTextInput, setEstimateHoursTextInput] = useState<string>();
    const [estimateHours, setEstimateStateHours] = useState(job.estimate_hours?.N ?? undefined);

    const setJobStatus = (status: JobStatus) => {
        updateJobStatus(status, job.id.S);
        setJobStateStatus(status);
    }

    const setEstimateDate = async (estimateDate: DateValue) => {
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
        setEstimateStateDate(estimateDate?.toISOString() as string);
        setJobStatus(JobStatus.PENDING_ESTIMATE);
    }

    const setEstimateHours = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setEstimateHoursTextInput(event.target.value); 
    }

    const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && estimateHoursTextInput) {
            const content: UpdateJobContent = {
                estimate_hours: estimateHoursTextInput
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
            setEstimateStateHours(estimateHoursTextInput);
        }
    };

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
                </Flex>
            </Flex>
            <Flex direction='column' gap="lg" mt="md" mb="xs">
                <Flex direction='column'>
                    {estimateHours ?
                        <Text size="sm" mb='sm' fw={700}>Job hours: {estimateHours}</Text>
                        :
                        <TextInput
                            mb='sm'
                            label='Estimate Hours'
                            placeholder='Set estimate hours'
                            onChange={setEstimateHours}
                            onKeyDown={handleKeyDown}
                        />
                    }
                    <Text size="sm" c="dimmed">{job.client_email.S}</Text>
                    <Text size="sm" c="dimmed">Client Phone: {job.client_phone_number.S}</Text>
                    {estimateDate != '' ?
                        <Text size="sm" c="dimmed">Estimate date: {estimateDate.split('T')[0]}</Text>
                        :
                        <DatePickerInput
                            label='Estimate Date'
                            valueFormat='MMM DD, YYYY'
                            placeholder='Set estimate date'
                            onChange={setEstimateDate}
                        />
                    }
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

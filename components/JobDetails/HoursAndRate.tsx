"use client";

import { UpdateHoursAndRateInput, UpdateJobContent } from '@/app/api/jobs/jobTypes';
import { Button, Card, Center, Flex, Text, TextInput } from '@mantine/core';
import '@mantine/core/styles.css';
import { DatePickerInput, DateValue } from '@mantine/dates';
import '@mantine/dates/styles.css';
import { IconEdit } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { JobStatus, SingleJob } from '../Global/model';
import updateJobStatus from '../Global/updateJobStatus';
import classes from './styles/HoursAndRate.module.css';

export default function HoursAndRate({ job }: { job: SingleJob }) {
    const [hours, setHours] = useState(job.estimate_hours?.N ?? 0);
    const [rate, setRate] = useState(job.hourly_rate?.N ?? 106);
    const [date, setDate] = useState(job.estimate_date?.S.split('T')[0] ?? 
        new Date().toISOString().split('T')[0]
    );
    const [edit, setEdit] = useState(false);
    const [estimateDate, setEstimateDateState] = useState<DateValue | null>(null);

    useEffect(() => {
        if (!estimateDate) {
            setEstimateDateState(new Date(date));
        }
    }, [estimateDate])

    const setEstimateHours = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setHours(event.target.value);
    }

    const setEstimateRate = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setRate(event.target.value);
    }

    const setEstimateDate = async (estimateDate: DateValue) => {
        setEstimateDateState(estimateDate);
        setDate((estimateDate?.toISOString() as string).split('T')[0]);

        if (job.job_status.S === JobStatus.ESTIMATE_NOT_SCHEDULED) {
            updateJobStatus(JobStatus.PENDING_ESTIMATE, job.id.S);
        }
    }

    const updateJob = async () => {
        const updateJobContent: UpdateHoursAndRateInput = {
            hours: hours,
            rate: rate,
            date: date
        }

        const content: UpdateJobContent = {
            update_hours_and_rate: updateJobContent
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

        setEdit(false);
    };

    return (
        <Card
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
        >
            <div style={{ position: 'relative' }}>
                <IconEdit
                    onClick={() => setEdit(true)}
                    style={{ cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }}
                />
            </div>
            {edit ?
                <div className={classes.editFlexContainer}>
                    <TextInput
                        label='Job Hours'
                        placeholder='Set job hours'
                        value={hours}
                        onChange={setEstimateHours}
                    />
                    <TextInput
                        label='Job Rate'
                        placeholder='Set job rate'
                        value={rate}
                        onChange={setEstimateRate}
                    />
                    <DatePickerInput
                        label='Estimate Date'
                        valueFormat='MMM DD, YYYY'
                        placeholder='Set estimate date'
                        value={estimateDate}
                        onChange={setEstimateDate}
                    />
                </div>
            :
            <>
                <div className={classes.flexContainer}>
                    <Text size="sm" mr='lg' fw={700}>Job hours: {hours}</Text>
                    <Text size="sm" fw={700}>Job rate: ${rate}</Text>
                </div>
                <Center>
                    <Text size="sm">Estimate date: {date}</Text>
                </Center>
            </>
            }
            {edit && 
                <Flex direction='row' justify='center' gap='lg'>
                    <Button onClick={() => setEdit(false)}>Cancel</Button>
                    <Button onClick={updateJob}>Update</Button>
                </Flex>
            }
        </Card>
    );
}

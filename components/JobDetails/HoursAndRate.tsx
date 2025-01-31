"use client";

import { UpdateHoursAndRateInput, UpdateJobContent } from '@/app/api/jobs/jobTypes';
import { Button, Card, Center, Text, TextInput } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { IconEdit } from '@tabler/icons-react';
import { useState } from 'react';
import { SingleJob } from '../Global/model';
import classes from './styles/HoursAndRate.module.css';

export default function HoursAndRate({ job }: { job: SingleJob }) {
    const [hours, setHours] = useState(job.estimate_hours?.N ?? 0);
    const [rate, setRate] = useState(job.hourly_rate?.N ?? 106);
    const [edit, setEdit] = useState(false);

    const setEstimateHours = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setHours(event.target.value);
    }

    const setEstimateRate = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setRate(event.target.value);
    }

    const updateJob = async () => {
        const updateJobContent: UpdateHoursAndRateInput = {
            hours: hours,
            rate: rate,
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

        const { Attributes } = await response.json();

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
            <div className={classes.flexContainer}>
                {edit ?
                    <>
                        <TextInput
                            mb='sm'
                            label='Job Hours'
                            placeholder='Set job hours'
                            onChange={setEstimateHours}
                        />
                        <TextInput
                            mb='sm'
                            label='Job Rate'
                            placeholder='Set job rate'
                            onChange={setEstimateRate}
                        />
                    </>
                    :
                    <>
                        <Text size="sm" mr='lg' fw={700}>Job hours: {hours}</Text>
                        <Text size="sm" fw={700}>Job rate: ${rate}</Text>
                    </>
                }
            </div>
            {edit && 
                <Center>
                    <Button onClick={updateJob}>Update</Button>
                </Center>
            }
        </Card>
    );
}

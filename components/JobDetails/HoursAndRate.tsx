'use client';

import { useEffect, useState } from 'react';

import { Button, Card, Flex, Switch, Text, TextInput } from '@mantine/core';
import '@mantine/core/styles.css';
import { DatePickerInput, DateValue } from '@mantine/dates';
import { IconEdit, IconCalendarEvent } from '@tabler/icons-react';
import '@mantine/dates/styles.css';

import { JobStatus, SingleJob } from '../Global/model';
import updateJobStatus from '../Global/updateJobStatus';
import classes from './styles/HoursAndRate.module.css';

import { UpdateHoursAndRateInput, UpdateJobContent } from '@/app/api/jobs/jobTypes';

export default function HoursAndRate({ job }: { job: SingleJob }) {
    const [hours, setHours] = useState((job.estimate_hours?.N ?? 0).toString());
    const [rate, setRate] = useState<string>((job.hourly_rate?.N ?? 106).toString());
    const [discountReason, setDiscountReason] = useState<string | undefined>(
        job.discount_reason?.S
    );
    const [hasDiscount, setHasDiscount] = useState(Boolean(job.discount_reason?.S));
    const [date, setDate] = useState(job.estimate_date?.S.split('T')[0] ??
        new Date().toISOString().split('T')[0]
    );
    const [edit, setEdit] = useState(false);
    const [estimateDate, setEstimateDateState] = useState<DateValue | null>(null);

    useEffect(() => {
        if (!estimateDate) {
            setEstimateDateState(new Date(date));
        }
    }, [estimateDate]);

    const setEstimateHours = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setHours(event.target.value);
    };

    const setEstimateRate = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.value === '') {
            setRate('106');
        } else {
            setRate(event.target.value);
        }
    };

    const setEstimateDiscountReason = async (event: React.ChangeEvent<HTMLInputElement>) => {
        setDiscountReason(event.target.value);
    };

    const toggleDiscount = (checked: boolean) => {
        setHasDiscount(checked);
        if (!checked) {
            setDiscountReason(undefined);
        }
    };

    const setEstimateDate = async (newEstimateDate: DateValue) => {
        setEstimateDateState(newEstimateDate);
        setDate((newEstimateDate?.toISOString() as string).split('T')[0]);

        if (job.job_status.S === JobStatus.ESTIMATE_NOT_SCHEDULED) {
            updateJobStatus(JobStatus.ESTIMATE_IN_PROGRESS, job.id.S);
        }
    };

    const updateJob = async () => {
        const updateJobContent: UpdateHoursAndRateInput = {
            hours,
            rate,
            date,
            discount_reason: discountReason,
        };

        const content: UpdateJobContent = {
            update_hours_and_rate: updateJobContent,
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

        setEdit(false);
    };

    return (
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          mt="md"
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
                      label="Job Hours"
                      placeholder="Set job hours"
                      value={hours}
                      onChange={setEstimateHours}
                    />
                    <TextInput
                      label="Job Rate"
                      placeholder="Set job rate"
                      value={rate}
                      onChange={setEstimateRate}
                    />
                    <Switch
                      label="Apply Discount"
                      checked={hasDiscount}
                      onChange={(event) => toggleDiscount(event.currentTarget.checked)}
                    />
                    {hasDiscount &&
                        <TextInput
                          label="Discount Reason"
                          placeholder="Set discount reason"
                          value={discountReason}
                          onChange={setEstimateDiscountReason}
                        />
                    }
                    <DatePickerInput
                      label="Estimate Date"
                      valueFormat="MMM DD, YYYY"
                      placeholder="Set estimate date"
                      value={estimateDate}
                      onChange={setEstimateDate}
                    />
                </div>
                :
                <>
                    <Flex justify="center" direction="column" gap="md">
                        <Text size="sm" mr="lg" fw={700}>Job hours: {hours}</Text>
                        <Text size="sm" fw={700}>Job rate: ${rate}</Text>
                        {hasDiscount && <Text size="sm">Discount reason: {discountReason}</Text>}

                        <Flex align="center" gap="md" direction="column">
                            {job.outlook_event_url?.S && (
                                <Button
                                  component="a"
                                  href={job.outlook_event_url.S}
                                  target="_blank"
                                  variant="subtle"
                                  leftSection={<IconCalendarEvent size={16} />}
                                >
                                    View Scheduled Event
                                </Button>
                            )}
                        </Flex>
                    </Flex>
                </>
            }
            {edit &&
                <Flex direction="row" justify="center" gap="lg">
                    <Button onClick={() => setEdit(false)}>Cancel</Button>
                    <Button onClick={updateJob}>Update</Button>
                </Flex>
            }
        </Card>
    );
}

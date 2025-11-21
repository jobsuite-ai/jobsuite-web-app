'use client';

import { useEffect, useState } from 'react';

import { Button, Card, Flex, Switch, Text, TextInput } from '@mantine/core';
import '@mantine/core/styles.css';
import { DatePickerInput, DateValue } from '@mantine/dates';
import '@mantine/dates/styles.css';
import { IconEdit } from '@tabler/icons-react';

import { Estimate, EstimateStatus } from '../Global/model';
import updateJobStatus from '../Global/updateJobStatus';
import classes from './styles/HoursAndRate.module.css';

import { UpdateHoursAndRateInput, UpdateJobContent } from '@/app/api/projects/jobTypes';

export default function HoursAndRate({ estimate }: { estimate: Estimate }) {
    const [hours, setHours] = useState((estimate.estimate_hours ?? 0).toString());
    const [rate, setRate] = useState<string>((estimate.hourly_rate ?? 106).toString());
    const [discountReason, setDiscountReason] = useState<string | undefined>(
        estimate.discount_reason
    );
    const [hasDiscount, setHasDiscount] = useState(Boolean(estimate.discount_reason));
    const [date, setDate] = useState(estimate.estimate_date?.split('T')[0] ??
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

        if (estimate.status === EstimateStatus.ESTIMATE_NOT_SCHEDULED) {
            updateJobStatus(EstimateStatus.ESTIMATE_IN_PROGRESS, estimate.id);
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
            `/api/estimates/${estimate.id}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(content),
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
            {/* Show breakdown if change orders exist */}
            {(estimate.original_hours !== undefined || estimate.change_order_hours) && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem' }}>
                    <Text size="sm" fw={600} mb="xs">Hours Breakdown:</Text>
                    <Flex direction="column" gap="xs">
                        <Flex justify="space-between">
                            <Text size="sm" c="dimmed">Original Hours:</Text>
                            <Text size="sm">{estimate.original_hours?.toFixed(2) || estimate.hours_bid?.toFixed(2) || '0.00'}</Text>
                        </Flex>
                        {estimate.change_order_hours ? (
                            <Flex justify="space-between">
                                <Text size="sm" c="dimmed">Change Order Hours:</Text>
                                <Text size="sm">{estimate.change_order_hours.toFixed(2)}</Text>
                            </Flex>
                        ) : null}
                        <Flex justify="space-between" style={{ borderTop: '1px solid #dee2e6', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                            <Text size="sm" fw={600}>Total Hours:</Text>
                            <Text size="sm" fw={600}>
                                {((estimate.original_hours || estimate.hours_bid || 0) +
                                (estimate.change_order_hours || 0)).toFixed(2)}
                            </Text>
                        </Flex>
                    </Flex>
                </div>
            )}
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
            {edit &&
                <Flex direction="row" justify="center" gap="lg">
                    <Button onClick={() => setEdit(false)}>Cancel</Button>
                    <Button onClick={updateJob}>Update</Button>
                </Flex>
            }
        </Card>
    );
}

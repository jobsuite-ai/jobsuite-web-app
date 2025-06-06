'use client';

import { useEffect, useRef, useState } from 'react';

import { Button, Group, Modal, NumberInput, Paper, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { v4 as uuidv4 } from 'uuid';

import '@mantine/dropzone/styles.css';
import classes from './Estimate.module.css';
import { LineItem } from './LineItem';

import { UpdateJobContent } from '@/app/api/jobs/jobTypes';
import LoadingState from '@/components/Global/LoadingState';
import { SingleJob } from '@/components/Global/model';

const PRICE_BASED = process.env.NEXT_PUBLIC_PRICE_BASED === 'true';

export default function LineItems({ job }: { job: SingleJob }) {
    const [opened, setOpened] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [lineItems, setLineItems] = useState(job.line_items?.L ?? []);
    const [date] = useState(job.estimate_date?.S ?? new Date().toISOString());
    const isFirstRender = useRef(true);

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            header: '',
            description: 'Please see the description above',
            price: 0,
            hours: 0,
        },
        validate: (values) => ({
                header: values.header === '' ? 'Must enter header' : null,
            }),
    });

    useEffect(() => {
        async function updateHours() {
            await setTotalHours();
        }

        if (!isFirstRender.current) {
            updateHours();
        } else {
            isFirstRender.current = false;
        }
    }, [lineItems]);

    async function setTotalHours() {
        // Update job hours based on line items
        const totalHours = lineItems.reduce((acc, item) => acc + +item.M.hours.N, 0);
        const content: UpdateJobContent = {
            update_hours_and_rate: {
                hours: totalHours.toString(),
                rate: job.hourly_rate?.N ?? '106',
                date,
            },
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
    }

    async function addLineItem() {
        if (!form.validate().hasErrors) {
            setIsUploading(true);
            const formValues = form.getValues();
            const lineItemID = uuidv4();

            const content: UpdateJobContent = {
                line_item: {
                    id: lineItemID,
                    header: formValues.header,
                    description: formValues.description,
                    price: formValues.price,
                    hours: formValues.hours,
                },
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

            setLineItems([...lineItems, {
                M: {
                    id: {
                        S: lineItemID,
                    },
                    header: {
                        S: formValues.header,
                    },
                    description: {
                        S: formValues.description,
                    },
                    price: {
                        N: formValues.price.toString(),
                    },
                    hours: {
                        N: formValues.hours.toString(),
                    },
                },
            }]);

            setIsUploading(false);
            setOpened(false);
        }
    }

    const removeLineItem = (id: string) => {
        setLineItems((prevItems: any) => prevItems.filter((item: any) => item.M.id?.S !== id));
    };

    return (
        <div>
            <Paper shadow="sm" radius="md" withBorder p="lg" className={classes.estimateWrapper}>
                {lineItems && lineItems.length > 0 ?
                    <>
                        {lineItems.map((item, index) => (
                            <LineItem
                              jobID={job.id.S}
                              lineItemDetails={item.M}
                              key={uuidv4()}
                              index={index}
                              removeLineItem={removeLineItem}
                            />
                        ))}
                    </>
                    :
                    <Group justify="center" className={classes.estimatePlaceholderText}>
                        <Text>You do not have any line Items</Text>
                    </Group>
                }

                <Group justify="center" mt="lg">
                    <Button onClick={() => setOpened(true)}>Add Line Item</Button>
                </Group>
            </Paper>

            <Modal
              opened={opened}
              onClose={() => setOpened(false)}
              title="Add Line Item"
              size="lg"
            >
                {isUploading ?
                    <LoadingState />
                    :
                    <div>
                        <TextInput
                          withAsterisk
                          label="Header"
                          placeholder="Header"
                          key={form.key('header')}
                          {...form.getInputProps('header')}
                        />
                        <Textarea
                          label="Description"
                          placeholder="Enter the description"
                          key={form.key('description')}
                          {...form.getInputProps('description')}
                        />
                        {PRICE_BASED ?
                            <NumberInput
                              defaultValue={1000}
                              prefix="$"
                              thousandsGroupStyle="thousand"
                              decimalScale={2}
                              allowLeadingZeros={false}
                              allowNegative={false}
                              fixedDecimalScale
                              withAsterisk
                              label="Price"
                              placeholder="Enter the price"
                              key={form.key('price')}
                              {...form.getInputProps('price')}
                            />
                            :
                            <NumberInput
                              defaultValue={0}
                              allowLeadingZeros={false}
                              allowNegative={false}
                              fixedDecimalScale
                              withAsterisk
                              label="Hours"
                              placeholder="Enter the job hours"
                              key={form.key('hours')}
                              {...form.getInputProps('hours')}
                            />
                        }

                        <Group mt="md">
                            <Button type="submit" onClick={addLineItem}>Add Line Item</Button>
                        </Group>
                    </div>
                }
            </Modal>
        </div>
    );
}

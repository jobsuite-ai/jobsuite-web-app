"use client";

import { SingleJob } from '@/components/Global/model';
import { Button, Group, Modal, NumberInput, Paper, Text, Textarea, TextInput } from '@mantine/core';
import '@mantine/dropzone/styles.css';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { LineItem } from './LineItem';
import { v4 as uuidv4 } from 'uuid';
import LoadingState from '@/components/Global/LoadingState';

export default function LineItems({ job }: { job: SingleJob }) {
    const [opened, setOpened] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            header: '',
            description: 'Please see the description below',
            price: 0,
        },
    });

    async function updateJobWithLineItems() {
        setIsUploading(true);
        const formValues = form.getValues();

        const content = {
            line_item: {
                header: formValues.header,
                description: formValues.description,
                price: formValues.price
            }
        }

        const response = await fetch(
            `/api/jobs`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: content, jobID: job.id.S }),
            }
        )

        const { Attributes } = await response.json();

        job.line_items = {
            L: []
        };

        job.line_items.L.push({
            M: {
                header: {
                    S: formValues.header
                },
                description: {
                    S: formValues.description
                },
                price: {
                    N: formValues.price.toString()
                }
            }
        })

        setIsUploading(false);
    }

    return (
        <div>
            <Paper shadow='sm' radius='md' withBorder p='lg' style={{ width: '930px' }}>
                {job.line_items ? 
                    <>
                        {job.line_items.L.map((item) => (
                            <LineItem lineItemDetails={item.M} key={uuidv4()}/>
                        ))}
                    </>
                    :
                    <Group justify="center">
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

                        <NumberInput
                            defaultValue={1000}
                            prefix='$'
                            thousandsGroupStyle='thousand'
                            decimalScale={2}
                            allowLeadingZeros={false}
                            allowNegative={false}
                            fixedDecimalScale={true}
                            withAsterisk
                            label="Price"
                            placeholder="Enter the price"
                            key={form.key('price')}
                            {...form.getInputProps('price')}
                        />

                        <Group mt="md">
                            <Button type="submit" onClick={updateJobWithLineItems}>Add Line Item</Button>
                        </Group>
                    </div>
                }
            </Modal>
        </div>
    );
}

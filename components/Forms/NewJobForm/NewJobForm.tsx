'use client';

import { Button, Group, TextInput, TagsInput, Select } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import { useForm } from '@mantine/form';
import { useState } from 'react';

export function NewJobForm() {
    const [value, setValue] = useState<[Date | null, Date | null]>([null, null]);
    const form = useForm({
      mode: 'uncontrolled',
      initialValues: {
        client_name: '',
        client_address: '',
        client_email: '',
        job_date: [new Date(), new Date()],
        tags: [],
      },
  
      validate: {
        client_email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      },
    });

    return (
        <>
            <h1>Add Job</h1>
            <form onSubmit={form.onSubmit((values) => console.log(values))}>
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
                    label="Email"
                    placeholder="Client email"
                    key={form.key('client_email')}
                    {...form.getInputProps('client_email')}
                />
                <DatePickerInput
                    withAsterisk
                    label='Job Date'
                    valueFormat='MMM DD, YYYY'
                    placeholder='Set job date'
                    type='range'
                    key={form.key('job_date')}
                    {...form.getInputProps('job_date')}
                />
                <Select
                    label='Job Status'
                    placeholder='Pick status'
                    data={['Bid In Progress', 'Bid Sent', 'Bid Accepted', 'Scheduled', 'In Progress', 'Finished']}
                    key={form.key('job_status')}
                    {...form.getInputProps('job_status')}
                />
                <TagsInput
                    label="Job tag - type and press enter to submit a tag"
                    placeholder="Enter tag" 
                    key={form.key('tags')}
                    {...form.getInputProps('tags')}
                />

                <Group justify="flex-end" mt="md">
                    <Button type="submit">Submit</Button>
                </Group>
            </form>
        </>
    );
}
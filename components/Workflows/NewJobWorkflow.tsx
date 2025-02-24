'use client';

import { useEffect, useState } from 'react';

import { Button, Group, Stepper } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

import { NewJobBasicInformation } from '../Forms/NewJobForm/NewJobBasicInformation';
import { NewJobWorkInformation } from '../Forms/NewJobForm/NewJobWorkInformation';

const NUMBER_OF_STEPS = 2;

export function NewJobWorkflow() {
    const [active, setActive] = useState(0);
    const [today, setToday] = useState(0);
    const router = useRouter();

    useEffect(() => {
        setToday(Date.now());
    }, []);

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            jobID: uuidv4(),
            client_id: uuidv4(),
            existing_client: false,
            client_name: '',
            client_address: '',
            city: '',
            state: 'Utah',
            zip_code: '',
            client_email: '',
            client_phone_number: '',
            job_type: '',
            season: '',
            video: null,
            referral_source: '',
        },

        validate: (values) => {
            if (active === 0) {
                return {
                    client_name: values.client_name === '' ? 'Must enter client name' : null,
                    client_address: values.client_address === '' ? 'Must enter client address' : null,
                    client_email: /^\S+@\S+$/.test(values.client_email) ? null : 'Invalid email',
                    client_phone_number: values.client_phone_number === '' ? 'Must enter client phone number' : null,
                };
            }
            if (active === 1) {
                return {
                    job_type: values.job_type === '' ? 'Must enter job type' : null,
                    season: values.season === '' ?
                        'Must enter seasonal rate, this can be edited later on' : null,
                };
            }
            return {};
        },
    });

    async function submitJob() {
        await Promise.all([createJobRecord(), createOrUpdateClientRecord()]);
    }

    async function createOrUpdateClientRecord() {
        const formValues = form.getValues();

        // Add job to client's job list
        if (formValues.existing_client) {
            const content = {
                job: {
                    jobID: formValues.jobID,
                    timestamp: today,
                },
            };

            const response = await fetch(
                '/api/clients',
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content, clientID: formValues.client_id }),
                }
            );

            await response.json();
        } else {
            const response = await fetch(
                '/api/clients',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },

                    body: JSON.stringify({
                        id: formValues.client_id,
                        jobs: [formValues.jobID],
                        client_name: formValues.client_name,
                        address: formValues.client_address,
                        city: formValues.city,
                        state: formValues.state,
                        zip_code: formValues.zip_code,
                        email: formValues.client_email,
                        phone_number: formValues.client_phone_number,
                        timestamp: Date.now(),
                    }),
                }
            );
            await response.json();
        }
    }

    async function createJobRecord() {
        const formValues = form.getValues();
        const hourly_rate = formValues.season === 'Winter' ? 96 : 106;
        const response = await fetch(
            '/api/jobs',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jobID: formValues.jobID,
                    client_name: formValues.client_name,
                    client_address: formValues.client_address,
                    client_id: formValues.client_id,
                    city: formValues.city,
                    state: formValues.state,
                    zip_code: formValues.zip_code,
                    video: formValues.video,
                    job_type: formValues.job_type,
                    hourly_rate,
                    referral_source: formValues.referral_source,
                }),
            }
        );

        if (response.ok) {
            notifications.show({
                title: 'Success!',
                position: 'top-center',
                color: 'green',
                message: 'The job was created successfully.',
            });
        } else {
            notifications.show({
                title: 'Creation Failed',
                position: 'top-center',
                color: 'red',
                message: 'The job failed to create.',
            });
        }
    }

    const nextStep = () => setActive((current) => {
        if (form.validate().hasErrors) {
            return current;
        }
        if (current === NUMBER_OF_STEPS - 1) {
            submitJob();
        }
        return current < NUMBER_OF_STEPS ? current + 1 : current;
    });

    const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));
    const goToJobList = () => router.push('/jobs');

    return (
        <div>
            <h1>Add Job</h1>
            <Stepper active={active}>
                <Stepper.Step label="First step" description="Client Information">
                    <NewJobBasicInformation form={form} />
                </Stepper.Step>

                <Stepper.Step label="Second step" description="Job Details">
                    <NewJobWorkInformation form={form} />
                </Stepper.Step>
            </Stepper>

            <Group justify="flex-end" mt="xl">
                {active === NUMBER_OF_STEPS && (
                    <Button style={{ margin: 'auto' }} onClick={goToJobList}>
                        Go to Job List
                    </Button>
                )}
                {active !== 0 && active !== NUMBER_OF_STEPS && (
                    <Button onClick={prevStep}>
                        Back
                    </Button>
                )}
                {active !== NUMBER_OF_STEPS && (
                    active === 1 ?
                    <Button onClick={nextStep}>Submit</Button>
                    :
                    <Button onClick={nextStep}>Next step</Button>
                )}
            </Group>
        </div>
    );
}

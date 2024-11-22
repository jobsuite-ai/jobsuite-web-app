"use client";

import { Button, Group, Stepper } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { NewJobBasicInformation } from '../Forms/NewJobForm/NewJobBasicInformation';
import { NewJobWorkInformation } from '../Forms/NewJobForm/NewJobWorkInformation';
import { v4 as uuidv4 } from 'uuid';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

const NUMBER_OF_STEPS = 2;

export function NewJobWorkflow() {
    const [active, setActive] = useState(0);
    const router = useRouter();

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            jobID: uuidv4(),
            client_name: '',
            client_address: '',
            client_email: '',
            client_phone_number: '',
            estimate_date: null,
            video: null,
        },

        validate: (values) => {
            if (active === 0) {
                return {
                    client_name: values.client_name === '' ? 'Must enter client name' : null,
                    client_address: values.client_address === '' ? 'Must enter client address' : null,
                    client_email: /^\S+@\S+$/.test(values.client_email) ? null : 'Invalid email',
                    client_phone_number: values.client_phone_number === '' ? 'Must enter client phone number' : null,
                }
            }
            return {};
        },
    });

    async function submitJob() {
        const formValues = form.getValues();
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
                    client_email: formValues.client_email,
                    estimate_date: formValues.estimate_date,
                    client_phone_number: formValues.client_phone_number,
                    video: formValues.video
                }),
            }
        )

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
                <Stepper.Step label="First step" description="Basic Information">
                    <NewJobBasicInformation form={form} />
                </Stepper.Step>

                <Stepper.Step label="Second step" description="Video Upload">
                    <NewJobWorkInformation form={form} />
                </Stepper.Step>
            </Stepper>

            <Group justify="flex-end" mt="xl">
                {active === NUMBER_OF_STEPS && (
                    <Button style={{ margin: "auto" }} onClick={goToJobList}>
                        Go to Job List
                    </Button>
                )}
                {active !== 0 && active !== NUMBER_OF_STEPS && (
                    <Button onClick={prevStep}>
                        Back
                    </Button>
                )}
                {active !== NUMBER_OF_STEPS && <Button onClick={nextStep}>Next step</Button>}
            </Group>
        </div>
    );
}

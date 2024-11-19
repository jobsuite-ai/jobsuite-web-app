"use client";

import { Button, Code, Group, Stepper } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { NewJobBasicInformation } from '../Forms/NewJobForm/NewJobBasicInformation';
import { NewJobVideoUpload } from '../Forms/NewJobForm/NewJobVideoUpload';
import { v4 as uuidv4 } from 'uuid';
import { notifications } from '@mantine/notifications';

const NUMBER_OF_STEPS = 2;

export function NewJobWorkflow() {
    const [active, setActive] = useState(0);
    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            jobID: uuidv4(),
            client_name: '',
            client_address: '',
            client_email: '',
            job_date: new Array<Date>(),
            video: null,
        },

        validate: (values) => {
            if (active === 0) {
                return {
                    client_name: values.client_name === '' ? 'Must enter client name' : null,
                    client_address: values.client_address === '' ? 'Must enter client address' : null,
                    client_email: /^\S+@\S+$/.test(values.client_email) ? null : 'Invalid email',
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
                    job_date: formValues.job_date,
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

    return (
        <div className='workflow-container'>
            <h1>Add Job</h1>
            <Stepper active={active}>
                <Stepper.Step label="First step" description="Basic Information" className='step-container'>
                    <NewJobBasicInformation form={form} />
                </Stepper.Step>

                <Stepper.Step label="Second step" description="Video Upload">
                    <NewJobVideoUpload form={form} />
                </Stepper.Step>
                
                <Stepper.Completed>
                    Completed! Form values:
                    <Code block mt="xl">
                        {JSON.stringify(form.getValues(), null, 2)}
                    </Code>
                </Stepper.Completed>
            </Stepper>

            <Group justify="flex-end" mt="xl">
                {active !== 0 && (
                    <Button onClick={prevStep}>
                        Back
                    </Button>
                )}
                {active !== NUMBER_OF_STEPS && <Button onClick={nextStep}>Next step</Button>}
            </Group>
        </div>
    );
}
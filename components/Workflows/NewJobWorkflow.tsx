"use client";

import { useRef, useState } from 'react';
import { Stepper, Button, Group, Code, Text, rem } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Dropzone, FileWithPath, MIME_TYPES } from '@mantine/dropzone';
import { IconCloudUpload, IconX, IconDownload } from '@tabler/icons-react';
import classes from './StepStyling/NewJobVideoUpload.module.css';
import { NewJobBasicInformation } from '../Forms/NewJobForm/NewJobBasicInformation';
import { NewJobVideoUpload } from '../Forms/NewJobForm/NewJobVideoUpload';

const NUMBER_OF_STEPS = 2;

export function NewJobWorkflow() {
    const [active, setActive] = useState(0);
    const [videos, setVideos] = useState<FileWithPath[] | []>([]);
    const openRef = useRef<() => void>(null);
    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            client_name: '',
            client_address: '',
            client_email: '',
            job_date: new Array<Date>(),
            video: new Array<FileWithPath>(),
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

    const nextStep = () => setActive((current) => {
        if (form.validate().hasErrors) {
            return current;
        }
        return current < NUMBER_OF_STEPS ? current + 1 : current;
    });

    const handleVideoUpload = (video: FileWithPath[]) => {
        form.setValues({ video: video })
        setVideos(video);
    }
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
                    <Button variant="default" onClick={prevStep}>
                        Back
                    </Button>
                )}
                {active !== NUMBER_OF_STEPS && <Button onClick={nextStep}>Next step</Button>}
            </Group>
        </div>
    );
}
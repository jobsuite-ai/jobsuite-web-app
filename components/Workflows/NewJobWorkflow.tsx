"use client";

import { useState } from 'react';
import { Stepper, Button, Group, TextInput, Code } from '@mantine/core';
import { useForm } from '@mantine/form';
import { NewJobBasicInformation } from '../Forms/NewJobForm/NewJobBasicInformation';
import '@mantine/core/styles.css'
import styled from 'styled-components';

export function NewJobWorkflow() {
  const [active, setActive] = useState(0);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
        client_name: '',
        client_address: '',
        client_email: '',
        job_date: [new Date(), new Date()],
        tags: [],
        username: '',
        password: '',
        name: '',
        email: '',
        website: '',
        github: '',
    },

    validate: (values) => {
    //   if (active === 0) {
    //     return {
    //       username:
    //         values.username.trim().length < 6
    //           ? 'Username must include at least 6 characters'
    //           : null,
    //       password:
    //         values.password.length < 6 ? 'Password must include at least 6 characters' : null,
    //     };
    //   }

    //   if (active === 1) {
    //     return {
    //       name: values.name.trim().length < 2 ? 'Name must include at least 2 characters' : null,
    //       email: /^\S+@\S+$/.test(values.email) ? null : 'Invalid email',
    //     };
    //   }

      return {};
    },
  });

  const nextStep = () =>
    setActive((current) => {
      if (form.validate().hasErrors) {
        return current;
      }
      return current < 3 ? current + 1 : current;
    });

  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const JobContainer = styled.div`
    margin-top: 30px;
  `
  const StepContainer = styled.div`
    width: 80%;
    margin: auto;
  `

  return (
    <JobContainer>
      <h1>Add Job</h1>
      <Stepper active={active}>
        <Stepper.Step label="First step" description="Basic Information" className='step-container'>
            <StepContainer>
                <NewJobBasicInformation form={form} />
            </StepContainer>
        </Stepper.Step>

        <Stepper.Step label="Second step" description="Personal information">
          <TextInput
            label="Name"
            placeholder="Name"
            key={form.key('name')}
            {...form.getInputProps('name')}
          />
          <TextInput
            mt="md"
            label="Email"
            placeholder="Email"
            key={form.key('email')}
            {...form.getInputProps('email')}
          />
        </Stepper.Step>

        <Stepper.Step label="Final step" description="Social media">
          <TextInput
            label="Website"
            placeholder="Website"
            key={form.key('website')}
            {...form.getInputProps('website')}
          />
          <TextInput
            mt="md"
            label="GitHub"
            placeholder="GitHub"
            key={form.key('github')}
            {...form.getInputProps('github')}
          />
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
        {active !== 3 && <Button onClick={nextStep}>Next step</Button>}
      </Group>
    </JobContainer>
  );
}
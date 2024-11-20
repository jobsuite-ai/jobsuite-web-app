import { Select, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import { UseFormReturnType } from '@mantine/form';
import classes from './Styling/NewJobBasicInformation.module.css'

export function NewJobBasicInformation({form}: {form: UseFormReturnType<any>}) {
    return (
        <div className={classes.wrapper}>
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
            <Select
                label="Job type"
                placeholder="Pick job type"
                key={form.key('job_type')}
                data={['Interior', 'Exterior']}
            />
            <DatePickerInput
                label='Job Date'
                valueFormat='MMM DD, YYYY'
                placeholder='Set job date - optional if it is not yet scheduled'
                type='range'
                key={form.key('job_date')}
                {...form.getInputProps('job_date')}
            />
        </div>
    );
}
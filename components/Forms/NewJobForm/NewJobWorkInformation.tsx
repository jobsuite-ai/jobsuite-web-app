import { Select, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import { UseFormReturnType } from '@mantine/form';
import classes from './Styling/NewJobBasicInformation.module.css'

export function NewJobWorkInformation({form}: {form: UseFormReturnType<any>}) {
    return (
        <div className={classes.wrapper}>
            <Select
                label="Job type"
                placeholder="Pick job type"
                key={form.key('job_type')}
                data={['Interior', 'Exterior']}
            />
            <DatePickerInput
                label='Estimate Date'
                valueFormat='MMM DD, YYYY'
                placeholder='Set estimate date - optional if it is not yet scheduled'
                key={form.key('estimate_date')}
                {...form.getInputProps('estimate_date')}
            />
        </div>
    );
}
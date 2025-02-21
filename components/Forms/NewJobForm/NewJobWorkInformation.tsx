import { Select } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { UseFormReturnType } from '@mantine/form';

import classes from './Styling/NewJobBasicInformation.module.css';

export function NewJobWorkInformation({ form }: { form: UseFormReturnType<any> }) {
    return (
        <div className={classes.wrapper}>
            <Select
              withAsterisk
              clearable
              label="Job type"
              placeholder="Pick job type"
              key={form.key('job_type')}
              data={['Interior', 'Exterior']}
              {...form.getInputProps('job_type')}
            />
            <Select
              withAsterisk
              clearable
              label="Season"
              placeholder="Pick a season"
              key={form.key('season')}
              data={['Winter', 'Summer']}
              {...form.getInputProps('season')}
            />
        </div>
    );
}

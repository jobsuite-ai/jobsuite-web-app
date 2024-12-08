import ClientTypeSelector from '@/components/Forms/NewJobForm/ClientTypeSelector';
import { USStatesMap } from '@/components/Global/usStates';
import { Select, TextInput } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { UseFormReturnType } from '@mantine/form';
import { useState } from 'react';
import { ClientSearch } from './ClientSearch';
import classes from './Styling/NewJobBasicInformation.module.css';

export function NewJobBasicInformation({ form }: { form: UseFormReturnType<any> }) {
    const [clientType, setClientType] = useState<string>('new');
    const [existingClientSelected, setExistingClientSelected] = useState(false);


    return (
        <div className={classes.wrapper}>
            <ClientTypeSelector setClientType={setClientType} />
            {(clientType == 'new' || existingClientSelected) ?
                <>
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
                        label="City"
                        placeholder="City"
                        key={form.key('city')}
                        {...form.getInputProps('city')}
                    />
                    <Select
                        withAsterisk
                        clearable
                        searchable
                        data={USStatesMap}
                        label="State"
                        placeholder="State"
                        key={form.key('state')}
                        {...form.getInputProps('state')}
                    />
                    <TextInput
                        withAsterisk
                        label="Zip Code"
                        placeholder="Zip Code"
                        key={form.key('zip_code')}
                        {...form.getInputProps('zip_code')}
                    />
                    <TextInput
                        withAsterisk
                        label="Email"
                        placeholder="Client email"
                        key={form.key('client_email')}
                        {...form.getInputProps('client_email')}
                    />
                    <TextInput
                        withAsterisk
                        label="Phone Number"
                        placeholder="Client phone number"
                        key={form.key('client_phone_number')}
                        {...form.getInputProps('client_phone_number')}
                    />
                </> : <ClientSearch form={form} setExistingClientSelected={setExistingClientSelected} />
            }
        </div>
    );
}
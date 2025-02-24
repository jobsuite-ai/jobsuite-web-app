import { useEffect, useState } from 'react';

import { Select, TextInput } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { UseFormReturnType } from '@mantine/form';

import { ClientSearch } from './ClientSearch';
import classes from './Styling/NewJobBasicInformation.module.css';

import ClientTypeSelector from '@/components/Forms/NewJobForm/ClientTypeSelector';
import { USStatesMap } from '@/components/Global/usStates';

export function NewJobBasicInformation({ form }: { form: UseFormReturnType<any> }) {
    const [clientType, setClientType] = useState<string>('new');
    const [existingClientSelected, setExistingClientSelected] = useState(false);

    useEffect(() => {
      // Reload when existing client is selected
    }, [existingClientSelected]);

    return (
        <div className={classes.wrapper}>
            <ClientTypeSelector setClientType={setClientType} />
            {(clientType === 'new' || existingClientSelected) ?
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
                    <Select
                      label="How did the client find us?"
                      placeholder="Select an option"
                      data={[
                        { value: 'past_customer', label: 'Past Customer' },
                        { value: 'referral', label: 'Referral' },
                        { value: 'postcard', label: 'Postcard' },
                        { value: 'trucks', label: 'Saw your trucks in the neighborhood' },
                        { value: 'google', label: 'Google Search' },
                        { value: 'yard_sign', label: 'Yard Sign' },
                      ]}
                      key={form.key('referral_source')}
                      {...form.getInputProps('referral_source')}
                    />
                </> :
                <ClientSearch form={form} setExistingClientSelected={setExistingClientSelected} />
            }
        </div>
    );
}

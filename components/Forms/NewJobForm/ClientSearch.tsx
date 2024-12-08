"use client";

import { Autocomplete, AutocompleteProps, Avatar, ComboboxStringItem, Group, Text, rem } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Client } from '@/components/Global/model';
import LoadingState from '@/components/Global/LoadingState';
import { UseFormReturnType } from '@mantine/form';

export function ClientSearch({ form, setExistingClientSelected }: { form: UseFormReturnType<any>, setExistingClientSelected: Function }) {
    const [loading, setLoading] = useState(true);
    const [clientData, setClientData] = useState<Record<string, Client>>({});
    const [clientDataKeys, setClientDataKeys] = useState<string[]>([]);

    useEffect(() => {
        setLoading(true);
        getClients().finally(() => setLoading(false));
    }, []);

    async function getClients() {
        const response = await fetch(
            '/api/clients',
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        )

        const { Items }: { Items: Client[] } = await response.json();

        const clientRecord = Object.fromEntries(
            Items.map((client) => [client.name, client])
        );

        setClientData(clientRecord);
        setClientDataKeys(Object.keys(clientRecord));
    }

    function populateFormWithExistingClient(option: ComboboxStringItem) {
        const client = clientData[option.value];
        form.setValues((current) => ({
            ...current,
            client_id: client.id,
            existing_client: true,
            client_name: client.name,
            client_address: client.address,
            city: client.city,
            state: client.state,
            zip_code: client.zip_code,
            client_email: client.email,
            client_phone_number: client.phone_number
        }));
        setExistingClientSelected(true);
    }

    const renderAutocompleteOption: AutocompleteProps['renderOption'] = ({ option }) => (
        <Group gap="sm" onClick={() => populateFormWithExistingClient(option)}>
            <Avatar src={'/black-circle-user-symbol.png'} size={36} radius="xl" />
            <div>
                <Text size="sm">{option.value}</Text>
                <Text size="xs" opacity={0.5}>
                    {clientData[option.value].email}
                </Text>
            </div>
        </Group>
    );

    return (<>
        {loading ? <LoadingState /> :
            <Autocomplete
                style={{ marginRight: rem(12) }}
                placeholder='Search by client name'
                leftSection={<IconSearch style={{ width: rem(32), height: rem(16) }} stroke={1.5} />}
                renderOption={renderAutocompleteOption}
                data={clientDataKeys}
                visibleFrom="xs"
            />
        }
    </>);
}
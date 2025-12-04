'use client';

import { useState } from 'react';

import {
    Button,
    Container,
    Divider,
    Group,
    Paper,
    Select,
    Stack,
    Stepper,
    Text,
    Textarea,
    TextInput,
    Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

import { ClientSearch } from '../Forms/NewJobForm/ClientSearch';
import ClientTypeSelector from '../Forms/NewJobForm/ClientTypeSelector';
import { USStatesMap } from '../Global/usStates';

import { getApiHeaders } from '@/app/utils/apiClient';
import { EstimateType } from '@/components/Global/model';
import { useDataCache } from '@/contexts/DataCacheContext';

const NUMBER_OF_STEPS = 3;

interface FormValues {
    // Client fields
    client_id: string | null;
    existing_client: boolean;
    client_name: string;
    client_email: string;
    client_phone_number: string;
    client_address_street: string;
    client_address_city: string;
    client_address_state: string;
    client_address_zipcode: string;
    client_address_country: string;

    // Job/Estimate fields
    address_street: string;
    address_city: string;
    address_state: string;
    address_zipcode: string;
    address_country: string;
    estimate_type: EstimateType | string;
    notes: string;
    title: string;
    referral_source: string;
    referral_name: string;
}

export function NewJobWorkflow() {
    const [active, setActive] = useState(0);
    const [clientType, setClientType] = useState<string>('new');
    const [existingClientSelected, setExistingClientSelected] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [referralSource, setReferralSource] = useState<string>('');
    const router = useRouter();
    const { refreshData } = useDataCache();

    const form = useForm<FormValues>({
        mode: 'uncontrolled',
        initialValues: {
            client_id: null,
            existing_client: false,
            client_name: '',
            client_email: '',
            client_phone_number: '',
            client_address_street: '',
            client_address_city: '',
            client_address_state: 'UT',
            client_address_zipcode: '',
            client_address_country: 'USA',
            address_street: '',
            address_city: '',
            address_state: 'UT',
            address_zipcode: '',
            address_country: 'USA',
            estimate_type: EstimateType.INTERIOR,
            notes: '',
            title: '',
            referral_source: '',
            referral_name: '',
        },

        validate: (values) => {
            if (active === 0) {
                const errors: Record<string, string | null> = {};

                // If existing client is selected, we need client_id
                if (clientType === 'existing' && !existingClientSelected) {
                    errors.client_id = 'Please select an existing client';
                }

                // If new client, validate required fields
                if (clientType === 'new' || existingClientSelected) {
                    if (!values.client_name.trim()) {
                        errors.client_name = 'Client name is required';
                    }
                    if (!values.client_email.trim()) {
                        errors.client_email = 'Client email is required';
                    } else if (!/^\S+@\S+$/.test(values.client_email)) {
                        errors.client_email = 'Invalid email format';
                    }
                    if (!values.client_phone_number.trim()) {
                        errors.client_phone_number = 'Client phone number is required';
                    }
                }

                return errors;
            }

            if (active === 1) {
                const errors: Record<string, string | null> = {};

                if (!values.address_street.trim()) {
                    errors.address_street = 'Project address is required';
                }
                if (!values.address_city.trim()) {
                    errors.address_city = 'City is required';
                }
                if (!values.address_state) {
                    errors.address_state = 'State is required';
                }
                if (!values.address_zipcode.trim()) {
                    errors.address_zipcode = 'Zip code is required';
                }
                if (!values.estimate_type) {
                    errors.estimate_type = 'Estimate type is required';
                }
                if (!values.referral_source) {
                    errors.referral_source = 'Referral source is required';
                }
                if (values.referral_source === 'Referral' && !values.referral_name.trim()) {
                    errors.referral_name = 'Referrer name is required when Referral is selected';
                }

                return errors;
            }

            // Step 3 (review) has no validation
            return {};
        },
    });

    async function submitJob() {
        setIsSubmitting(true);

        try {
            const formValues = form.getValues();

            // Step 1: Create or get client
            let clientId = formValues.client_id;

            if (clientType === 'new' || !clientId) {
                // Create new client
                const clientResponse = await fetch('/api/clients', {
                    method: 'POST',
                    headers: getApiHeaders(),
                    body: JSON.stringify({
                        name: formValues.client_name,
                        email: formValues.client_email,
                        phone_number: formValues.client_phone_number,
                        address_street: formValues.client_address_street || null,
                        address_city: formValues.client_address_city || null,
                        address_state: formValues.client_address_state || null,
                        address_zipcode: formValues.client_address_zipcode || null,
                        address_country: formValues.client_address_country || null,
                    }),
                });

                if (!clientResponse.ok) {
                    // If client already exists (409 Conflict), search for it by email
                    if (clientResponse.status === 409) {
                        const searchResponse = await fetch(
                            `/api/clients?search=${encodeURIComponent(formValues.client_email)}`,
                            {
                                method: 'GET',
                                headers: getApiHeaders(),
                            }
                        );

                        if (searchResponse.ok) {
                            const searchData = await searchResponse.json();
                            const clients = searchData.Items || [];
                            // Find the client with matching email (case-insensitive)
                            const existingClient = clients.find(
                                (client: any) =>
                                    client.email?.toLowerCase() ===
                                    formValues.client_email.toLowerCase()
                            );

                            if (existingClient) {
                                clientId = existingClient.id;
                            } else {
                                throw new Error(
                                    'Client with this email already exists, but could not be found'
                                );
                            }
                        } else {
                            throw new Error(
                                'Client with this email already exists, but could not be retrieved'
                            );
                        }
                    } else {
                        const errorData = await clientResponse.json();
                        throw new Error(errorData.message || 'Failed to create client');
                    }
                } else {
                    const newClient = await clientResponse.json();
                    clientId = newClient.id;
                }
            }

            // Step 2: Create estimate
            const estimateResponse = await fetch('/api/estimates', {
                method: 'POST',
                headers: getApiHeaders(),
                body: JSON.stringify({
                    client_id: clientId,
                    estimate_type: formValues.estimate_type,
                    address_street: formValues.address_street || null,
                    address_city: formValues.address_city || null,
                    address_state: formValues.address_state || null,
                    address_zipcode: formValues.address_zipcode || null,
                    address_country: formValues.address_country || null,
                    title: formValues.title || null,
                    referral_source: formValues.referral_source || null,
                    referral_name: formValues.referral_name || null,
                }),
            });

            if (!estimateResponse.ok) {
                const errorData = await estimateResponse.json();
                throw new Error(errorData.message || 'Failed to create estimate');
            }

            const estimate = await estimateResponse.json();

            // Step 3: Create comment with notes if provided
            if (formValues.notes.trim()) {
                const commentResponse = await fetch(
                    `/api/estimate-comments/${estimate.id}`,
                    {
                        method: 'POST',
                        headers: getApiHeaders(),
                        body: JSON.stringify({
                            comment_contents: formValues.notes,
                        }),
                    }
                );

                if (!commentResponse.ok) {
                    // Don't fail the whole operation if comment creation fails
                    // eslint-disable-next-line no-console
                    console.warn('Failed to create initial comment:', await commentResponse.json());
                }
            }

            // Refresh cache for estimates and projects after creating new estimate
            await refreshData('estimates');
            await refreshData('projects');
            // Also refresh clients if a new client was created
            if (clientType === 'new' || !formValues.client_id) {
                await refreshData('clients');
            }

            notifications.show({
                title: 'Success!',
                position: 'top-center',
                color: 'green',
                message: 'The estimate was created successfully.',
            });

            // Navigate to the estimate details page
            router.push(`/proposals/${estimate.id}`);
        } catch (error: any) {
            notifications.show({
                title: 'Creation Failed',
                position: 'top-center',
                color: 'red',
                message: error.message || 'Failed to create estimate. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const nextStep = () => {
        const validation = form.validate();
        if (validation.hasErrors) {
            return;
        }

        if (active === NUMBER_OF_STEPS - 1) {
            submitJob();
        } else {
            setActive((current) => current + 1);
        }
    };

    const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

    return (
        <Container size="md" py="xl">
            <Paper withBorder shadow="md" p="xl" radius="md">
                <Stack gap="xl">
                    <Title order={2} ta="center">
                        Create New Estimate
                    </Title>

                    <Stepper active={active}>
                        <Stepper.Step label="Client Information" description="Select or create a client">
                            <Stack gap="md" mt="xl">
                                <ClientTypeSelector setClientType={setClientType} />

                                {clientType === 'existing' && !existingClientSelected ? (
                                    <ClientSearch
                                      form={form}
                                      setExistingClientSelected={setExistingClientSelected}
                                    />
                                ) : (
                                    <Stack gap="md">
                                        <TextInput
                                          withAsterisk
                                          label="Client Name"
                                          placeholder="Enter client name"
                                          key={form.key('client_name')}
                                          {...form.getInputProps('client_name')}
                                        />
                                        <TextInput
                                          withAsterisk
                                          label="Email"
                                          placeholder="client@example.com"
                                          key={form.key('client_email')}
                                          {...form.getInputProps('client_email')}
                                        />
                                        <TextInput
                                          withAsterisk
                                          label="Phone Number"
                                          placeholder="(555) 123-4567"
                                          key={form.key('client_phone_number')}
                                          {...form.getInputProps('client_phone_number')}
                                        />
                                        <Text size="sm" c="dimmed" mt="xs" mb="xs">
                                            Billing Address (for GCs or property managers,
                                            this is the business address)
                                        </Text>
                                        <TextInput
                                          label="Billing Address"
                                          placeholder="Street address"
                                          key={form.key('client_address_street')}
                                          {...form.getInputProps('client_address_street')}
                                        />
                                        <TextInput
                                          label="City"
                                          placeholder="City"
                                          key={form.key('client_address_city')}
                                          {...form.getInputProps('client_address_city')}
                                        />
                                        <Select
                                          label="State"
                                          placeholder="Select state"
                                          data={USStatesMap}
                                          key={form.key('client_address_state')}
                                          {...form.getInputProps('client_address_state')}
                                        />
                                        <TextInput
                                          label="Zip Code"
                                          placeholder="12345"
                                          key={form.key('client_address_zipcode')}
                                          {...form.getInputProps('client_address_zipcode')}
                                        />
                                    </Stack>
                                )}
                            </Stack>
                        </Stepper.Step>

                        <Stepper.Step label="Project Information" description="Enter project details">
                            <Stack gap="md" mt="xl">
                                <TextInput
                                  label="Project Title (Optional)"
                                  placeholder="e.g., Kitchen Remodel"
                                  key={form.key('title')}
                                  {...form.getInputProps('title')}
                                />
                                <Text size="sm" c="dimmed" mt="xs" mb="xs">
                                    Project Address (where the work will be performed)
                                </Text>
                                <TextInput
                                  withAsterisk
                                  label="Project Address"
                                  placeholder="Street address"
                                  key={form.key('address_street')}
                                  {...form.getInputProps('address_street')}
                                />
                                <TextInput
                                  withAsterisk
                                  label="City"
                                  placeholder="City"
                                  key={form.key('address_city')}
                                  {...form.getInputProps('address_city')}
                                />
                                <Select
                                  withAsterisk
                                  label="State"
                                  placeholder="Select state"
                                  data={USStatesMap}
                                  key={form.key('address_state')}
                                  {...form.getInputProps('address_state')}
                                />
                                <TextInput
                                  withAsterisk
                                  label="Zip Code"
                                  placeholder="12345"
                                  key={form.key('address_zipcode')}
                                  {...form.getInputProps('address_zipcode')}
                                />
                                <Select
                                  withAsterisk
                                  label="Estimate Type"
                                  placeholder="Select type"
                                  data={[
                                    { value: EstimateType.INTERIOR, label: 'Interior' },
                                    { value: EstimateType.EXTERIOR, label: 'Exterior' },
                                    { value: EstimateType.BOTH, label: 'Both' },
                                  ]}
                                  key={form.key('estimate_type')}
                                  {...form.getInputProps('estimate_type')}
                                />
                                <Textarea
                                  label="Notes"
                                  placeholder="Add any notes about this project. These will be saved as the first comment on the estimate."
                                  rows={4}
                                  key={form.key('notes')}
                                  {...form.getInputProps('notes')}
                                />
                                <Select
                                  withAsterisk
                                  label="Referral Source"
                                  placeholder="How did they find you?"
                                  data={[
                                    { value: 'Website', label: 'Website' },
                                    { value: 'Google', label: 'Google' },
                                    { value: 'Referral', label: 'Referral' },
                                    { value: 'Facebook', label: 'Facebook' },
                                    { value: 'Instagram', label: 'Instagram' },
                                    { value: 'Trucks', label: 'Saw our trucks' },
                                    { value: 'Yard Sign', label: 'Yard Sign' },
                                    { value: 'Postcard', label: 'Postcard' },
                                    { value: 'Past Customer', label: 'Past Customer' },
                                    { value: 'Other', label: 'Other' },
                                  ]}
                                  searchable
                                  key={form.key('referral_source')}
                                  {...form.getInputProps('referral_source')}
                                  onChange={(value) => {
                                    setReferralSource(value || '');
                                    form.setFieldValue('referral_source', value || '');
                                  }}
                                />
                                {referralSource === 'Referral' && (
                                    <TextInput
                                      withAsterisk
                                      label="Who referred them?"
                                      placeholder="Enter the name of the person who referred them"
                                      key={form.key('referral_name')}
                                      {...form.getInputProps('referral_name')}
                                    />
                                )}
                            </Stack>
                        </Stepper.Step>

                        <Stepper.Step label="Review" description="Review and confirm">
                            <Stack gap="md" mt="xl">
                                <Title order={4}>Client Information</Title>
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Name:</Text>
                                        <Text size="sm" fw={500}>{form.getValues().client_name || 'N/A'}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Email:</Text>
                                        <Text size="sm" fw={500}>{form.getValues().client_email || 'N/A'}</Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Phone:</Text>
                                        <Text size="sm" fw={500}>{form.getValues().client_phone_number || 'N/A'}</Text>
                                    </Group>
                                    {(form.getValues().client_address_street ||
                                        form.getValues().client_address_city) && (
                                        <Group justify="space-between">
                                            <Text size="sm" c="dimmed">Billing Address:</Text>
                                            <Text size="sm" fw={500} ta="right">
                                                {[
                                                    form.getValues().client_address_street,
                                                    form.getValues().client_address_city,
                                                    form.getValues().client_address_state,
                                                    form.getValues().client_address_zipcode,
                                                ].filter(Boolean).join(', ')}
                                            </Text>
                                        </Group>
                                    )}
                                </Stack>

                                <Divider my="md" />

                                <Title order={4}>Project Information</Title>
                                <Stack gap="xs">
                                    {form.getValues().title && (
                                        <Group justify="space-between">
                                            <Text size="sm" c="dimmed">Project Title:</Text>
                                            <Text size="sm" fw={500}>{form.getValues().title}</Text>
                                        </Group>
                                    )}
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Project Address:</Text>
                                        <Text size="sm" fw={500} ta="right">
                                            {[
                                                form.getValues().address_street,
                                                form.getValues().address_city,
                                                form.getValues().address_state,
                                                form.getValues().address_zipcode,
                                            ].filter(Boolean).join(', ')}
                                        </Text>
                                    </Group>
                                    <Group justify="space-between">
                                        <Text size="sm" c="dimmed">Estimate Type:</Text>
                                        <Text size="sm" fw={500}>
                                            {form.getValues().estimate_type === EstimateType.INTERIOR && 'Interior'}
                                            {form.getValues().estimate_type === EstimateType.EXTERIOR && 'Exterior'}
                                            {form.getValues().estimate_type === EstimateType.BOTH && 'Both'}
                                        </Text>
                                    </Group>
                                    {form.getValues().notes && (
                                        <>
                                            <Divider my="xs" />
                                            <Stack gap="xs">
                                                <Text size="sm" c="dimmed">Notes:</Text>
                                                <Text size="sm">{form.getValues().notes}</Text>
                                            </Stack>
                                        </>
                                    )}
                                    {(form.getValues().referral_source || referralSource) && (
                                        <Group justify="space-between">
                                            <Text size="sm" c="dimmed">Referral Source:</Text>
                                            <Text size="sm" fw={500}>{form.getValues().referral_source || referralSource}</Text>
                                        </Group>
                                    )}
                                    {(form.getValues().referral_source === 'Referral' || referralSource === 'Referral') && (form.getValues().referral_name || '') && (
                                        <Group justify="space-between">
                                            <Text size="sm" c="dimmed">Referred by:</Text>
                                            <Text size="sm" fw={500}>{form.getValues().referral_name}</Text>
                                        </Group>
                                    )}
                                </Stack>
                            </Stack>
                        </Stepper.Step>
                    </Stepper>

                    <Group justify="flex-end" mt="xl">
                        {active !== 0 && (
                            <Button variant="default" onClick={prevStep} disabled={isSubmitting}>
                                Back
                            </Button>
                        )}
                        {active === NUMBER_OF_STEPS - 1 ? (
                            <Button onClick={nextStep} loading={isSubmitting}>
                                Create Estimate
                            </Button>
                        ) : (
                            <Button onClick={nextStep} disabled={isSubmitting}>
                                Next Step
                            </Button>
                        )}
                    </Group>
                </Stack>
            </Paper>
        </Container>
    );
}

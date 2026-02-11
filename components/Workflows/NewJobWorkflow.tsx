'use client';

import { useEffect, useState } from 'react';

import {
    Autocomplete,
    AutocompleteProps,
    Badge,
    Button,
    Checkbox,
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
    rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconUserCircle } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import { USStatesMap } from '../Global/usStates';

import { getApiHeaders } from '@/app/utils/apiClient';
import { ContractorClient, EstimateType } from '@/components/Global/model';
import { useDataCache } from '@/contexts/DataCacheContext';
import { useAppSelector } from '@/store/hooks';
import { selectAllClients } from '@/store/slices/clientsSlice';

const NUMBER_OF_STEPS = 3;

// Validation helper functions
const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
        return 'Email is required';
    }
    // Simple format: something@something.something
    const emailRegex = /^.+@.+\..+$/;
    if (!emailRegex.test(email.trim())) {
        return 'Invalid email format. Must be in format: name@domain.tld';
    }
    return null;
};

const validatePhoneNumber = (phone: string): string | null => {
    if (!phone.trim()) {
        return 'Phone number is required';
    }
    // Match backend pattern:
    // ^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$|^00[0-9]{10,11}$
    const phoneRegex = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$|^00[0-9]{10,11}$/;
    if (!phoneRegex.test(phone.trim())) {
        return 'Invalid phone number format. Use formats like: (555) 123-4567, 555-123-4567, or 5551234567';
    }
    return null;
};

const validateZipCode = (zipcode: string): string | null => {
    if (!zipcode.trim()) {
        return 'Zip code is required';
    }
    // Match backend pattern: ^\d{5}(-\d{4})?$
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(zipcode.trim())) {
        return 'Invalid zip code format. Use 5 digits or 5+4 format (e.g., 12345 or 12345-6789)';
    }
    return null;
};

// Fuzzy match function - similar to header search
const fuzzyMatch = (text: string, searchTerm: string): boolean => {
    if (!text || !searchTerm) {
        return false;
    }

    const textLower = text.toLowerCase().trim();
    const searchLower = searchTerm.toLowerCase().trim();

    if (!textLower || !searchLower) {
        return false;
    }

    // Exact substring match (fastest and most reliable)
    if (textLower.includes(searchLower)) {
        return true;
    }

    // Remove punctuation and normalize whitespace for matching
    const cleanedText = textLower.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
    const cleanedSearch = searchLower.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');

    // Check if cleaned search appears in cleaned text
    if (cleanedText.includes(cleanedSearch)) {
        return true;
    }

    // Word-by-word matching for multi-word searches
    const searchWords = cleanedSearch.split(/\s+/).filter((w) => w.length > 0);
    if (searchWords.length > 1) {
        const allWordsMatch = searchWords.every((searchWord) =>
            cleanedText.includes(searchWord));
        if (allWordsMatch) {
            return true;
        }
    }

    // For single-word searches, check if it appears in any word
    if (searchWords.length === 1) {
        const searchWord = searchWords[0];
        const textWords = cleanedText.split(/\s+/);
        if (textWords.some((textWord) => textWord.includes(searchWord))) {
            return true;
        }
    }

    // Fuzzy match: check if all characters of search term appear in order
    let searchIndex = 0;
    for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i += 1) {
        if (textLower[i] === searchLower[searchIndex]) {
            searchIndex += 1;
        }
    }

    return searchIndex === searchLower.length;
};

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
    const [existingClientSelected, setExistingClientSelected] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [referralSource, setReferralSource] = useState<string>('');
    const [sameAsClientAddress, setSameAsClientAddress] = useState(false);
    const [clientSearchValue, setClientSearchValue] = useState('');
    const [clientSearchResults, setClientSearchResults] = useState<ContractorClient[]>([]);
    const clients = useAppSelector(selectAllClients);
    const router = useRouter();
    const { refreshData, updateEstimate } = useDataCache();

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

                // If no existing client is selected, validate required fields
                if (!values.client_id) {
                    if (!values.client_name.trim()) {
                        errors.client_name = 'Client name is required';
                    }

                    // Validate email format
                    const emailError = validateEmail(values.client_email);
                    if (emailError) {
                        errors.client_email = emailError;
                    }

                    // Validate phone number format
                    const phoneError = validatePhoneNumber(values.client_phone_number);
                    if (phoneError) {
                        errors.client_phone_number = phoneError;
                    }

                    // Validate zip code if provided
                    if (values.client_address_zipcode.trim()) {
                        const zipError = validateZipCode(values.client_address_zipcode);
                        if (zipError) {
                            errors.client_address_zipcode = zipError;
                        }
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

                // Validate zip code format
                const zipError = validateZipCode(values.address_zipcode);
                if (zipError) {
                    errors.address_zipcode = zipError;
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

    useEffect(() => {
        if (existingClientSelected) {
            setClientSearchResults([]);
            return;
        }

        const searchTerm = clientSearchValue.trim().toLowerCase();
        if (searchTerm.length < 2) {
            setClientSearchResults([]);
            return;
        }

        const results = clients.filter((client) => {
            const name = client.name || '';
            const email = client.email || '';
            return fuzzyMatch(name, searchTerm) || fuzzyMatch(email, searchTerm);
        });

        setClientSearchResults(results.slice(0, 10));
    }, [clientSearchValue, existingClientSelected, clients]);

    const renderClientSearchOption: AutocompleteProps['renderOption'] = ({ option }) => {
        if (option.value === 'no-results') {
            return (
                <Group gap="sm" p="xs">
                    <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
                        No results found
                    </Text>
                </Group>
            );
        }

        const client = clientSearchResults.find((result) => result.id === option.value);
        if (!client) return null;

        return (
            <Group
              gap="md"
              wrap="nowrap"
              p={4}
              style={{ width: '100%' }}
            >
                <div
                  style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: rem(36),
                        height: rem(36),
                        borderRadius: '50%',
                        backgroundColor: 'var(--mantine-color-green-0)',
                        flexShrink: 0,
                    }}
                >
                    <IconUserCircle size={20} color="var(--mantine-color-green-6)" stroke={1.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} lineClamp={1}>
                        {client.name}
                    </Text>
                    {client.email && (
                        <Text size="xs" c="dimmed" lineClamp={1} mt={2}>
                            {client.email}
                        </Text>
                    )}
                </div>
                <Badge
                  size="sm"
                  variant="light"
                  color="green"
                  style={{ textTransform: 'capitalize', flexShrink: 0 }}
                >
                    client
                </Badge>
            </Group>
        );
    };

    // Helper function to copy client address to project address
    const copyClientAddressToProject = () => {
        const formValues = form.getValues();
        form.setFieldValue('address_street', formValues.client_address_street || '');
        form.setFieldValue('address_city', formValues.client_address_city || '');
        form.setFieldValue('address_state', formValues.client_address_state || 'UT');
        form.setFieldValue('address_zipcode', formValues.client_address_zipcode || '');
        form.setFieldValue('address_country', formValues.client_address_country || 'USA');
    };

    // Handle copying client address to project address when checkbox is checked
    useEffect(() => {
        if (sameAsClientAddress) {
            copyClientAddressToProject();
        }
    }, [sameAsClientAddress]);

    async function submitJob() {
        setIsSubmitting(true);

        try {
            const formValues = form.getValues();

            // Step 1: Create or get client
            let clientId = formValues.client_id;

            if (!clientId) {
                const clientAddressMissing = ![
                    formValues.client_address_street,
                    formValues.client_address_city,
                    formValues.client_address_state,
                    formValues.client_address_zipcode,
                ].some((value) => value && value.trim());

                const clientAddress = clientAddressMissing
                    ? {
                        address_street: formValues.address_street || null,
                        address_city: formValues.address_city || null,
                        address_state: formValues.address_state || null,
                        address_zipcode: formValues.address_zipcode || null,
                        address_country: formValues.address_country || null,
                    }
                    : {
                        address_street: formValues.client_address_street || null,
                        address_city: formValues.client_address_city || null,
                        address_state: formValues.client_address_state || null,
                        address_zipcode: formValues.client_address_zipcode || null,
                        address_country: formValues.client_address_country || null,
                    };

                // Create new client
                const clientResponse = await fetch('/api/clients', {
                    method: 'POST',
                    headers: getApiHeaders(),
                    body: JSON.stringify({
                        name: formValues.client_name,
                        email: formValues.client_email,
                        phone_number: formValues.client_phone_number,
                        ...clientAddress,
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
                            const foundClients = searchData.Items || [];
                            // Find the client with matching email (case-insensitive)
                            const existingClient = foundClients.find(
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

            // Update cache immediately with the new estimate
            updateEstimate(estimate);

            // Also update client cache if a new client was created
            if (!formValues.client_id) {
                // Try to get the client from the response if available
                // Otherwise, refresh in background
                refreshData('clients').catch(() => {});
            }

            // Optionally refresh in background for consistency (non-blocking)
            refreshData('estimates').catch(() => {});
            refreshData('projects').catch(() => {});

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
                                <Stack gap="xs">
                                    <Autocomplete
                                      withAsterisk
                                      label="Client Name"
                                      placeholder="Enter client name"
                                      value={clientSearchValue}
                                      disabled={existingClientSelected}
                                      renderOption={renderClientSearchOption}
                                      filter={({ options }) => options}
                                      data={
                                        clientSearchValue.trim().length < 2
                                          ? []
                                          : clientSearchResults.length === 0
                                            ? [{ value: 'no-results', label: 'No results found', disabled: true }]
                                            : clientSearchResults.slice(0, 10).map((client) => ({
                                                value: client.id,
                                                label: client.name,
                                            }))
                                      }
                                      onChange={(value) => {
                                        form.setFieldValue('client_name', value);
                                        setClientSearchValue(value);
                                      }}
                                      onOptionSubmit={(value) => {
                                        if (value === 'no-results') {
                                            return;
                                        }
                                        const selectedClient = clientSearchResults.find(
                                          (client) => client.id === value
                                        );
                                        if (!selectedClient) {
                                            return;
                                        }
                                        form.setValues((current) => ({
                                            ...current,
                                            client_id: selectedClient.id,
                                            existing_client: true,
                                            client_name: selectedClient.name,
                                            client_email: selectedClient.email,
                                            client_phone_number: selectedClient.phone_number,
                                            client_address_street: selectedClient.address_street || '',
                                            client_address_city: selectedClient.address_city || '',
                                            client_address_state: selectedClient.address_state || '',
                                            client_address_zipcode: selectedClient.address_zipcode || '',
                                            client_address_country: selectedClient.address_country || 'USA',
                                        }));
                                        setExistingClientSelected(true);
                                        setClientSearchValue(selectedClient.name);
                                        setClientSearchResults([]);
                                      }}
                                      limit={10}
                                      styles={{
                                        dropdown: {
                                            borderRadius: rem(8),
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                        },
                                        option: {
                                            padding: rem(8),
                                            borderRadius: rem(6),
                                            cursor: 'pointer',
                                            '&[data-hovered]': {
                                                backgroundColor: 'var(--mantine-color-gray-1)',
                                            },
                                        },
                                      }}
                                    />
                                </Stack>
                                {existingClientSelected && (
                                    <Button
                                      variant="default"
                                      onClick={() => {
                                        setExistingClientSelected(false);
                                        setClientSearchValue('');
                                        setClientSearchResults([]);
                                        form.setValues((current) => ({
                                            ...current,
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
                                        }));
                                      }}
                                    >
                                        Clear selected client
                                    </Button>
                                )}
                                <TextInput
                                  withAsterisk
                                  label="Email"
                                  placeholder="client@example.com"
                                  key={form.key('client_email')}
                                  disabled={existingClientSelected}
                                  {...form.getInputProps('client_email')}
                                />
                                <TextInput
                                  withAsterisk
                                  label="Phone Number"
                                  placeholder="(555) 123-4567"
                                  key={form.key('client_phone_number')}
                                  disabled={existingClientSelected}
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
                                  disabled={existingClientSelected}
                                  {...form.getInputProps('client_address_street')}
                                  onChange={(e) => {
                                    form.getInputProps('client_address_street').onChange?.(e);
                                    if (sameAsClientAddress) {
                                      form.setFieldValue('address_street', e.currentTarget.value);
                                    }
                                  }}
                                />
                                <TextInput
                                  label="City"
                                  placeholder="City"
                                  key={form.key('client_address_city')}
                                  disabled={existingClientSelected}
                                  {...form.getInputProps('client_address_city')}
                                  onChange={(e) => {
                                    form.getInputProps('client_address_city').onChange?.(e);
                                    if (sameAsClientAddress) {
                                      form.setFieldValue('address_city', e.currentTarget.value);
                                    }
                                  }}
                                />
                                <Select
                                  label="State"
                                  placeholder="Select state"
                                  data={USStatesMap}
                                  key={form.key('client_address_state')}
                                  disabled={existingClientSelected}
                                  {...form.getInputProps('client_address_state')}
                                  onChange={(value) => {
                                    form.getInputProps('client_address_state').onChange?.(value);
                                    if (sameAsClientAddress) {
                                      form.setFieldValue('address_state', value || 'UT');
                                    }
                                  }}
                                />
                                <TextInput
                                  label="Zip Code"
                                  placeholder="12345"
                                  key={form.key('client_address_zipcode')}
                                  disabled={existingClientSelected}
                                  {...form.getInputProps('client_address_zipcode')}
                                  onChange={(e) => {
                                    form.getInputProps('client_address_zipcode').onChange?.(e);
                                    if (sameAsClientAddress) {
                                      form.setFieldValue('address_zipcode', e.currentTarget.value);
                                    }
                                  }}
                                />
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
                                <Checkbox
                                  label="Project address is same as client address"
                                  checked={sameAsClientAddress}
                                  onChange={(event) => {
                                    setSameAsClientAddress(event.currentTarget.checked);
                                  }}
                                />
                                <TextInput
                                  withAsterisk
                                  label="Project Address"
                                  placeholder="Street address"
                                  key={form.key('address_street')}
                                  {...form.getInputProps('address_street')}
                                  disabled={sameAsClientAddress}
                                />
                                <TextInput
                                  withAsterisk
                                  label="City"
                                  placeholder="City"
                                  key={form.key('address_city')}
                                  {...form.getInputProps('address_city')}
                                  disabled={sameAsClientAddress}
                                />
                                <Select
                                  withAsterisk
                                  label="State"
                                  placeholder="Select state"
                                  data={USStatesMap}
                                  key={form.key('address_state')}
                                  {...form.getInputProps('address_state')}
                                  disabled={sameAsClientAddress}
                                />
                                <TextInput
                                  withAsterisk
                                  label="Zip Code"
                                  placeholder="12345"
                                  key={form.key('address_zipcode')}
                                  {...form.getInputProps('address_zipcode')}
                                  disabled={sameAsClientAddress}
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

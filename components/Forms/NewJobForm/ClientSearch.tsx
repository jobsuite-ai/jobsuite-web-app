'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Autocomplete, AutocompleteProps, Badge, Group, Text, rem } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { IconSearch, IconUserCircle } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';
import LoadingState from '@/components/Global/LoadingState';
import { ContractorClient } from '@/components/Global/model';

interface SearchResult {
    id: string;
    label: string;
    subtitle: string;
}

export function ClientSearch({ form, setExistingClientSelected }: {
    form: UseFormReturnType<any>,
    setExistingClientSelected: Function
}) {
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<ContractorClient[]>([]);
    const [autocompleteValue, setAutocompleteValue] = useState<string>('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

    useEffect(() => {
        setLoading(true);
        getClients().finally(() => setLoading(false));
    }, []);

    async function getClients() {
        const response = await fetch(
            '/api/clients',
            {
                method: 'GET',
                headers: getApiHeaders(),
            }
        );

        const { Items }: { Items: ContractorClient[] } = await response.json();
        setClients(Items);
    }

    // Fuzzy match function - similar to Header search
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
            const allWordsMatch = searchWords.every((searchWord) => cleanedText.includes(searchWord));
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

    // Client-side search function - similar to Header search
    useEffect(() => {
        if (!autocompleteValue || autocompleteValue.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const searchTerm = autocompleteValue.trim();
        const results: SearchResult[] = [];

        // Search clients by name and email with fuzzy matching
        clients.forEach((client) => {
            const nameMatch = fuzzyMatch(client.name, searchTerm);
            const emailMatch = fuzzyMatch(client.email, searchTerm);

            if (nameMatch || emailMatch) {
                results.push({
                    id: client.id,
                    label: client.name,
                    subtitle: client.email,
                });
            }
        });

        // Limit results to 10
        setSearchResults(results.slice(0, 10));
    }, [autocompleteValue, clients]);

    // Format search results for Autocomplete
    const autocompleteData = useMemo(() => {
        if (searchResults.length === 0 && autocompleteValue.trim().length >= 2) {
            return [{ value: 'no-results', label: 'No results found', disabled: true }];
        }
        if (searchResults.length === 0) {
            return [];
        }
        return searchResults.map((result) => ({
            value: result.id,
            // Include subtitle in label for Mantine's default filtering to work on emails
            label: result.subtitle ? `${result.label} ${result.subtitle}` : result.label,
            subtitle: result.subtitle,
            id: result.id,
        }));
    }, [searchResults, autocompleteValue]);

    const handleSearchSelect = useCallback((value: string | null) => {
        if (!value || value === 'no-results') {
            return false;
        }

        const selectedClient = clients.find((c) => c.id === value);

        if (selectedClient) {
            // Clear the search input immediately
            setAutocompleteValue('');
            setSearchResults([]);

            // Populate form with selected client
            form.setValues((current) => ({
                ...current,
                client_id: selectedClient.id,
                existing_client: true,
                client_name: selectedClient.name,
                client_address_street: selectedClient.address_street || '',
                client_address_city: selectedClient.address_city || '',
                client_address_state: selectedClient.address_state || '',
                client_address_zipcode: selectedClient.address_zipcode || '',
                client_email: selectedClient.email,
                client_phone_number: selectedClient.phone_number,
            }));

            setExistingClientSelected(true);
            return false; // Prevent default behavior
        }

        return false;
    }, [clients, form, setExistingClientSelected]);

    const renderAutocompleteOption: AutocompleteProps['renderOption'] = ({ option }) => {
        if (option.value === 'no-results') {
            return (
                <Group gap="sm" p="xs">
                    <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
                        No results found
                    </Text>
                </Group>
            );
        }

        const result = searchResults.find((r) => r.id === option.value);
        if (!result) return null;

        return (
            <Group
                gap="md"
                wrap="nowrap"
                p={4}
                style={{ width: '100%' }}
                onClick={(e) => {
                    // Prevent default and handle selection
                    e.preventDefault();
                    handleSearchSelect(option.value);
                }}
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
                        {result.label}
                    </Text>
                    {result.subtitle && (
                        <Text size="xs" c="dimmed" lineClamp={1} mt={2}>
                            {result.subtitle}
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

    if (loading) {
        return <LoadingState />;
    }

    return (
        <Autocomplete
            placeholder="Search by client name or email"
            value={autocompleteValue}
            leftSection={
                <IconSearch style={{ width: rem(28), height: rem(16) }} stroke={1.5} />
            }
            renderOption={renderAutocompleteOption}
            data={autocompleteData}
            onChange={(value) => {
                setAutocompleteValue(value);
            }}
            onOptionSubmit={(value) => {
                // Handle selection and prevent setting value in input
                const shouldPrevent = handleSearchSelect(value);
                if (shouldPrevent === false) {
                    // Clear the value to prevent it from being set
                    setTimeout(() => setAutocompleteValue(''), 0);
                }
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
    );
}

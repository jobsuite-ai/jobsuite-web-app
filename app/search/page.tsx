'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge, Card, Center, Group, Loader, Stack, Text, TextInput, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { getApiHeaders } from '@/app/utils/apiClient';
import { ContractorClient, Estimate } from '@/components/Global/model';
import { getEstimateBadgeColor, getFormattedEstimateStatus } from '@/components/Global/utils';

type SearchResponse = {
    estimates: Estimate[];
    clients: ContractorClient[];
};

function formatEstimateAddress(estimate: Estimate): string {
    const parts = [
        estimate.address_street,
        estimate.address_city,
        estimate.address_state,
        estimate.address_zipcode,
    ].filter(Boolean);
    return parts.join(', ');
}

function formatClientAddress(client: ContractorClient): string {
    const parts = [
        client.address_street,
        client.address_city,
        client.address_state,
        client.address_zipcode,
    ].filter(Boolean);
    return parts.join(', ');
}

export default function SearchPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = useMemo(() => (searchParams.get('q') || '').trim(), [searchParams]);
    const [results, setResults] = useState<SearchResponse>({ estimates: [], clients: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [reloadToken, setReloadToken] = useState(0);
    const [searchInputValue, setSearchInputValue] = useState(query);
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Keep search input in sync with URL
    useEffect(() => {
        setSearchInputValue(query);
    }, [query]);

    const handleSearchSubmit = useCallback(() => {
        const q = searchInputValue.trim();
        if (!q) return;
        router.push(`/search?q=${encodeURIComponent(q)}`);
    }, [searchInputValue, router]);

    useEffect(() => {
        const onSearchSubmit = (event: Event) => {
            const customEvent = event as CustomEvent<{ query?: string }>;
            if (customEvent.detail?.query && customEvent.detail.query === query) {
                setReloadToken((prev) => prev + 1);
            }
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('search-submit', onSearchSubmit);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('search-submit', onSearchSubmit);
            }
        };
    }, [query]);

    useEffect(() => {
        if (!query) {
            setResults({ estimates: [], clients: [] });
            setLoading(false);
            return;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const fetchResults = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(
                    `/api/search?q=${encodeURIComponent(query)}`,
                    {
                        method: 'GET',
                        headers: getApiHeaders(),
                        signal: controller.signal,
                    }
                );
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Search failed');
                }
                const data = await response.json();
                setResults({
                    estimates: data.estimates || [],
                    clients: data.clients || [],
                });
            } catch (err) {
                if ((err as Error).name === 'AbortError') {
                    return;
                }
                setError(err instanceof Error ? err.message : 'Search failed');
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query, reloadToken]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        window.dispatchEvent(
            new CustomEvent('search-loading', { detail: { loading } })
        );
    }, [loading]);

    const totalResults = results.estimates.length + results.clients.length;

    return (
        <Stack p="md" gap="lg" style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Search bar on mobile (header search hidden on small screens) */}
            {isMobile && (
                <TextInput
                  placeholder="Search by client name, email, or estimate address"
                  leftSection={<IconSearch size={18} />}
                  value={searchInputValue}
                  onChange={(e) => setSearchInputValue(e.currentTarget.value)}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                          handleSearchSubmit();
                      }
                  }}
                  size="md"
                  mt="xl"
                  styles={{ root: { width: '100%' } }}
                />
            )}
            <Title order={3} c="gray.0">Search Results</Title>
            {!query && (
                <Text c="gray.0">Enter a search term to see results.</Text>
            )}
            {query && (
                <Text c="gray.0">
                    Showing {totalResults} results for &quot;{query}&quot;
                </Text>
            )}

            {loading && (
                <Center py="xl">
                    <Loader />
                </Center>
            )}

            {error && (
                <Text c="red" fw={600}>
                    {error}
                </Text>
            )}

            {!loading && !error && query && totalResults === 0 && (
                <Text c="dimmed">No results found.</Text>
            )}

            {results.estimates.length > 0 && (
                <Stack gap="sm">
                    <Title order={4} c="gray.0">Estimates</Title>
                    {results.estimates.map((estimate) => (
                        <Card
                          key={estimate.id}
                          withBorder
                          shadow="sm"
                          style={{ cursor: 'pointer' }}
                          onClick={(event) => {
                                if (event.metaKey || event.ctrlKey) {
                                    window.open(`/proposals/${estimate.id}`, '_blank');
                                } else {
                                    router.push(`/proposals/${estimate.id}`);
                                }
                            }}
                        >
                            <Group justify="space-between" align="flex-start">
                                <Stack gap={4}>
                                    <Text fw={600}>
                                        {estimate.title || `Estimate #${estimate.id.slice(0, 8)}`}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        {estimate.client_name || 'Unknown Client'}
                                    </Text>
                                    {formatEstimateAddress(estimate) && (
                                        <Text size="sm" c="dimmed">
                                            {formatEstimateAddress(estimate)}
                                        </Text>
                                    )}
                                </Stack>
                                <Badge
                                  style={{ color: '#ffffff' }}
                                  color={getEstimateBadgeColor(estimate.status)}
                                >
                                    {getFormattedEstimateStatus(estimate.status)}
                                </Badge>
                            </Group>
                        </Card>
                    ))}
                </Stack>
            )}

            {results.clients.length > 0 && (
                <Stack gap="sm">
                    <Title order={4} c="gray.0">Clients</Title>
                    {results.clients.map((client) => (
                        <Card
                          key={client.id}
                          withBorder
                          shadow="sm"
                          style={{ cursor: 'pointer' }}
                          onClick={(event) => {
                                if (event.metaKey || event.ctrlKey) {
                                    window.open(`/clients/${client.id}`, '_blank');
                                } else {
                                    router.push(`/clients/${client.id}`);
                                }
                            }}
                        >
                            <Stack gap={4}>
                                <Text fw={600}>{client.name}</Text>
                                <Text size="sm" c="dimmed">
                                    {client.email}
                                </Text>
                                {client.phone_number && (
                                    <Text size="sm" c="dimmed">
                                        {client.phone_number}
                                    </Text>
                                )}
                                {formatClientAddress(client) && (
                                    <Text size="sm" c="dimmed">
                                        {formatClientAddress(client)}
                                    </Text>
                                )}
                            </Stack>
                        </Card>
                    ))}
                </Stack>
            )}
        </Stack>
    );
}

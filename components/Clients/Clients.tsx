'use client';

import { useEffect, useState, useRef } from 'react';

import { ActionIcon, Badge, Card, Divider, Flex, Group, Paper, Text, Title } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import classes from './Clients.module.css';
import LoadingState from '../Global/LoadingState';
import { ContractorClient, Job } from '../Global/model';
import UniversalError from '../Global/UniversalError';

import { useDataCache } from '@/contexts/DataCacheContext';

export default function ClientsList() {
  const {
    clients: cachedClients,
    projects: cachedProjects,
    loading: cacheLoading,
    refreshData,
    invalidateCache,
  } = useDataCache();
  const [clients, setClients] = useState(new Array<ContractorClient>());
  const [jobs, setJobs] = useState(new Array<Job>());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasAttemptedAutoRefreshRef = useRef(false);
  const router = useRouter();

  // Update clients and jobs when cache data changes
  useEffect(() => {
    const clientsLoaded = cachedClients.length > 0 || !cacheLoading.clients;
    const projectsLoaded = cachedProjects.length > 0 || !cacheLoading.projects;

    if (clientsLoaded && projectsLoaded) {
      setClients(cachedClients);
      setJobs(cachedProjects);
      setLoading(false);
    } else if (cacheLoading.clients || cacheLoading.projects) {
      setLoading(true);
    }
  }, [cachedClients, cachedProjects, cacheLoading.clients, cacheLoading.projects]);

  // Auto-refresh if data is empty after initial load (e.g., after login or cache expired)
  // Only runs once per mount to prevent infinite loops
  useEffect(() => {
    // Only auto-refresh if:
    // 1. Not currently loading
    // 2. Data is empty
    // 3. We have an access token (user is logged in)
    // 4. We haven't already attempted an auto-refresh
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (
        !cacheLoading.clients &&
        !cacheLoading.projects &&
        clients.length === 0 &&
        accessToken &&
        !hasAttemptedAutoRefreshRef.current
    ) {
      // Small delay to avoid race conditions with initial cache load
      const timeoutId = setTimeout(() => {
        if (
            clients.length === 0 &&
            !cacheLoading.clients &&
            !cacheLoading.projects &&
            !hasAttemptedAutoRefreshRef.current
        ) {
          hasAttemptedAutoRefreshRef.current = true;
          // Don't call invalidateCache - it clears state and causes loops
          // Just refresh the data
          refreshData('clients', true);
          refreshData('projects', true);
        }
      }, 1000); // Increased delay to let DataCacheContext finish initial load
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [clients.length, cacheLoading.clients, cacheLoading.projects, refreshData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      invalidateCache('clients');
      invalidateCache('projects');
      await refreshData('clients', true);
      await refreshData('projects', true);
    } finally {
      setRefreshing(false);
    }
  };

  const getJobsForClient = (clientID: string): Job[] =>
    jobs.filter((job) => job.client_id === clientID);

  const formatAddress = (client: ContractorClient): string => {
    const parts = [
      client.address_street,
      client.address_city,
      client.address_state,
      client.address_zipcode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No address on file';
  };

  // Sort and group clients by first letter
  const getGroupedClients = () => {
    // Sort clients alphabetically by name
    const sortedClients = [...clients].sort((a, b) => {
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();
      return nameA.localeCompare(nameB);
    });

    // Group by first letter
    const grouped = sortedClients.reduce((acc, client) => {
      const firstLetter = client.name.charAt(0).toUpperCase();
      if (!acc[firstLetter]) {
        acc[firstLetter] = [];
      }
      acc[firstLetter].push(client);
      return acc;
    }, {} as Record<string, ContractorClient[]>);

    // Sort the keys (letters) alphabetically
    const sortedKeys = Object.keys(grouped).sort();

    return sortedKeys.map((letter) => ({
      letter,
      clients: grouped[letter],
    }));
  };

  return (
    <>
      {loading ? (
        <LoadingState />
      ) : (
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className={classes.refreshButton}>
            <ActionIcon
              variant="light"
              onClick={handleRefresh}
              loading={refreshing || cacheLoading.clients || cacheLoading.projects}
              title="Refresh clients"
              size={40}
            >
              <IconRefresh size={24} />
            </ActionIcon>
          </div>
          <div className={classes.flexWrapper}>
            {clients && clients.length > 0 ? (
              <>
                <h1 style={{ color: 'var(--mantine-color-gray-1)' }}>Clients</h1>
              {getGroupedClients().map(({ letter, clients: letterClients }) => (
                <div key={letter} style={{ width: '85%', marginBottom: '2rem' }}>
                  <Title order={2} size="h3" mb="md" style={{ color: 'var(--mantine-color-gray-6)' }}>
                    {letter}
                  </Title>
                  {letterClients.map((client) => {
                    const clientJobs = getJobsForClient(client.id);
                    return (
                      <Card
                        key={client.id}
                        shadow="sm"
                        padding="lg"
                        radius="md"
                        withBorder
                        mb="lg"
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/clients/${client.id}`)}
                      >
                        <Group justify="space-between" mb="md">
                          <Text fw={600} size="lg">
                            {client.name}
                          </Text>
                          <Badge color="blue" variant="light">
                            {clientJobs.length} {clientJobs.length === 1 ? 'Job' : 'Jobs'}
                          </Badge>
                        </Group>

                        <Divider mb="md" />

                        <Flex direction="row" justify="space-between" gap="xl" wrap="wrap">
                          <Flex direction="column" gap="xs" style={{ flex: 1, minWidth: '250px' }}>
                            <Text size="sm" fw={500} mb={4}>
                              Contact Information
                            </Text>
                            <Text size="sm" c="dimmed">
                              <a href={`mailto:${client.email}`} onClick={(e) => e.stopPropagation()}>
                                {client.email}
                              </a>
                            </Text>
                            <Text size="sm" c="dimmed">
                              <a href={`tel:+1${client.phone_number}`} onClick={(e) => e.stopPropagation()}>
                                {client.phone_number}
                              </a>
                            </Text>
                          </Flex>

                          <Flex direction="column" gap="xs" style={{ flex: 1, minWidth: '250px' }}>
                            <Text size="sm" fw={500} mb={4}>
                              Address
                            </Text>
                            <Text size="sm" c="dimmed">
                              {formatAddress(client)}
                            </Text>
                            {client.address_country && (
                              <Text size="sm" c="dimmed">
                                {client.address_country}
                              </Text>
                            )}
                          </Flex>
                        </Flex>

                        {client.notes && (
                          <>
                            <Divider my="md" />
                            <Flex direction="column" gap="xs">
                              <Text size="sm" fw={500}>
                                Notes
                              </Text>
                              <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                                {client.notes}
                              </Text>
                            </Flex>
                          </>
                        )}

                        {clientJobs.length > 0 && (
                          <>
                            <Divider my="md" />
                            <Flex direction="column" gap="sm">
                              <Text size="sm" fw={500} mb={4}>
                                Recent Jobs
                              </Text>
                              {clientJobs.slice(0, 3).map((job) => (
                                <Paper
                                  key={job.id}
                                  shadow="xs"
                                  radius="md"
                                  p="md"
                                  withBorder
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/projects/${job.id}`);
                                  }}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <Flex direction="row" justify="space-between" align="center">
                                    <Flex direction="column" gap={4}>
                                      {job.title && (
                                        <Text size="sm" fw={500}>
                                          {job.title}
                                        </Text>
                                      )}
                                      {job.scheduled_date && (
                                        <Text size="xs" c="dimmed">
                                          Scheduled:{' '}
                                          {new Date(job.scheduled_date).toLocaleDateString()}
                                        </Text>
                                      )}
                                    </Flex>
                                    {job.status && (
                                      <Badge size="sm" variant="light">
                                        {job.status}
                                      </Badge>
                                    )}
                                  </Flex>
                                </Paper>
                              ))}
                              {clientJobs.length > 3 && (
                                <Text size="xs" c="dimmed" ta="center" mt="xs">
                                  +{clientJobs.length - 3} more jobs
                                </Text>
                              )}
                            </Flex>
                          </>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ))}
              </>
            ) : clients && clients.length === 0 ? (
              <div style={{ marginTop: '100px' }}>
                <Text size="lg" c="dimmed" ta="center">
                  No clients found. Start by adding your first client.
                </Text>
              </div>
            ) : (
              <div style={{ marginTop: '100px' }}>
                <UniversalError message="Unable to access list of clients" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

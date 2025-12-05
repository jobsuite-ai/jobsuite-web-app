'use client';

import { useMemo, useEffect, useState } from 'react';

import {
    ActionIcon,
    Badge,
    Card,
    Center,
    Flex,
    Group,
    Paper,
    ScrollArea,
    Text,
    Title,
    SegmentedControl,
    TextInput,
    MultiSelect,
    Button,
    Table,
    Stack,
    Box,
    Menu,
    Pill,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/dates/styles.css';
import { IconX, IconChevronDown, IconSearch, IconRefresh } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import LoadingState from '../Global/LoadingState';
import { Estimate, EstimateStatus } from '../Global/model';
import UniversalError from '../Global/UniversalError';
import { getEstimateBadgeColor, getFormattedEstimateStatus } from '../Global/utils';

import { useDataCache } from '@/contexts/DataCacheContext';

// Define column status groups and their order
const PROPOSAL_PIPELINE_STATUSES = [
    EstimateStatus.NEW_LEAD,
    EstimateStatus.ESTIMATE_NOT_SCHEDULED,
    EstimateStatus.ESTIMATE_SCHEDULED,
    EstimateStatus.ESTIMATE_IN_PROGRESS,
];

const SENT_PROPOSAL_STATUSES = [
    EstimateStatus.ESTIMATE_SENT,
    EstimateStatus.ESTIMATE_OPENED,
];

const ACCEPTED_STATUSES = [
    EstimateStatus.ESTIMATE_ACCEPTED,
    EstimateStatus.CONTRACTOR_OPENED,
];

// All statuses for filter dropdown
const ALL_STATUSES = Object.values(EstimateStatus);

export default function EstimatesList() {
    const { estimates: cachedEstimates, loading: cacheLoading, refreshData } = useDataCache();
    const [estimates, setEstimates] = useState(new Array<Estimate>());
    const [columnOneEstimates, setColumnOneEstimates] = useState(new Array<Estimate>());
    const [columnTwoEstimates, setColumnTwoEstimates] = useState(new Array<Estimate>());
    const [columnThreeEstimates, setColumnThreeEstimates] = useState(new Array<Estimate>());
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'main' | 'list'>('main');
    const [refreshing, setRefreshing] = useState(false);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [clientNameFilter, setClientNameFilter] = useState('');

    const router = useRouter();

    // Update estimates when cache data changes
    useEffect(() => {
        if (cachedEstimates.length > 0 || !cacheLoading.estimates) {
            setEstimates(cachedEstimates);
            setLoading(false);
        } else if (cacheLoading.estimates) {
            setLoading(true);
        }
    }, [cachedEstimates, cacheLoading.estimates]);

    useEffect(() => {
        // Sort jobs into columns based on status
        const sortedColumnOne = estimates
            .filter(estimate => PROPOSAL_PIPELINE_STATUSES.includes(estimate.status))
            .sort((a, b) => {
                // First sort by status order
                const statusDiff = PROPOSAL_PIPELINE_STATUSES.indexOf(a.status) -
                    PROPOSAL_PIPELINE_STATUSES.indexOf(b.status);
                if (statusDiff !== 0) return statusDiff;
                // Then sort by updated_at (newest first) within each status
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });

        const sortedColumnTwo = estimates
            .filter(estimate => SENT_PROPOSAL_STATUSES.includes(estimate.status))
            .sort((a, b) => {
                // First sort by status order
                const statusDiff = SENT_PROPOSAL_STATUSES.indexOf(a.status) -
                    SENT_PROPOSAL_STATUSES.indexOf(b.status);
                if (statusDiff !== 0) return statusDiff;
                // Then sort by updated_at (newest first) within each status
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });

        const sortedColumnThree = estimates
            .filter(estimate => ACCEPTED_STATUSES.includes(estimate.status))
            .sort((a, b) => {
                // First sort by status order
                const statusDiff = ACCEPTED_STATUSES.indexOf(a.status) -
                    ACCEPTED_STATUSES.indexOf(b.status);
                if (statusDiff !== 0) return statusDiff;
                // Then sort by updated_at (newest first) within each status
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            });

        setColumnOneEstimates(sortedColumnOne);
        setColumnTwoEstimates(sortedColumnTwo);
        setColumnThreeEstimates(sortedColumnThree);
    }, [estimates]);

    // Filter estimates for list view
    const filteredEstimates = useMemo(() => {
        let filtered = [...estimates];

        // Search query filter (title, client name, address)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(estimate => {
                const titleMatch = estimate.title?.toLowerCase().includes(query);
                const clientMatch = estimate.client_name?.toLowerCase().includes(query);
                const addressMatch =
                    estimate.address_street?.toLowerCase().includes(query) ||
                    estimate.address_city?.toLowerCase().includes(query) ||
                    estimate.address_state?.toLowerCase().includes(query) ||
                    estimate.address_zipcode?.toLowerCase().includes(query);
                return titleMatch || clientMatch || addressMatch;
            });
        }

        // Status filter
        if (selectedStatuses.length > 0) {
            filtered = filtered.filter(estimate =>
                selectedStatuses.includes(estimate.status)
            );
        }

        // Date range filter (using updated_at)
        if (dateRange[0]) {
            filtered = filtered.filter(estimate => {
                const estimateDate = new Date(estimate.updated_at);
                return estimateDate >= dateRange[0]!;
            });
        }
        if (dateRange[1]) {
            filtered = filtered.filter(estimate => {
                const estimateDate = new Date(estimate.updated_at);
                // Set to end of day
                const endDate = new Date(dateRange[1]!);
                endDate.setHours(23, 59, 59, 999);
                return estimateDate <= endDate;
            });
        }

        // Client name filter
        if (clientNameFilter.trim()) {
            const clientQuery = clientNameFilter.toLowerCase().trim();
            filtered = filtered.filter(estimate =>
                estimate.client_name?.toLowerCase().includes(clientQuery)
            );
        }

        // Sort by updated_at (newest first)
        return filtered.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }, [estimates, searchQuery, selectedStatuses, dateRange, clientNameFilter]);

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedStatuses([]);
        setDateRange([null, null]);
        setClientNameFilter('');
    };

    const removeStatusFilter = (status: string) => {
        setSelectedStatuses(prev => prev.filter(s => s !== status));
    };

    const removeDateRangeFilter = () => {
        setDateRange([null, null]);
    };

    const removeClientFilter = () => {
        setClientNameFilter('');
    };

    const formatDateRange = () => {
        if (!dateRange[0] && !dateRange[1]) return null;
        if (dateRange[0] && dateRange[1]) {
            return `${dateRange[0].toLocaleDateString()} - ${dateRange[1].toLocaleDateString()}`;
        }
        if (dateRange[0]) {
            return `From ${dateRange[0].toLocaleDateString()}`;
        }
        if (dateRange[1]) {
            return `Until ${dateRange[1].toLocaleDateString()}`;
        }
        return null;
    };

    const hasActiveFilters = searchQuery.trim() || selectedStatuses.length > 0 ||
        dateRange[0] || dateRange[1] || clientNameFilter.trim();

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshData('estimates');
        } finally {
            setRefreshing(false);
        }
    };

    // Helper function to render a job card
    const renderEstimateCard = (estimate: Estimate) => (
        <Card
          key={estimate.id}
          shadow="sm"
          padding="lg"
          radius="md"
          w="100%"
          withBorder
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey) {
              // Open in new tab
              window.open(`/proposals/${estimate.id}`, '_blank');
            } else {
              // Normal navigation
              router.push(`/proposals/${estimate.id}`);
            }
          }}
        >
            <Center>
                {estimate.estimate_type &&
                    <Text size="sm" fw={700}>{estimate.estimate_type}</Text>
                }
            </Center>
            {estimate.title && (
                <Text fw={600} size="md" mt="xs" mb="xs">{estimate.title}</Text>
            )}
            <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>{estimate.client_name || 'Unknown Client'}</Text>
                <Badge style={{ color: '#ffffff' }} color={getEstimateBadgeColor(estimate.status)}>
                    {getFormattedEstimateStatus(estimate.status)}
                </Badge>
            </Group>

            <Flex direction="column" align="flex-start">
                <Text size="sm" c="dimmed">{estimate.address_street}</Text>
                <Text size="sm" c="dimmed">{estimate.address_city}, {estimate.address_state}</Text>
                <Text size="sm" c="dimmed">{estimate.address_zipcode}</Text>
            </Flex>
        </Card>
    );

    // Helper function to render a column
    const renderColumn = (columnEstimates: Estimate[], title: string) => (
        <Paper
          bg="gray.0"
          p="md"
          radius="md"
          w="32%"
          h="calc(100vh - 110px)"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
            <Group gap="xs" w="100%" justify="center" mb="md">
                <Title order={5}>{title}</Title>
                <Badge size="lg" variant="light">{columnEstimates.length}</Badge>
            </Group>
            <ScrollArea style={{ flex: 1 }}>
                <Flex
                  direction="column"
                  gap="md"
                  justify="flex-start"
                  align="center"
                >
                    {columnEstimates.length > 0 ? (
                        columnEstimates.map(renderEstimateCard)
                    ) : (
                        <Card
                          shadow="sm"
                          padding="lg"
                          radius="md"
                          w="100%"
                          withBorder
                        >
                            <Text fw={500} ta="center">No estimates in this category</Text>
                        </Card>
                    )}
                </Flex>
            </ScrollArea>
        </Paper>
    );

    // Render list view with table
    const renderListView = () => (
        <Box p="md" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
            <Stack gap="md">
                {/* Filter Bar */}
                <Paper p="sm" withBorder>
                    <Flex direction="column" gap="sm">
                        {/* Top row: Search and filter buttons */}
                        <Group gap="xs" wrap="nowrap" align="flex-start">
                            <TextInput
                              placeholder="Search by title, client, or address..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.currentTarget.value)}
                              leftSection={<IconSearch size={16} />}
                              style={{ flex: 1, minWidth: 200 }}
                            />
                            <Menu shadow="md" width={250} position="bottom-end">
                                <Menu.Target>
                                    <Button
                                      variant={selectedStatuses.length > 0 ? 'filled' : 'default'}
                                      rightSection={<IconChevronDown size={14} />}
                                    >
                                        Status
                                        {selectedStatuses.length > 0 && ` (${selectedStatuses.length})`}
                                    </Button>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Box p="xs">
                                        <MultiSelect
                                          placeholder="Select statuses..."
                                          data={ALL_STATUSES.map(status => ({
                                              value: status,
                                              label: getFormattedEstimateStatus(status),
                                          }))}
                                          value={selectedStatuses}
                                          onChange={setSelectedStatuses}
                                          clearable
                                          searchable
                                        />
                                    </Box>
                                </Menu.Dropdown>
                            </Menu>
                            <Menu shadow="md" width={250} position="bottom-end">
                                <Menu.Target>
                                    <Button
                                      variant={clientNameFilter.trim() ? 'filled' : 'default'}
                                      rightSection={<IconChevronDown size={14} />}
                                    >
                                        Client
                                    </Button>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Box p="xs">
                                        <TextInput
                                          placeholder="Filter by client name..."
                                          value={clientNameFilter}
                                          onChange={(e) =>
                                              setClientNameFilter(e.currentTarget.value)
                                          }
                                        />
                                    </Box>
                                </Menu.Dropdown>
                            </Menu>
                            <Menu shadow="md" width={300} position="bottom-end">
                                <Menu.Target>
                                    <Button
                                      variant={dateRange[0] || dateRange[1] ? 'filled' : 'default'}
                                      rightSection={<IconChevronDown size={14} />}
                                    >
                                        Date Range
                                    </Button>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Box p="xs">
                                        <DatePickerInput
                                          type="range"
                                          placeholder="Pick date range"
                                          value={dateRange}
                                          onChange={setDateRange}
                                          clearable
                                        />
                                    </Box>
                                </Menu.Dropdown>
                            </Menu>
                            {hasActiveFilters && (
                                <Button
                                  variant="subtle"
                                  size="sm"
                                  onClick={clearFilters}
                                  leftSection={<IconX size={14} />}
                                >
                                    Clear
                                </Button>
                            )}
                        </Group>
                        {/* Active filters row */}
                        {hasActiveFilters && (
                            <Group gap="xs" wrap="wrap">
                                {searchQuery.trim() && (
                                    <Pill
                                      withRemoveButton
                                      onRemove={() => setSearchQuery('')}
                                    >
                                        Search: {searchQuery}
                                    </Pill>
                                )}
                                {selectedStatuses.map(status => (
                                    <Pill
                                      key={status}
                                      withRemoveButton
                                      onRemove={() => removeStatusFilter(status)}
                                    >
                                        Status ={' '}
                                        {getFormattedEstimateStatus(status as EstimateStatus)}
                                    </Pill>
                                ))}
                                {clientNameFilter.trim() && (
                                    <Pill
                                      withRemoveButton
                                      onRemove={removeClientFilter}
                                    >
                                        Client = {clientNameFilter}
                                    </Pill>
                                )}
                                {formatDateRange() && (
                                    <Pill
                                      withRemoveButton
                                      onRemove={removeDateRangeFilter}
                                    >
                                        Date Range = {formatDateRange()}
                                    </Pill>
                                )}
                            </Group>
                        )}
                    </Flex>
                </Paper>

                {/* Results count */}
                <Text size="sm" c="dimmed">
                    Showing {filteredEstimates.length} of {estimates.length} estimates
                </Text>

                {/* Table */}
                <Paper withBorder>
                    <ScrollArea>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Title</Table.Th>
                                    <Table.Th>Client</Table.Th>
                                    <Table.Th>Address</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Type</Table.Th>
                                    <Table.Th>Updated</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filteredEstimates.length > 0 ? (
                                    filteredEstimates.map((estimate) => (
                                        <Table.Tr
                                          key={estimate.id}
                                          style={{ cursor: 'pointer' }}
                                          onClick={(e) => {
                                              if (e.metaKey || e.ctrlKey) {
                                                  window.open(`/proposals/${estimate.id}`, '_blank');
                                              } else {
                                                  router.push(`/proposals/${estimate.id}`);
                                              }
                                          }}
                                        >
                                            <Table.Td>
                                                <Text fw={500} lineClamp={1}>
                                                    {estimate.title || `Estimate #${estimate.id.slice(0, 8)}`}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text lineClamp={1}>
                                                    {estimate.client_name || 'Unknown Client'}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" c="dimmed" lineClamp={1}>
                                                    {estimate.address_street && (
                                                        <>
                                                            {estimate.address_street}
                                                            {estimate.address_city && ', '}
                                                        </>
                                                    )}
                                                    {estimate.address_city}
                                                    {estimate.address_state && `, ${estimate.address_state}`}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge
                                                  color={getEstimateBadgeColor(estimate.status)}
                                                  style={{ color: '#ffffff' }}
                                                >
                                                    {getFormattedEstimateStatus(estimate.status)}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" c="dimmed">
                                                    {estimate.estimate_type || '-'}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" c="dimmed">
                                                    {new Date(estimate.updated_at)
                                                        .toLocaleDateString()}
                                                </Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))
                                ) : (
                                    <Table.Tr>
                                        <Table.Td colSpan={6}>
                                            <Center py="xl">
                                                <Text c="dimmed">No estimates found</Text>
                                            </Center>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                </Paper>
            </Stack>
        </Box>
    );

    return (
        <>
            {loading ? (
                <LoadingState />
            ) : (
                <Stack gap="md" p="md">
                    {/* View Toggle */}
                    <Group justify="space-between" px="md">
                        <Title order={3} c="gray.0">Proposals</Title>
                        <Group gap="xs">
                            <SegmentedControl
                              value={viewMode}
                              onChange={(value) => setViewMode(value as 'main' | 'list')}
                              data={[
                                  { label: 'Main', value: 'main' },
                                  { label: 'List', value: 'list' },
                              ]}
                            />
                            <ActionIcon
                              variant="light"
                              onClick={handleRefresh}
                              loading={refreshing || cacheLoading.estimates}
                              title="Refresh proposals"
                              ml="sm"
                              size={40}
                            >
                                <IconRefresh size={24} />
                            </ActionIcon>
                        </Group>
                    </Group>

                    {viewMode === 'main' ? (
                        <div style={{
                            overflow: 'hidden',
                            padding: '20px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'flex-start',
                        }}>
                            {estimates ? (
                                <Flex
                                  direction="row"
                                  justify="center"
                                  align="flex-start"
                                  w="95%"
                                  gap="xl"
                                >
                                    {renderColumn(columnOneEstimates, 'In Progress')}
                                    {renderColumn(columnTwoEstimates, 'Sent to Client')}
                                    {renderColumn(columnThreeEstimates, 'Client Accepted')}
                                </Flex>
                            ) : (
                                <div style={{ marginTop: '100px' }}>
                                    <UniversalError message="Unable to access list of estimates" />
                                </div>
                            )}
                        </div>
                    ) : (
                        renderListView()
                    )}
                </Stack>
            )}
        </>
    );
}

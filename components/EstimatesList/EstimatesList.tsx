'use client';

import { useMemo, useEffect, useState, useRef } from 'react';

import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Center,
    Flex,
    Group,
    Menu,
    Modal,
    MultiSelect,
    Paper,
    Pill,
    ScrollArea,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
    SegmentedControl,
    Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/dates/styles.css';
import { notifications } from '@mantine/notifications';
import { IconX, IconChevronDown, IconSearch, IconRefresh, IconMessageCircle } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import classes from './EstimatesList.module.css';
import LoadingState from '../Global/LoadingState';
import { Estimate, EstimateStatus } from '../Global/model';
import UniversalError from '../Global/UniversalError';
import { getEstimateBadgeColor, getFormattedEstimateStatus } from '../Global/utils';

import { useDataCache } from '@/contexts/DataCacheContext';
import { useAppSelector } from '@/store/hooks';
import { selectEstimatesLastFetched } from '@/store/slices/estimatesSlice';

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
    EstimateStatus.NEEDS_FOLLOW_UP,
];

const ACCEPTED_STATUSES = [
    EstimateStatus.ESTIMATE_ACCEPTED,
    EstimateStatus.CONTRACTOR_OPENED,
    EstimateStatus.CONTRACTOR_SIGNED,
];

// All statuses for filter dropdown
const ALL_STATUSES = Object.values(EstimateStatus);

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function countOver30DaysInColumn(columnEstimates: Estimate[]): number {
    const now = Date.now();
    return columnEstimates.filter((e) => {
        if (e.days_in_column != null && typeof e.days_in_column === 'number') {
            return e.days_in_column > 30;
        }
        if (e.column_entered_at) {
            return (now - new Date(e.column_entered_at).getTime()) > THIRTY_DAYS_MS;
        }
        return false;
    }).length;
}

export default function EstimatesList() {
    const {
        estimates: cachedEstimates,
        clients,
        loading: cacheLoading,
        errors: cacheErrors,
        refreshData,
        invalidateCache,
    } = useDataCache();
    const [estimates, setEstimates] = useState(new Array<Estimate>());
    const [columnOneEstimates, setColumnOneEstimates] = useState(new Array<Estimate>());
    const [columnTwoEstimates, setColumnTwoEstimates] = useState(new Array<Estimate>());
    const [columnThreeEstimates, setColumnThreeEstimates] = useState(new Array<Estimate>());
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'main' | 'list'>('main');
    const [refreshing, setRefreshing] = useState(false);
    const hasAttemptedAutoRefreshRef = useRef(false);
    const lastEstimatesErrorRef = useRef<string | null>(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [clientNameFilter, setClientNameFilter] = useState('');
    const [markingFollowUpId, setMarkingFollowUpId] = useState<string | null>(null);
    const [followUpModalEstimate, setFollowUpModalEstimate] = useState<Estimate | null>(null);
    const [followUpDate, setFollowUpDate] = useState<Date | null>(null);
    const lastFetched = useAppSelector(selectEstimatesLastFetched);

    const router = useRouter();
    const clientNameById = useMemo(
        () => new Map(clients.map((client) => [client.id, client.name])),
        [clients]
    );

    // Update estimates when cache data changes
    useEffect(() => {
        if (cachedEstimates.length > 0 || !cacheLoading.estimates) {
            setEstimates(cachedEstimates);
            setLoading(false);
        } else if (cacheLoading.estimates) {
            setLoading(true);
        }
    }, [cachedEstimates, cacheLoading.estimates]);

    // Auto-refresh if data is empty after initial load (e.g., after login or cache expired)
    // Only runs once per mount to prevent infinite loops
    useEffect(() => {
        // Only auto-refresh if:
        // 1. Not currently loading
        // 2. Data is empty
        // 3. We have an access token (user is logged in)
        // 4. We haven't already attempted an auto-refresh
        const accessToken = typeof window !== 'undefined'
            ? localStorage.getItem('access_token')
            : null;
        const shouldRefresh =
            !cacheLoading.estimates &&
            estimates.length === 0 &&
            accessToken &&
            !hasAttemptedAutoRefreshRef.current &&
            !lastFetched;
        if (shouldRefresh) {
            // Small delay to avoid race conditions with initial cache load
            const timeoutId = setTimeout(() => {
                const stillEmpty =
                    estimates.length === 0 &&
                    !cacheLoading.estimates &&
                    !hasAttemptedAutoRefreshRef.current;
                if (stillEmpty) {
                    hasAttemptedAutoRefreshRef.current = true;
                    // Don't call invalidateCache - it clears state and causes loops
                    // Just refresh the data
                    refreshData('estimates', true);
                }
            }, 1000); // Increased delay to let DataCacheContext finish initial load
            return () => clearTimeout(timeoutId);
        }
        return undefined;
    }, [estimates.length, cacheLoading.estimates, refreshData]);

    useEffect(() => {
        if (cacheErrors.estimates && cacheErrors.estimates !== lastEstimatesErrorRef.current) {
            lastEstimatesErrorRef.current = cacheErrors.estimates;
            notifications.show({
                title: 'Estimate request failed',
                message: cacheErrors.estimates,
                color: 'red',
                position: 'bottom-right',
                autoClose: 5000,
            });
        }
        if (!cacheErrors.estimates) {
            lastEstimatesErrorRef.current = null;
        }
    }, [cacheErrors.estimates]);

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

        const now = new Date();
        const isSnoozed = (e: Estimate) =>
            e.needs_follow_up === true &&
            e.needs_follow_up_at != null &&
            new Date(e.needs_follow_up_at) > now;
        const sortedColumnTwo = estimates
            .filter(estimate => SENT_PROPOSAL_STATUSES.includes(estimate.status))
            .filter(estimate => !isSnoozed(estimate))
            .sort((a, b) => {
                // Resurfacing: needs_follow_up && needs_follow_up_at due first
                const aDue = a.needs_follow_up && a.needs_follow_up_at
                    && new Date(a.needs_follow_up_at) <= now;
                const bDue = b.needs_follow_up && b.needs_follow_up_at
                    && new Date(b.needs_follow_up_at) <= now;
                if (aDue && !bDue) return -1;
                if (!aDue && bDue) return 1;
                // Then by status order
                const statusDiff = SENT_PROPOSAL_STATUSES.indexOf(a.status) -
                    SENT_PROPOSAL_STATUSES.indexOf(b.status);
                if (statusDiff !== 0) return statusDiff;
                // Then by column_entered_at (oldest first) or updated_at
                const aEntered = a.column_entered_at
                    ? new Date(a.column_entered_at).getTime()
                    : new Date(a.updated_at).getTime();
                const bEntered = b.column_entered_at
                    ? new Date(b.column_entered_at).getTime()
                    : new Date(b.updated_at).getTime();
                return aEntered - bEntered;
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
        const now = new Date();
        const isSnoozed = (e: Estimate) =>
            e.needs_follow_up === true &&
            e.needs_follow_up_at != null &&
            new Date(e.needs_follow_up_at) > now;
        let filtered = estimates.filter(e => !isSnoozed(e));

        // Search query filter (title, client name, address)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(estimate => {
                const titleMatch = estimate.title?.toLowerCase().includes(query);
                const resolvedClientName =
                    estimate.client_name || clientNameById.get(estimate.client_id) || '';
                const clientMatch = resolvedClientName.toLowerCase().includes(query);
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
            filtered = filtered.filter(estimate => {
                const resolvedClientName =
                    estimate.client_name || clientNameById.get(estimate.client_id) || '';
                return resolvedClientName.toLowerCase().includes(clientQuery);
            });
        }

        // Sort by updated_at (newest first)
        return filtered.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }, [estimates, searchQuery, selectedStatuses, dateRange, clientNameFilter, clientNameById]);

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
            invalidateCache('estimates');
            await refreshData('estimates', true);
        } finally {
            setRefreshing(false);
        }
    };

    const handleMarkNeedsFollowUp = async (
        estimateId: string,
        e: React.MouseEvent,
        needsFollowUpAt?: Date | null
    ) => {
        e?.stopPropagation?.();
        const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        if (!accessToken) return;
        setMarkingFollowUpId(estimateId);
        try {
            const body: { needs_follow_up_at?: string } = {};
            if (needsFollowUpAt) {
                body.needs_follow_up_at = needsFollowUpAt.toISOString();
            }
            const res = await fetch(
                `/api/estimates/${estimateId}/mark-needs-follow-up`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify(body),
                }
            );
            if (res.ok) {
                setFollowUpModalEstimate(null);
                setFollowUpDate(null);
                invalidateCache('estimates');
                await refreshData('estimates', true);
            } else {
                const err = await res.json().catch(() => ({}));
                notifications.show({
                    title: 'Failed to set check-in date',
                    message: err?.detail || res.statusText,
                    color: 'red',
                    position: 'bottom-right',
                });
            }
        } finally {
            setMarkingFollowUpId(null);
        }
    };

    const openMarkFollowUpModal = (estimate: Estimate, e: React.MouseEvent) => {
        e.stopPropagation();
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 3);
        setFollowUpDate(defaultDate);
        setFollowUpModalEstimate(estimate);
    };

    const handleMarkFollowUpModalConfirm = (e: React.MouseEvent) => {
        if (!followUpModalEstimate) return;
        handleMarkNeedsFollowUp(
            followUpModalEstimate.id,
            e,
            followUpDate ?? undefined
        );
    };

    // Helper function to render a job card
    const renderEstimateCard = (estimate: Estimate) => {
        const resolvedClientName =
            estimate.client_name || clientNameById.get(estimate.client_id);
        const daysInCol = estimate.days_in_column ?? null;
        const showDaysBadge = typeof daysInCol === 'number';
        const isStale = showDaysBadge && daysInCol > 20;
        const isTerminal = estimate.is_terminal === true;
        const canMarkFollowUp = !isTerminal && showDaysBadge && daysInCol > 20;
        return (
        <Card
          key={estimate.id}
          shadow="sm"
          padding="lg"
          radius="md"
          w="100%"
          withBorder
          className={classes.estimateCard}
          style={{ cursor: 'pointer', minHeight: 44 }}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey) {
              window.open(`/proposals/${estimate.id}`, '_blank');
            } else {
              router.push(`/proposals/${estimate.id}`);
            }
          }}
        >
            {canMarkFollowUp && (
                <Box mb="xs" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="light"
                      fullWidth
                      leftSection={<IconMessageCircle size={16} />}
                      loading={markingFollowUpId === estimate.id}
                      onClick={(e) => openMarkFollowUpModal(estimate, e)}
                    >
                        Set check-in date
                    </Button>
                </Box>
            )}
            <Group justify="space-between" align="center" mb="xs">
                {estimate.estimate_type ? (
                    <Text size="sm" fw={700}>{estimate.estimate_type}</Text>
                ) : (
                    <Box />
                )}
                {showDaysBadge && (
                    <Badge
                      color={isStale ? 'red' : 'gray'}
                      size="sm"
                      title="Days in current status"
                      variant="light"
                    >
                        {daysInCol} days in column
                    </Badge>
                )}
            </Group>
            {estimate.title && (
                <Text fw={600} size="md" mt="xs" mb="xs">{estimate.title}</Text>
            )}
            <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500}>{resolvedClientName || 'Unknown Client'}</Text>
                <Group gap="xs">
                    {estimate.needs_follow_up && (
                        <Badge size="sm" variant="light" color="orange" title="Resurface for follow-up on this date">
                            {estimate.needs_follow_up_at
                                ? `Follow-up ${new Date(estimate.needs_follow_up_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                                : 'Needs follow-up'}
                        </Badge>
                    )}
                    <Badge style={{ color: '#ffffff' }} color={getEstimateBadgeColor(estimate.status)}>
                        {getFormattedEstimateStatus(estimate.status)}
                    </Badge>
                </Group>
            </Group>
            <Flex direction="column" align="flex-start" gap="xs">
                {(() => {
                    const street = estimate.address_street ? String(estimate.address_street).trim() : '';
                    const city = estimate.address_city ? String(estimate.address_city).trim() : '';
                    const state = estimate.address_state ? String(estimate.address_state).trim() : '';
                    const zipcodeRaw = estimate.address_zipcode ? String(estimate.address_zipcode).trim() : '';
                    const zipcode = zipcodeRaw && zipcodeRaw !== '0' ? zipcodeRaw : '';

                    return (
                        <>
                            {street && <Text size="sm" c="dimmed">{street}</Text>}
                            {(city || state) && (
                                <Text size="sm" c="dimmed">
                                    {[city, state].filter(Boolean).join(', ')}
                                </Text>
                            )}
                            {zipcode && <Text size="sm" c="dimmed">{zipcode}</Text>}
                        </>
                    );
                })()}
                {(() => {
                    const rawHours = estimate.estimate_hours ?? estimate.hours_bid;
                    const hoursValue =
                        typeof rawHours === 'string' ? Number(rawHours) : rawHours;
                    const shouldShowHours =
                        typeof hoursValue === 'number' &&
                        Number.isFinite(hoursValue) &&
                        hoursValue > 0;
                    return shouldShowHours ? (
                        <Text size="sm" c="dimmed" mt="xs">
                            Hours: {hoursValue}
                        </Text>
                    ) : null;
                })()}
                {estimate.sent_date && (
                    <Text size="sm" c="dimmed">
                        Sent: {new Date(estimate.sent_date).toLocaleDateString()}
                    </Text>
                )}
                {(estimate.follow_up_count != null && estimate.follow_up_count > 0) && (
                    <Text size="sm" c="dimmed">Reach-outs: {estimate.follow_up_count}</Text>
                )}
                {estimate.next_follow_up_at && (
                    <Text size="sm" c="dimmed">Next follow-up: {new Date(estimate.next_follow_up_at).toLocaleDateString()}</Text>
                )}
            </Flex>
        </Card>
        );
    };

    // Helper function to render a column
    const renderColumn = (
        columnEstimates: Estimate[],
        title: string,
        isLoading: boolean
    ) => {
        const over30Count = countOver30DaysInColumn(columnEstimates);
        return (
        <Paper
          bg="gray.0"
          p="md"
          radius="md"
          w={{ base: '100%', md: '32%' }}
          h={{ base: 'auto', md: 'calc(100vh - 110px)' }}
          style={{ display: 'flex', flexDirection: 'column' }}
          className={classes.estimatesColumn}
        >
            <Group gap="xs" w="100%" justify="center" mb="md">
                <Title order={5}>{title}</Title>
                <Badge size="lg" variant="light">{columnEstimates.length}</Badge>
                {over30Count > 0 && (
                    <Tooltip
                      label="Number of estimates that have been in this column for over 30 days"
                      withArrow
                      withinPortal
                    >
                        <Badge size="lg" color="red" variant="light" style={{ cursor: 'pointer' }}>
                            {over30Count}
                        </Badge>
                    </Tooltip>
                )}
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
                            <Text fw={500} ta="center" c="dimmed">
                                {isLoading ? 'Loading…' : 'No estimates in this category'}
                            </Text>
                        </Card>
                    )}
                </Flex>
            </ScrollArea>
        </Paper>
        );
    };

    // Render list view with table
    const renderListView = () => (
        <Box p="md" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
            <Stack gap="md">
                {/* Filter Bar */}
                <Paper p="sm" withBorder className={classes.filterBar}>
                    <Flex direction="column" gap="sm">
                        {/* Top row: Search and filter buttons */}
                        <Group gap="xs" wrap="wrap" align="flex-start" className={classes.filterButtonsGroup}>
                            <TextInput
                              placeholder="Search by title, client, or address..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.currentTarget.value)}
                              leftSection={<IconSearch size={16} />}
                              className={classes.searchInput}
                              style={{ flex: 1 }}
                            />
                            <Menu shadow="md" width={250} position="bottom-end">
                                <Menu.Target>
                                    <Button
                                      variant={selectedStatuses.length > 0 ? 'filled' : 'default'}
                                      rightSection={<IconChevronDown size={14} />}
                                      className={classes.filterButton}
                                      style={{ minWidth: 120 }}
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
                                      className={classes.filterButton}
                                      style={{ minWidth: 120 }}
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
                                      className={classes.filterButton}
                                      style={{ minWidth: 120 }}
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
                    <ScrollArea className={classes.tableContainer}>
                        <Table striped highlightOnHover className={classes.responsiveTable}>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Title</Table.Th>
                                    <Table.Th>Client</Table.Th>
                                    <Table.Th>Address</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Days</Table.Th>
                                    <Table.Th>Type</Table.Th>
                                    <Table.Th>Updated</Table.Th>
                                    <Table.Th></Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filteredEstimates.length > 0 ? (
                                    filteredEstimates.map((estimate) => {
                                        const daysInCol = estimate.days_in_column ?? null;
                                        const showDays = typeof daysInCol === 'number';
                                        const isStale = showDays && daysInCol > 20;
                                        const isTerminal = estimate.is_terminal === true;
                                        const canMark = !isTerminal && showDays && daysInCol > 20;
                                        return (
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
                                                    {estimate.client_name ||
                                                        clientNameById.get(estimate.client_id) ||
                                                        'Unknown Client'}
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
                                                {showDays ? (
                                                    <Badge color={isStale ? 'red' : 'gray'} size="sm">
                                                        {daysInCol}d
                                                    </Badge>
                                                ) : (
                                                    <Text size="sm" c="dimmed">-</Text>
                                                )}
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
                                            <Table.Td onClick={(e) => e.stopPropagation()}>
                                                {canMark && (
                                                    <Button
                                                      size="xs"
                                                      variant="light"
                                                      loading={markingFollowUpId === estimate.id}
                                                      onClick={(e) =>
                                                          openMarkFollowUpModal(estimate, e)
                                                      }
                                                    >
                                                        Set check-in date
                                                    </Button>
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                        );
                                    })
                                ) : (
                                    <Table.Tr>
                                        <Table.Td colSpan={8}>
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
                    <Group justify="space-between" px="md" className={classes.headerGroup} wrap="wrap">
                        <Title order={3} c="gray.0">Proposals</Title>
                        <Group gap="xs" className={classes.viewToggleGroup}>
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
                                  direction={{ base: 'column', md: 'row' }}
                                  justify="center"
                                  align="flex-start"
                                  w={{ base: '100%', md: '95%' }}
                                  gap="xl"
                                >
                                    {renderColumn(
                                        columnOneEstimates,
                                        'In Progress',
                                        cacheLoading.estimates
                                    )}
                                    {renderColumn(
                                        columnTwoEstimates,
                                        'Sent to Client',
                                        cacheLoading.estimates
                                    )}
                                    {renderColumn(
                                        columnThreeEstimates,
                                        'Client Accepted',
                                        cacheLoading.estimates
                                    )}
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

            <Modal
              title="Set check-in date"
              opened={!!followUpModalEstimate}
              centered
              onClose={() => {
                setFollowUpModalEstimate(null);
                setFollowUpDate(null);
              }}
            >
              <Stack gap="md">
                {followUpModalEstimate && (
                  <Text size="sm" c="dimmed">
                    {followUpModalEstimate.title
                      || `Estimate #${followUpModalEstimate.id.slice(0, 8)}`}
                  </Text>
                )}
                <DatePickerInput
                  label="Check-in date"
                  placeholder="Pick date"
                  value={followUpDate}
                  onChange={setFollowUpDate}
                  minDate={new Date()}
                />
                <Group justify="flex-end" gap="xs">
                  <Button
                    variant="default"
                    onClick={() => {
                      setFollowUpModalEstimate(null);
                      setFollowUpDate(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="filled"
                    leftSection={<IconMessageCircle size={14} />}
                    loading={
                      followUpModalEstimate
                        ? markingFollowUpId === followUpModalEstimate.id
                        : false
                    }
                    onClick={handleMarkFollowUpModalConfirm}
                    disabled={!followUpDate}
                  >
                    Set check-in date
                  </Button>
                </Group>
              </Stack>
            </Modal>
        </>
    );
}

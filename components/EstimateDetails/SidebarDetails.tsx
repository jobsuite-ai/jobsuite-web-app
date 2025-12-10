'use client';

import { useEffect, useRef, useState } from 'react';

import { ActionIcon, Badge, Flex, Menu, Paper, Select, Skeleton, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/dates/styles.css';
import { IconCheck, IconChevronDown, IconX } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import EditableField from './EditableField';
import { ContractorClient, Estimate, EstimateStatus, EstimateType } from '../Global/model';
import { formatPhoneNumber, getEstimateBadgeColor, getFormattedEstimateStatus } from '../Global/utils';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';
import { useDataCache } from '@/contexts/DataCacheContext';
import { useUsers } from '@/hooks/useUsers';
import { logToCloudWatch } from '@/public/logger';

interface SidebarDetailsProps {
  estimate: Estimate;
  estimateID: string;
  onUpdate: () => void;
}

export default function SidebarDetails({ estimate, estimateID, onUpdate }: SidebarDetailsProps) {
  const [client, setClient] = useState<ContractorClient>();
  const [menuOpened, setMenuOpened] = useState(false);
  const { users, loading: loadingUsers } = useUsers();
  const [editingOwner, setEditingOwner] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(
    estimate.owned_by || estimate.created_by || null
  );
  const [savingOwner, setSavingOwner] = useState(false);
  const [editingJobType, setEditingJobType] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState<string | null>(
    estimate.estimate_type || null
  );
  const [savingJobType, setSavingJobType] = useState(false);
  const [editingTentativeDate, setEditingTentativeDate] = useState(false);
  const [selectedTentativeDate, setSelectedTentativeDate] = useState<Date | null>(
    estimate.tentative_scheduling_date ? new Date(estimate.tentative_scheduling_date) : null
  );
  const [savingTentativeDate, setSavingTentativeDate] = useState(false);
  // Local state for optimistic status updates
  const [currentStatus, setCurrentStatus] = useState<EstimateStatus>(estimate.status);
  const router = useRouter();
  const fetchedClientIdRef = useRef<string | null>(null);
  const { refreshData } = useDataCache();

  useEffect(() => {
    const loadClientDetails = async () => {
      if (!estimate?.client_id) {
        return;
      }

      // Don't fetch if we've already fetched this client
      if (fetchedClientIdRef.current === estimate.client_id) {
        return;
      }

      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        return;
      }

      try {
        const response = await fetch(`/api/clients/${estimate.client_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          // eslint-disable-next-line no-console
          console.error('Failed to load client details:', response.status);
          return;
        }

        const data = await response.json();
        const clientData = data.Item || data;
        setClient(clientData as ContractorClient);
        fetchedClientIdRef.current = estimate.client_id;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading client details:', error);
      }
    };

    loadClientDetails();
  }, [estimate?.client_id]);

  // Sync selectedOwnerId when estimate changes (but not when editing)
  useEffect(() => {
    if (!editingOwner) {
      setSelectedOwnerId(estimate.owned_by || estimate.created_by || null);
    }
  }, [estimate.owned_by, estimate.created_by, editingOwner]);

  // Sync selectedJobType when estimate changes (but not when editing)
  useEffect(() => {
    if (!editingJobType) {
      setSelectedJobType(estimate.estimate_type || null);
    }
  }, [estimate.estimate_type, editingJobType]);

  // Sync currentStatus when estimate prop changes
  useEffect(() => {
    setCurrentStatus(estimate.status);
  }, [estimate.status]);

  // Sync selectedTentativeDate when estimate changes (but not when editing)
  useEffect(() => {
    if (!editingTentativeDate) {
      setSelectedTentativeDate(
        estimate.tentative_scheduling_date ? new Date(estimate.tentative_scheduling_date) : null
      );
    }
  }, [estimate.tentative_scheduling_date, editingTentativeDate]);

  const updateEstimateStatus = async (status: EstimateStatus) => {
    await logToCloudWatch(`Attempting to update estimate: ${estimate.id} to status: ${status}`);

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        // eslint-disable-next-line no-console
        console.error('No access token found');
        return;
      }

      const response = await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update estimate status');
      }

      await response.json();

      // Optimistically update the status immediately
      setCurrentStatus(status);
      setMenuOpened(false);

      if (status === EstimateStatus.CONTRACTOR_SIGNED && client) {
        const jiraResponse = await fetch('/api/jira', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ job: estimate, client }),
        });

        if (!jiraResponse.ok) {
          throw new Error('Failed to create JIRA ticket');
        }
      }

      // Refresh cache after status update
      await refreshData('estimates');
      await refreshData('projects');

      onUpdate();
    } catch (error) {
      logToCloudWatch(`Failed to update estimate status: ${error}`);
    }
  };

  const updateClientAddress = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        address_street: value,
        address_city: estimate.address_city || estimate.city || '',
        address_zipcode: estimate.address_zipcode || estimate.zip_code || '',
      }),
    });

    onUpdate();
  };

  const updateCity = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        address_city: value,
        address_zipcode: estimate.address_zipcode || estimate.zip_code || '',
        address_street: estimate.address_street || estimate.client_address || '',
      }),
    });

    onUpdate();
  };

  const updateZipCode = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        address_city: estimate.address_city || estimate.city || '',
        address_zipcode: value,
        address_street: estimate.address_street || estimate.client_address || '',
      }),
    });

    onUpdate();
  };

  const updateDiscountReason = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ discount_reason: value || null }),
    });

    onUpdate();
  };

  const updateDiscountPercentage = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    const discountPercentage = value ? parseFloat(value) : null;
    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ discount_percentage: discountPercentage }),
    });

    onUpdate();
  };

  const updatePaintDetails = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    const content: UpdateJobContent = {
      update_paint_details: {
        keep_same_colors: (estimate as any).keep_same_colors || false,
        has_existing_paint: (estimate as any).has_existing_paint || false,
        paint_details: value,
      },
    };

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(content),
    });

    onUpdate();
  };

  const updateCrewLead = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ project_crew_lead: value || null }),
    });

    onUpdate();
  };

  const updateActualHours = async (value: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.error('No access token found');
      return;
    }

    // Handle empty string or invalid input
    const trimmedValue = value?.trim();
    const actualHours = trimmedValue ? parseFloat(trimmedValue) : 0;

    // If parseFloat returns NaN, default to 0
    const finalHours = Number.isNaN(actualHours) ? 0 : actualHours;
    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ actual_hours: finalHours }),
    });

    onUpdate();
  };

  const updateTentativeSchedulingDate = async (date: Date | null) => {
    if (savingTentativeDate) return;
    setSavingTentativeDate(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        // eslint-disable-next-line no-console
        console.error('No access token found');
        setSavingTentativeDate(false);
        return;
      }

      await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tentative_scheduling_date: date ? date.toISOString() : null,
        }),
      });

      setEditingTentativeDate(false);
      onUpdate();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update tentative scheduling date:', error);
    } finally {
      setSavingTentativeDate(false);
    }
  };

  const handleTentativeDateClick = () => {
    setEditingTentativeDate(true);
    setSelectedTentativeDate(
      estimate.tentative_scheduling_date ? new Date(estimate.tentative_scheduling_date) : null
    );
  };

  const handleTentativeDateCancel = () => {
    setSelectedTentativeDate(
      estimate.tentative_scheduling_date ? new Date(estimate.tentative_scheduling_date) : null
    );
    setEditingTentativeDate(false);
  };

  const updateOwnedBy = async (userId: string | null) => {
    if (savingOwner) return;
    setSavingOwner(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        // eslint-disable-next-line no-console
        console.error('No access token found');
        setSavingOwner(false);
        return;
      }

      await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ owned_by: userId || null }),
      });

      setEditingOwner(false);
      onUpdate();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update owner:', error);
    } finally {
      setSavingOwner(false);
    }
  };

  const handleOwnerClick = () => {
    setEditingOwner(true);
    setSelectedOwnerId(estimate.owned_by || estimate.created_by || null);
  };

  const handleOwnerCancel = () => {
    setSelectedOwnerId(estimate.owned_by || estimate.created_by || null);
    setEditingOwner(false);
  };

  const getOwnerDisplayName = (): string => {
    const ownerId = estimate.owned_by || estimate.created_by || null;
    if (!ownerId) return '—';
    const owner = users.find((u) => u.id === ownerId);
    return owner ? owner.full_name || owner.email : '—';
  };

  const updateJobType = async (value: string | null) => {
    if (savingJobType) return;
    setSavingJobType(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        // eslint-disable-next-line no-console
        console.error('No access token found');
        setSavingJobType(false);
        return;
      }

      // Map "Full House" to "BOTH" for backend
      const backendValue = value === 'Full House' ? EstimateType.BOTH : value;

      await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ estimate_type: backendValue || null }),
      });

      setEditingJobType(false);
      onUpdate();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to update job type:', error);
    } finally {
      setSavingJobType(false);
    }
  };

  const handleJobTypeClick = () => {
    setEditingJobType(true);
    // Normalize BOTH to 'Full House' for the Select component
    const normalizedType =
      estimate.estimate_type === EstimateType.BOTH || estimate.estimate_type === 'BOTH'
        ? 'Full House'
        : estimate.estimate_type || null;
    setSelectedJobType(normalizedType);
  };

  const handleJobTypeCancel = () => {
    // Reset to original estimate type (normalized for display)
    const normalizedType =
      estimate.estimate_type === EstimateType.BOTH || estimate.estimate_type === 'BOTH'
        ? 'Full House'
        : estimate.estimate_type || null;
    setSelectedJobType(normalizedType);
    setEditingJobType(false);
  };

  const getJobTypeDisplayName = (): string => {
    const jobType = estimate.estimate_type;
    if (!jobType) return '—';
    // Map "BOTH" to "Full House" for display
    if (jobType === EstimateType.BOTH || jobType === 'BOTH') {
      return 'Full House';
    }
    if (jobType === EstimateType.INTERIOR || jobType === 'INTERIOR') {
      return 'Interior';
    }
    if (jobType === EstimateType.EXTERIOR || jobType === 'EXTERIOR') {
      return 'Exterior';
    }
    return jobType;
  };

  const statusOptions = Object.values(EstimateStatus).filter(
    (status) => status !== currentStatus
  );

  const statusDropdownOptions = statusOptions.map((status) => (
    <Menu.Item key={status} onClick={() => updateEstimateStatus(status)}>
      {getFormattedEstimateStatus(status)}
    </Menu.Item>
  ));

  return (
    <Paper shadow="sm" radius="md" withBorder p="lg">
      <Flex direction="column" gap="md">
        {/* Status */}
        <div>
          <Flex align="center" gap="sm" mb="xs">
            <Text size="sm" fw={500} c="dimmed">
              Status:
            </Text>
            <Flex justify="flex-end" align="center" gap="xs" style={{ width: '100%' }}>
              {!client ? (
                <Skeleton height={24} width={120} />
              ) : (
                <Menu opened={menuOpened} onChange={setMenuOpened} width={200} position="bottom-end">
                  <Menu.Target>
                    <Badge
                      style={{
                        color: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                      color={getEstimateBadgeColor(currentStatus)}
                      rightSection={<IconChevronDown size={12} />}
                    >
                      {getFormattedEstimateStatus(currentStatus)}
                    </Badge>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Change Status</Menu.Label>
                    {statusDropdownOptions}
                  </Menu.Dropdown>
                </Menu>
              )}
            </Flex>
          </Flex>
        </div>

        {/* Job Type */}
        {editingJobType ? (
          <div style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Flex justify="space-between" align="center" gap="sm" mb="xs">
              <Text size="sm" fw={500} c="dimmed">
                Job Type:
              </Text>
              <Select
                data={[
                  { value: EstimateType.INTERIOR, label: 'Interior' },
                  { value: EstimateType.EXTERIOR, label: 'Exterior' },
                  { value: 'Full House', label: 'Full House' },
                ]}
                value={selectedJobType}
                onChange={(value) => setSelectedJobType(value)}
                placeholder="Select job type"
                style={{ flex: 1, maxWidth: '200px' }}
                size="sm"
                autoFocus
              />
            </Flex>
            <Flex gap="xs" justify="flex-end">
              <ActionIcon
                color="green"
                variant="light"
                onClick={() => updateJobType(selectedJobType)}
                loading={savingJobType}
                size="lg"
              >
                <IconCheck size={18} />
              </ActionIcon>
              <ActionIcon
                color="red"
                variant="light"
                onClick={handleJobTypeCancel}
                disabled={savingJobType}
                size="lg"
              >
                <IconX size={18} />
              </ActionIcon>
            </Flex>
          </div>
        ) : (
          <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Text size="sm" fw={500} c="dimmed">
              Job Type:
            </Text>
            <Text
              size="sm"
              style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
              onClick={handleJobTypeClick}
              c={estimate.estimate_type ? 'dark' : 'dimmed'}
            >
              {getJobTypeDisplayName()}
            </Text>
          </Flex>
        )}

        {/* Owned By */}
        {editingOwner ? (
          <div style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Flex justify="space-between" align="center" gap="sm" mb="xs">
              <Text size="sm" fw={500} c="dimmed">
                Owned by:
              </Text>
              <Select
                data={users.map((user) => ({
                  value: user.id,
                  label: user.full_name || user.email,
                }))}
                value={selectedOwnerId}
                onChange={setSelectedOwnerId}
                placeholder="Select owner"
                searchable
                clearable
                style={{ flex: 1, maxWidth: '200px' }}
                size="sm"
                disabled={loadingUsers}
                autoFocus
              />
            </Flex>
            <Flex gap="xs" justify="flex-end">
              <ActionIcon
                color="green"
                variant="light"
                onClick={() => updateOwnedBy(selectedOwnerId)}
                loading={savingOwner}
                size="lg"
              >
                <IconCheck size={18} />
              </ActionIcon>
              <ActionIcon
                color="red"
                variant="light"
                onClick={handleOwnerCancel}
                disabled={savingOwner}
                size="lg"
              >
                <IconX size={18} />
              </ActionIcon>
            </Flex>
          </div>
        ) : (
          <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Text size="sm" fw={500} c="dimmed">
              Owned by:
            </Text>
            <Text
              size="sm"
              style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
              onClick={handleOwnerClick}
              c={estimate.owned_by || estimate.created_by ? 'dark' : 'dimmed'}
            >
              {getOwnerDisplayName()}
            </Text>
          </Flex>
        )}

        {/* Client Name - Clickable, not editable */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Client:
          </Text>
          {!client ? (
            <Skeleton height={20} width={150} />
          ) : (
            <Text
              size="sm"
              style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
              onClick={() => router.push(`/clients/${estimate.client_id}`)}
              c="blue"
              td="underline"
            >
              {client?.name || 'Client'}
            </Text>
          )}
        </Flex>

        {/* Client Email - Read-only */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Email:
          </Text>
          {!client ? (
            <Skeleton height={20} width={200} />
          ) : (
            <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
              {client?.email || '—'}
            </Text>
          )}
        </Flex>

        {/* Client Phone - Read-only */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Phone:
          </Text>
          {!client ? (
            <Skeleton height={20} width={150} />
          ) : (
            <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
              {formatPhoneNumber(client?.phone_number)}
            </Text>
          )}
        </Flex>

        {/* Address */}
        <EditableField
          label="Address"
          value={estimate.address_street || estimate.client_address}
          onSave={updateClientAddress}
          placeholder="Enter address"
        />

        {/* City */}
        <EditableField
          label="City"
          value={estimate.address_city || estimate.city}
          onSave={updateCity}
          placeholder="Enter city"
        />

        {/* Zip Code */}
        <EditableField
          label="Zip Code"
          value={estimate.address_zipcode || estimate.zip_code}
          onSave={updateZipCode}
          placeholder="Enter zip code"
        />

        {/* Hours - Show breakdown if change orders exist */}
        {estimate.original_hours !== undefined || estimate.change_order_hours ? (
          <>
            <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-xs)' }}>
              <Text size="sm" fw={500} c="dimmed">
                Original Hours:
              </Text>
              <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
                {estimate.original_hours?.toFixed(2) || estimate.hours_bid?.toFixed(2) || '—'}
              </Text>
            </Flex>
            {estimate.change_order_hours ? (
              <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-xs)' }}>
                <Text size="sm" fw={500} c="dimmed">
                  Change Order Hours:
                </Text>
                <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
                  {estimate.change_order_hours.toFixed(2)}
                </Text>
              </Flex>
            ) : null}
            <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
              <Text size="sm" fw={600} c="dimmed">
                Total Hours:
              </Text>
              <Text
                size="sm"
                fw={600}
                style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}
              >
                {((estimate.original_hours || estimate.hours_bid || 0) +
                  (estimate.change_order_hours || 0)).toFixed(2)}
              </Text>
            </Flex>
          </>
        ) : (
          <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
            <Text size="sm" fw={500} c="dimmed">
              Job Hours:
            </Text>
            <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
              {estimate.estimate_hours || estimate.hours_bid || '—'}
            </Text>
          </Flex>
        )}

        {/* Rate - Read-only */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Job Rate:
          </Text>
          <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
            ${estimate.hourly_rate?.toFixed(2) || '—'}
          </Text>
        </Flex>

        {/* Job Total - Read-only (hours * rate - discount) */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Job Total:
          </Text>
          <Text size="sm" fw={600} style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
            {(() => {
              // Use actual_hours if available and > 0, otherwise use estimated hours
              const hours = ((estimate.original_hours || estimate.hours_bid || 0) +
                (estimate.change_order_hours || 0)) as number;
              const rate = estimate.hourly_rate || 0;
              const subtotal = hours * rate;

              // Apply discount if discount_percentage is set
              const discountPercentage = estimate.discount_percentage || 0;
              const discountAmount =
                discountPercentage > 0 ? subtotal * (discountPercentage / 100) : 0;
              const total = subtotal - discountAmount;

              return total > 0 ? `$${total.toFixed(2)}` : '—';
            })()}
          </Text>
        </Flex>

        {/* Discount Percentage */}
        <EditableField
          label="Discount Percentage"
          value={`${estimate.discount_percentage?.toString() || '0'}%`}
          onSave={updateDiscountPercentage}
          placeholder="Enter discount percentage (e.g., 10 for 10%)"
          type="number"
        />

        {/* Discount Reason */}
        <EditableField
          label="Discount Reason"
          value={estimate.discount_reason}
          onSave={updateDiscountReason}
          placeholder="Enter discount reason"
        />

        {/* Paint Details */}
        <EditableField
          label="Paint Details"
          value={(estimate as any).paint_details}
          onSave={updatePaintDetails}
          type="textarea"
          multiline
          placeholder="Enter paint details"
        />

        {/* Crew Lead */}
        <EditableField
          label="Crew Lead"
          value={estimate.project_crew_lead}
          onSave={updateCrewLead}
          placeholder="Enter crew lead name"
        />

        {/* Actual Hours */}
        <EditableField
          label="Actual Hours"
          value={estimate.actual_hours}
          onSave={updateActualHours}
          type="number"
          placeholder="Enter actual hours"
        />

        {/* Tentative Scheduling Date - Only show for projects */}
        {estimate.is_project && (
          editingTentativeDate ? (
            <div style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
              <Flex justify="space-between" align="center" gap="sm" mb="xs">
                <Text size="sm" fw={500} c="dimmed">
                  Tentative Scheduling Date:
                </Text>
                <DatePickerInput
                  value={selectedTentativeDate}
                  onChange={setSelectedTentativeDate}
                  placeholder="Select date"
                  style={{ flex: 1, maxWidth: '200px' }}
                  size="sm"
                  clearable
                  autoFocus
                />
              </Flex>
              <Flex gap="xs" justify="flex-end">
                <ActionIcon
                  color="green"
                  variant="light"
                  onClick={() => updateTentativeSchedulingDate(selectedTentativeDate)}
                  loading={savingTentativeDate}
                  size="lg"
                >
                  <IconCheck size={18} />
                </ActionIcon>
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={handleTentativeDateCancel}
                  disabled={savingTentativeDate}
                  size="lg"
                >
                  <IconX size={18} />
                </ActionIcon>
              </Flex>
            </div>
          ) : (
            <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
              <Text size="sm" fw={500} c="dimmed">
                Tentative Scheduling Date:
              </Text>
              <Text
                size="sm"
                style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
                onClick={handleTentativeDateClick}
                c={estimate.tentative_scheduling_date ? 'dark' : 'dimmed'}
              >
                {estimate.tentative_scheduling_date
                  ? new Date(estimate.tentative_scheduling_date).toLocaleDateString()
                  : '—'}
              </Text>
            </Flex>
          )
        )}
      </Flex>
    </Paper>
  );
}

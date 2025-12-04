'use client';

import { useEffect, useRef, useState } from 'react';

import { ActionIcon, Badge, Flex, Menu, Paper, Select, Text } from '@mantine/core';
import { IconCheck, IconChevronDown, IconX } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import EditableField from './EditableField';
import LoadingState from '../Global/LoadingState';
import { ContractorClient, Estimate, EstimateStatus } from '../Global/model';
import { getEstimateBadgeColor, getFormattedEstimateStatus } from '../Global/utils';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';
import { useDataCache } from '@/contexts/DataCacheContext';
import { logToCloudWatch } from '@/public/logger';

interface SidebarDetailsProps {
  estimate: Estimate;
  estimateID: string;
  onUpdate: () => void;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
}

export default function SidebarDetails({ estimate, estimateID, onUpdate }: SidebarDetailsProps) {
  const [client, setClient] = useState<ContractorClient>();
  const [menuOpened, setMenuOpened] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingOwner, setEditingOwner] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(
    estimate.owned_by || estimate.created_by || null
  );
  const [savingOwner, setSavingOwner] = useState(false);
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

  useEffect(() => {
    const loadUsers = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        return;
      }

      setLoadingUsers(true);
      try {
        const response = await fetch('/api/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          // eslint-disable-next-line no-console
          console.error('Failed to load users:', response.status);
          return;
        }

        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  // Sync selectedOwnerId when estimate changes (but not when editing)
  useEffect(() => {
    if (!editingOwner) {
      setSelectedOwnerId(estimate.owned_by || estimate.created_by || null);
    }
  }, [estimate.owned_by, estimate.created_by, editingOwner]);

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

      await response.json();

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

      setMenuOpened(false);

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
      body: JSON.stringify({ job_crew_lead: value || null }),
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

    const actualHours = value ? parseFloat(value) : null;
    await fetch(`/api/estimates/${estimateID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ actual_hours: actualHours }),
    });

    onUpdate();
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

  const statusOptions = Object.values(EstimateStatus).filter(
    (status) => status !== estimate.status
  );

  const statusDropdownOptions = statusOptions.map((status) => (
    <Menu.Item key={status} onClick={() => updateEstimateStatus(status)}>
      {getFormattedEstimateStatus(status)}
    </Menu.Item>
  ));

  if (!client) {
    return <LoadingState />;
  }

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
                    color={getEstimateBadgeColor(estimate.status)}
                    rightSection={<IconChevronDown size={12} />}
                  >
                    {getFormattedEstimateStatus(estimate.status)}
                  </Badge>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Change Status</Menu.Label>
                  {statusDropdownOptions}
                </Menu.Dropdown>
              </Menu>
            </Flex>
          </Flex>
        </div>

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
          <Text
            size="sm"
            style={{ cursor: 'pointer', textAlign: 'right', flex: 1, maxWidth: '200px' }}
            onClick={() => router.push(`/clients/${estimate.client_id}`)}
            c="blue"
            td="underline"
          >
            {client?.name || 'Client'}
          </Text>
        </Flex>

        {/* Client Email - Read-only */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Email:
          </Text>
          <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
            {client?.email || '—'}
          </Text>
        </Flex>

        {/* Client Phone - Read-only */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Phone:
          </Text>
          <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
            {client?.phone_number || '—'}
          </Text>
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

        {/* Job Total - Read-only (hours * rate) */}
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
              const total = hours * rate;
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
          value={estimate.job_crew_lead}
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
      </Flex>
    </Paper>
  );
}

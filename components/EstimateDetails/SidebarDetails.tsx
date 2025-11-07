'use client';

import { useEffect, useState } from 'react';

import { Badge, Flex, Menu, Paper, Text } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

import EditableField from './EditableField';
import LoadingState from '../Global/LoadingState';
import { DynamoClient, Estimate, EstimateStatus } from '../Global/model';
import { getEstimateBadgeColor, getFormattedEstimateStatus } from '../Global/utils';

import { UpdateClientDetailsInput, UpdateHoursAndRateInput, UpdateJobContent } from '@/app/api/projects/jobTypes';
import { logToCloudWatch } from '@/public/logger';

interface SidebarDetailsProps {
  estimate: Estimate;
  estimateID: string;
  onUpdate: () => void;
}

export default function SidebarDetails({ estimate, estimateID, onUpdate }: SidebarDetailsProps) {
  const [client, setClient] = useState<DynamoClient>();
  const [menuOpened, setMenuOpened] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadClientDetails = async () => {
      if (!estimate.client_id) {
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
        setClient(data.Item || data);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading client details:', error);
      }
    };

    if (!client && estimate.client_id) {
      loadClientDetails();
    }
  }, [estimate.client_id, client]);

  const updateEstimateStatus = async (status: EstimateStatus) => {
    await logToCloudWatch(`Attempting to update estimate: ${estimate.id} to status: ${status}`);

    try {
      const response = await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      await response.json();

      if (status === EstimateStatus.CONTRACTOR_SIGNED && client) {
        const jiraResponse = await fetch('/api/jira', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ job: estimate, client }),
        });

        if (!jiraResponse.ok) {
          throw new Error('Failed to create JIRA ticket');
        }
      }

      setMenuOpened(false);
      onUpdate();
    } catch (error) {
      logToCloudWatch(`Failed to update estimate status: ${error}`);
    }
  };

  const updateClientAddress = async (value: string) => {
    const updateJobContent: UpdateClientDetailsInput = {
      city: estimate.address_city || estimate.city || '',
      zip_code: estimate.address_zipcode || estimate.zip_code || '',
      client_address: value,
    };

    const content: UpdateJobContent = {
      update_client_details: updateJobContent,
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

  const updateCity = async (value: string) => {
    const updateJobContent: UpdateClientDetailsInput = {
      city: value,
      zip_code: estimate.address_zipcode || estimate.zip_code || '',
      client_address: estimate.address_street || estimate.client_address || '',
    };

    const content: UpdateJobContent = {
      update_client_details: updateJobContent,
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

  const updateZipCode = async (value: string) => {
    const updateJobContent: UpdateClientDetailsInput = {
      city: estimate.address_city || estimate.city || '',
      zip_code: value,
      client_address: estimate.address_street || estimate.client_address || '',
    };

    const content: UpdateJobContent = {
      update_client_details: updateJobContent,
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

  const updateHours = async (value: string) => {
    const updateJobContent: UpdateHoursAndRateInput = {
      hours: value,
      rate: estimate.hourly_rate?.toString() || '106',
      date: estimate.scheduled_date || estimate.estimate_date || new Date().toISOString(),
      discount_reason: estimate.discount_reason || '',
    };

    const content: UpdateJobContent = {
      update_hours_and_rate: updateJobContent,
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

  const updateRate = async (value: string) => {
    const updateJobContent: UpdateHoursAndRateInput = {
      hours: (estimate.hours_bid || estimate.estimate_hours || 0).toString(),
      rate: value,
      date: estimate.scheduled_date || estimate.estimate_date || new Date().toISOString(),
      discount_reason: estimate.discount_reason || '',
    };

    const content: UpdateJobContent = {
      update_hours_and_rate: updateJobContent,
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

  const updateDiscountReason = async (value: string) => {
    const updateJobContent: UpdateHoursAndRateInput = {
      hours: (estimate.hours_bid || estimate.estimate_hours || 0).toString(),
      rate: estimate.hourly_rate?.toString() || '106',
      date: estimate.scheduled_date || estimate.estimate_date || new Date().toISOString(),
      discount_reason: value,
    };

    const content: UpdateJobContent = {
      update_hours_and_rate: updateJobContent,
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
            <Flex justify="flex-end" style={{ width: '100%' }}>
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
            {estimate.client_name || 'Client'}
          </Text>
        </Flex>

        {/* Client Email - Read-only */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Email:
          </Text>
          <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
            {client.email?.S || '—'}
          </Text>
        </Flex>

        {/* Client Phone - Read-only */}
        <Flex justify="space-between" align="center" gap="sm" style={{ marginBottom: 'var(--mantine-spacing-md)' }}>
          <Text size="sm" fw={500} c="dimmed">
            Phone:
          </Text>
          <Text size="sm" c="dimmed" style={{ textAlign: 'right', flex: 1, maxWidth: '200px' }}>
            {client.phone_number?.S || '—'}
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

        {/* Hours */}
        <EditableField
          label="Job Hours"
          value={estimate.hours_bid || estimate.estimate_hours || 0}
          onSave={updateHours}
          type="number"
          placeholder="Enter hours"
        />

        {/* Rate */}
        <EditableField
          label="Job Rate"
          value={estimate.hourly_rate || 106}
          onSave={updateRate}
          type="number"
          placeholder="Enter rate"
        />

        {/* Discount Reason */}
        {estimate.discount_reason && (
          <EditableField
            label="Discount Reason"
            value={estimate.discount_reason}
            onSave={updateDiscountReason}
            placeholder="Enter discount reason"
          />
        )}

        {/* Paint Details */}
        <EditableField
          label="Paint Details"
          value={(estimate as any).paint_details}
          onSave={updatePaintDetails}
          type="textarea"
          multiline
          placeholder="Enter paint details"
        />
      </Flex>
    </Paper>
  );
}

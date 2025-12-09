'use client';

import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';

import { EstimateStatus } from '../Global/model';
import { getEstimateBadgeColor, getFormattedEstimateStatus } from '../Global/utils';

interface HomepageJobCardProps {
  id: string;
  title?: string;
  client_name: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  status: string;
  hours_bid: number;
  hourly_rate: number;
  cover_photo_url?: string;
  sold_date?: string;
  started_date?: string;
  finished_date?: string;
}

export default function HomepageJobCard({
  id,
  title,
  client_name,
  address_street,
  address_city,
  address_state,
  status,
  hours_bid,
  hourly_rate,
  cover_photo_url,
  sold_date,
  started_date,
  finished_date,
}: HomepageJobCardProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      window.open(`/proposals/${id}`, '_blank');
    } else {
      router.push(`/proposals/${id}`);
    }
  };

  const totalValue = hours_bid * hourly_rate;

  // Determine which date to display and its label
  const getDateInfo = () => {
    if (finished_date) {
      return { date: finished_date, label: 'Finished' };
    }
    if (sold_date) {
      return { date: sold_date, label: 'Sold' };
    }
    if (started_date) {
      return { date: started_date, label: 'Started' };
    }
    return null;
  };

  const dateInfo = getDateInfo();

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Placeholder image URL
  const placeholderImage =
    'https://i.ibb.co/R0xWFjF/Screenshot-2025-01-26-at-6-23-24-PM.png';

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ cursor: 'pointer', height: '100%' }}
      onClick={handleClick}
    >
      <Stack gap="sm">
        {/* Cover Image */}
        <div style={{ position: 'relative', width: '100%', height: '200px', overflow: 'hidden', borderRadius: 'var(--mantine-radius-md)' }}>
          <img
            src={cover_photo_url || placeholderImage}
            alt={title || client_name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              const target = e.target as HTMLImageElement;
              if (target.src !== placeholderImage) {
                target.src = placeholderImage;
              }
            }}
          />
        </div>

        {/* Title */}
        {title && (
          <Text fw={600} size="md" lineClamp={1}>
            {title}
          </Text>
        )}

        {/* Client Name and Status */}
        <Group justify="space-between" align="flex-start" gap="xs">
          <Text fw={500} size="sm" lineClamp={1} style={{ flex: 1 }}>
            {client_name}
          </Text>
          <Badge
            style={{ color: '#ffffff', flexShrink: 0 }}
            color={getEstimateBadgeColor(status as EstimateStatus)}
            size="sm"
          >
            {getFormattedEstimateStatus(status as EstimateStatus)}
          </Badge>
        </Group>

        {/* Address */}
        {(address_street || address_city || address_state) && (
          <Stack gap={2}>
            {address_street && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {address_street}
              </Text>
            )}
            {(address_city || address_state) && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {[address_city, address_state].filter(Boolean).join(', ')}
              </Text>
            )}
          </Stack>
        )}

        {/* Metadata */}
        <Group justify="space-between" align="center">
          {totalValue > 0 && (
            <Text size="sm" fw={500} c="dimmed">
              {hours_bid} hours
            </Text>
          )}
          {dateInfo && (
            <Text size="xs" c="dimmed">
              {dateInfo.label}: {formatDate(dateInfo.date)}
            </Text>
          )}
        </Group>
      </Stack>
    </Card>
  );
}

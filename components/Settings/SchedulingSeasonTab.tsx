'use client';

import { useEffect, useState } from 'react';

import { Button, Card, Group, Stack, Switch, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';

export default function SchedulingSeasonTab({ embedded = false }: { embedded?: boolean }) {
  const [exteriorStart, setExteriorStart] = useState('04-15');
  const [interiorYearRound, setInteriorYearRound] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/scheduling-settings', { headers: getApiHeaders() });
        if (res.ok) {
          const d = await res.json();
          if (d.scheduling_exterior_earliest_mmdd) {
            setExteriorStart(d.scheduling_exterior_earliest_mmdd);
          }
          if (typeof d.scheduling_interior_year_round === 'boolean') {
            setInteriorYearRound(d.scheduling_interior_year_round);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/scheduling-settings', {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({
          scheduling_exterior_earliest_mmdd: exteriorStart,
          scheduling_interior_year_round: interiorYearRound,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Save failed');
      notifications.show({
        title: 'Saved',
        message: 'Scheduling rules updated',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: e instanceof Error ? e.message : 'Save failed',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Text c="dimmed" size="sm">
        Loading…
      </Text>
    );
  }

  const body = (
    <Stack gap="md">
      <Text fw={600} size={embedded ? 'md' : 'lg'} mb="xs">
        Scheduling &amp; season rules
      </Text>
      <Text size="sm" c="dimmed" mb="md" component="div">
        <span>
          Exterior jobs are not scheduled before this calendar date each year (MM-DD).
        </span>{' '}
        <span>Interior follows the toggle below.</span>
      </Text>
      <TextInput
        label="Exterior earliest date (MM-DD)"
        value={exteriorStart}
        onChange={(e) => setExteriorStart(e.currentTarget.value)}
        placeholder="04-15"
      />
      <Switch
        label="Interior allowed year-round"
        checked={interiorYearRound}
        onChange={(e) => setInteriorYearRound(e.currentTarget.checked)}
      />
      <Group justify="flex-end">
        <Button onClick={save} loading={saving}>
          Save scheduling rules
        </Button>
      </Group>
    </Stack>
  );

  if (embedded) {
    return body;
  }

  return (
    <Card shadow="sm" padding="lg" withBorder>
      {body}
    </Card>
  );
}

'use client';

import { useState } from 'react';

import { Button, Group, Select, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';

import classes from './CalendarPage.module.css';
import type { CalendarTeamOption } from './ScheduleJobModal';

import { getApiHeaders } from '@/app/utils/apiClient';
import type { Estimate } from '@/components/Global/model';

type Props = {
  estimate: Estimate;
  teams: CalendarTeamOption[];
  teamsLoading: boolean;
  onAssigned: () => void;
};

export function UnassignedEstimateRow({
  estimate,
  teams,
  teamsLoading,
  onAssigned,
}: Props) {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));

  const handleAssign = async () => {
    if (!teamId) {
      notifications.show({
        title: 'Select a team',
        message: 'Choose a production team before assigning.',
        color: 'yellow',
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({ schedule_team_id: teamId }),
      });
      const errBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (typeof errBody.message === 'string' ? errBody.message : null) ||
            (typeof errBody.detail === 'string' ? errBody.detail : null) ||
            'Failed to assign team'
        );
      }
      notifications.show({
        title: 'Team assigned',
        message: 'This job is placed in that team tentative backlog.',
        color: 'green',
      });
      setTeamId(null);
      onAssigned();
    } catch (e) {
      notifications.show({
        title: 'Could not assign team',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={classes.unassignedRow}>
      <div className={classes.unassignedRowMain}>
        <Text size="sm" fw={600} lineClamp={2}>
          {estimate.title || estimate.address_street || estimate.client_name || 'Job'}
        </Text>
        <Text size="xs" c="dimmed">
          {(estimate.hours_bid ?? 0).toFixed(1)} bid hrs
        </Text>
      </div>
      <Group gap="xs" wrap="nowrap" justify="flex-end" className={classes.unassignedRowActions}>
        <Select
          placeholder={teamsLoading ? 'Loading teams…' : 'Team'}
          data={teamOptions}
          value={teamId}
          onChange={setTeamId}
          searchable
          clearable
          disabled={teamsLoading || teamOptions.length === 0}
          w={200}
          size="xs"
        />
        <Button size="xs" variant="light" loading={saving} onClick={() => handleAssign().catch(() => {})}>
          Assign
        </Button>
      </Group>
    </div>
  );
}

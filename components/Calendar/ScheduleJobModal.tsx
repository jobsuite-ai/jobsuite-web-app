'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button, Group, Modal, Radio, Select, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';

import { getApiHeaders } from '@/app/utils/apiClient';
import type { Estimate } from '@/components/Global/model';
import { EstimateStatus } from '@/components/Global/model';
import type { TeamConfig } from '@/hooks/useTeamConfig';
import { effectiveProjectStartDate } from '@/utils/estimateScheduleDisplay';
import {
  computeScheduledEndDate,
  getDailyCapacityHours,
} from '@/utils/scheduleMath';

type EndMode = 'manual' | 'auto';

function apiEstimateType(et: string | undefined): string {
  const u = String(et || '').toUpperCase();
  if (u.includes('EXTERIOR') && u.includes('INTERIOR')) return 'BOTH';
  if (u.includes('EXTERIOR')) return 'EXTERIOR';
  if (u.includes('INTERIOR')) return 'INTERIOR';
  if (u.includes('FULL')) return 'BOTH';
  return 'INTERIOR';
}

export type CalendarTeamOption = { id: string; name: string };

interface ScheduleJobModalProps {
  opened: boolean;
  onClose: () => void;
  estimate: Estimate | null;
  teamConfig: TeamConfig;
  /** Teams from GET /api/teams; capacity uses `teamConfig` when ids match. */
  teams: CalendarTeamOption[];
  onSaved: () => void;
}

export function ScheduleJobModal({
  opened,
  onClose,
  estimate,
  teamConfig,
  teams,
  onSaved,
}: ScheduleJobModalProps) {
  const [start, setStart] = useState<Date | null>(null);
  const [endMode, setEndMode] = useState<EndMode>('auto');
  const [endManual, setEndManual] = useState<Date | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!estimate || !opened) return;
    setStart(effectiveProjectStartDate(estimate));
    setEndManual(
      estimate.scheduled_end_date ? new Date(estimate.scheduled_end_date) : null
    );
    setEndMode(estimate.schedule_end_locked ? 'manual' : 'auto');
    setTeamId(estimate.schedule_team_id || null);
  }, [estimate, opened]);

  const hoursBid = estimate?.hours_bid ?? 0;

  const computedEnd = useMemo(() => {
    if (!start || endMode !== 'auto') return null;
    const daily = getDailyCapacityHours(
      teamId,
      teamConfig.scheduleTeams,
      teamConfig.scheduleDefaultDailyHours
    );
    return computeScheduledEndDate({
      start,
      hoursBid,
      dailyCapacityHours: daily,
    });
  }, [start, endMode, hoursBid, teamId, teamConfig]);

  const handleSave = async () => {
    if (!estimate || !start) return;
    if (teams.length > 0 && !teamId) {
      notifications.show({
        title: 'Team required',
        message: 'Select a team to save the schedule.',
        color: 'yellow',
      });
      return;
    }
    setSaving(true);
    try {
      const startDay = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

      if (teamId) {
        const schRes = await fetch(`/api/schedule/estimates/${estimate.id}`, {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({
            team_id: teamId,
            labor_hours: hoursBid,
            start_date: startDay,
            estimate_type: apiEstimateType(String(estimate.estimate_type)),
            tentative: true,
          }),
        });
        const schErr = await schRes.json().catch(() => ({}));
        if (!schRes.ok) {
          throw new Error(
            (schErr.detail as string) || schErr.message || 'Failed to save schedule'
          );
        }
      } else {
        let scheduledEnd: string | null = null;
        let endLocked = false;
        if (endMode === 'manual') {
          if (endManual) {
            scheduledEnd = endManual.toISOString();
            endLocked = true;
          }
        } else if (computedEnd) {
          scheduledEnd = computedEnd.toISOString();
          endLocked = false;
        }
        const res = await fetch(`/api/estimates/${estimate.id}`, {
          method: 'PUT',
          headers: getApiHeaders(),
          body: JSON.stringify({
            scheduled_date: start.toISOString(),
            scheduled_end_date: scheduledEnd,
            schedule_end_locked: endLocked,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to save');
        }
      }

      if (estimate.status === EstimateStatus.PROJECT_NOT_SCHEDULED) {
        const resStatus = await fetch(`/api/estimates/${estimate.id}`, {
          method: 'PUT',
          headers: getApiHeaders(),
          body: JSON.stringify({ status: EstimateStatus.PROJECT_SCHEDULED }),
        });
        if (!resStatus.ok) {
          const err = await resStatus.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to update project status');
        }
      }

      onSaved();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save';
      notifications.show({ title: 'Could not save schedule', message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const teamOptions = teams.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={estimate ? `Schedule: ${estimate.title || estimate.address_street || 'Job'}` : 'Schedule'}
      size="md"
    >
      {estimate && (
        <Stack gap="md">
          <DatePickerInput label="Start date" value={start} onChange={setStart} />

          <Radio.Group
            label="End date"
            value={endMode}
            onChange={(v) => setEndMode(v as EndMode)}
          >
            <Stack gap="xs" mt="xs">
              <Radio value="auto" label="Calculate from bid hours (weekdays)" />
              <Radio value="manual" label="Set end date manually" />
            </Stack>
          </Radio.Group>

          {endMode === 'manual' && (
            <DatePickerInput
              label="End date"
              value={endManual}
              onChange={setEndManual}
              clearable
            />
          )}

          {endMode === 'auto' && (
            <Text size="sm" c="dimmed">
              Bid hours: {hoursBid.toFixed(1)} · Estimated last day:{' '}
              {computedEnd ? computedEnd.toLocaleDateString() : '—'}
            </Text>
          )}

          {teamOptions.length > 0 ? (
            <Select
              label="Team"
              placeholder="Select team"
              data={teamOptions}
              value={teamId}
              onChange={setTeamId}
              searchable
              required
            />
          ) : (
            <Text size="sm" c="dimmed">
              No teams found. Add teams in Settings, or dates will be saved without a crew schedule.
            </Text>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!start || (teams.length > 0 && !teamId)}
            >
              Save
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

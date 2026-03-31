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

interface ScheduleJobModalProps {
  opened: boolean;
  onClose: () => void;
  estimate: Estimate | null;
  teamConfig: TeamConfig;
  onSaved: () => void;
}

export function ScheduleJobModal({
  opened,
  onClose,
  estimate,
  teamConfig,
  onSaved,
}: ScheduleJobModalProps) {
  const [start, setStart] = useState<Date | null>(null);
  const [endMode, setEndMode] = useState<EndMode>('auto');
  const [endManual, setEndManual] = useState<Date | null>(null);
  const [crewLead, setCrewLead] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!estimate || !opened) return;
    setStart(effectiveProjectStartDate(estimate));
    setEndManual(
      estimate.scheduled_end_date ? new Date(estimate.scheduled_end_date) : null
    );
    setEndMode(estimate.schedule_end_locked ? 'manual' : 'auto');
    setCrewLead(estimate.project_crew_lead || null);
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
    setSaving(true);
    try {
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

      const schedulePayload: Record<string, unknown> = {
        scheduled_date: start.toISOString(),
        scheduled_end_date: scheduledEnd,
        schedule_end_locked: endLocked,
        project_crew_lead: crewLead || null,
        schedule_team_id: teamId || null,
      };

      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify(schedulePayload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save');
      }

      // Second request: status alone — update_estimate drops other fields when status is included.
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

  const crewOptions = teamConfig.leadPainters.map((n) => ({ value: n, label: n }));
  const teamOptions = teamConfig.scheduleTeams.map((t) => ({
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

          <Select
            label="Crew lead"
            placeholder="Optional"
            data={crewOptions}
            value={crewLead}
            onChange={setCrewLead}
            clearable
            searchable
          />

          {teamOptions.length > 0 && (
            <Select
              label="Team"
              placeholder="Optional (uses team capacity when calculating)"
              data={teamOptions}
              value={teamId}
              onChange={setTeamId}
              clearable
            />
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!start}>
              Save
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

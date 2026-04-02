'use client';

import { useEffect, useState } from 'react';

import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { isSameDay } from 'date-fns';

import { getApiHeaders } from '@/app/utils/apiClient';
import type { Estimate } from '@/components/Global/model';
import { effectiveProjectStartDate } from '@/utils/estimateScheduleDisplay';
import { apiEstimateType } from '@/utils/scheduleApiTypes';

/** Subset of team row for display label only */
export type CalendarTeamOption = {
  id: string;
  name: string;
};

function parseLocalYmd(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface ScheduleJobModalProps {
  opened: boolean;
  onClose: () => void;
  estimate: Estimate | null;
  teams: CalendarTeamOption[];
  onSaved: () => void;
  /** Lock in tentative row: production team for POST (from backlog context) */
  lockInTeamId: string | null;
  /** YYYY-MM-DD from implied tentative schedule placement */
  lockInStartIso?: string | null;
}

export function ScheduleJobModal({
  opened,
  onClose,
  estimate,
  teams,
  onSaved,
  lockInTeamId,
  lockInStartIso = null,
}: ScheduleJobModalProps) {
  const [start, setStart] = useState<Date | null>(null);
  /** Which month is shown; `Calendar` uses `date` for visible grid, not the selection day. */
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!estimate || !opened) {
      return;
    }
    const initial = lockInStartIso
      ? parseLocalYmd(lockInStartIso) ?? effectiveProjectStartDate(estimate)
      : effectiveProjectStartDate(estimate);
    const view = initial ?? new Date();
    setStart(initial ?? view);
    setCalendarViewDate(view);
  }, [estimate, opened, lockInStartIso]);

  const hoursBid = estimate?.hours_bid ?? 0;
  const teamName = teams.find((t) => t.id === lockInTeamId)?.name ?? '—';

  const handleSave = async () => {
    if (!estimate || !start) {
      return;
    }
    if (!lockInTeamId?.trim()) {
      notifications.show({
        title: 'Team missing',
        message: 'Open this flow from a team backlog so the crew is known.',
        color: 'yellow',
      });
      return;
    }
    setSaving(true);
    try {
      const startDay = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(start.getDate()).padStart(2, '0')}`;

      const schRes = await fetch(`/api/schedule/estimates/${estimate.id}`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          team_id: lockInTeamId,
          labor_hours: hoursBid,
          start_date: startDay,
          estimate_type: apiEstimateType(String(estimate.estimate_type)),
          tentative: false,
          non_working_dates: [],
        }),
      });
      const schErr = await schRes.json().catch(() => ({}));
      if (!schRes.ok) {
        throw new Error(
          (schErr.detail as string) || schErr.message || 'Failed to save schedule'
        );
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        estimate
          ? `Lock in schedule: ${estimate.title || estimate.address_street || 'Job'}`
          : 'Schedule'
      }
      size="md"
    >
      {estimate && (
        <Stack gap="md">
          <Text size="sm" fw={600}>
            Team: {teamName}
          </Text>
          <Text size="sm" c="dimmed">
            End date is calculated from bid hours ({hoursBid.toFixed(1)} hrs) and team capacity
            when you save.
          </Text>
          <Calendar
            firstDayOfWeek={1}
            date={calendarViewDate}
            onDateChange={setCalendarViewDate}
            getDayProps={(dayDate) => ({
              selected: start != null && isSameDay(dayDate, start),
            })}
            __onDayClick={(_event, dayDate) => {
              setStart(dayDate);
            }}
            minLevel="month"
            maxLevel="month"
            size="md"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!start || !lockInTeamId}>
              Save
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

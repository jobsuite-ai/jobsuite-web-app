'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Checkbox, Group, NumberInput, Paper, Select, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/dates/styles.css';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconMail } from '@tabler/icons-react';

import type { Estimate, ScheduleEvent } from '../Global/model';

import { getApiHeaders } from '@/app/utils/apiClient';

type TeamRow = {
  id: string;
  name: string;
  member_user_ids: string[];
};

function apiEstimateType(et: string | undefined): string {
  const u = String(et || '').toUpperCase();
  if (u.includes('EXTERIOR') && u.includes('INTERIOR')) return 'BOTH';
  if (u.includes('EXTERIOR')) return 'EXTERIOR';
  if (u.includes('INTERIOR')) return 'INTERIOR';
  if (u.includes('FULL')) return 'BOTH';
  return 'INTERIOR';
}

export default function EstimateSchedulePanel({
  estimate,
  estimateID,
  onUpdate,
}: {
  estimate: Estimate;
  estimateID: string;
  onUpdate: () => void;
}) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [teamId, setTeamId] = useState<string | null>(estimate.schedule_team_id || null);
  const [laborHours, setLaborHours] = useState<number | string>(
    estimate.schedule_labor_hours ?? estimate.hours_bid ?? 0
  );
  const [startDate, setStartDate] = useState<Date | null>(
    estimate.schedule_start_date
      ? new Date(estimate.schedule_start_date)
      : estimate.scheduled_date
        ? new Date(estimate.scheduled_date)
        : new Date()
  );
  const [preview, setPreview] = useState<{
    work_dates: string[];
    end_date: string;
    tentative: boolean;
    season_message?: string | null;
  } | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [tentativeFlag, setTentativeFlag] = useState(estimate.schedule_tentative ?? false);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    try {
      setLoadingTeams(true);
      const res = await fetch('/api/teams', { headers: getApiHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setTeams(Array.isArray(data) ? data : []);
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const loadEvents = useCallback(async () => {
    const res = await fetch(`/api/schedule/estimates/${estimateID}`, { headers: getApiHeaders() });
    if (!res.ok) return;
    const data = await res.json().catch(() => []);
    const list = Array.isArray(data) ? (data as ScheduleEvent[]) : [];
    setEvents(list);
    if (list[0]) {
      setSelectedEventId(list[0].id);
    }
  }, [estimateID]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    setTeamId(estimate.schedule_team_id || null);
    setLaborHours(estimate.schedule_labor_hours ?? estimate.hours_bid ?? 0);
    setTentativeFlag(estimate.schedule_tentative ?? false);
    if (estimate.schedule_work_dates?.length) {
      const dates = estimate.schedule_work_dates;
      const lastIdx = dates.length - 1;
      setPreview({
        work_dates: dates,
        end_date: estimate.schedule_end_date || dates[lastIdx],
        tentative: Boolean(estimate.schedule_tentative),
        season_message: null,
      });
    }
  }, [
    estimate.schedule_team_id,
    estimate.schedule_labor_hours,
    estimate.schedule_work_dates,
    estimate.schedule_end_date,
    estimate.schedule_tentative,
    estimate.hours_bid,
  ]);

  const teamOptions = useMemo(
    () => teams.map((t) => ({ value: t.id, label: t.name })),
    [teams]
  );

  const runPreview = async () => {
    if (!teamId || !startDate) {
      notifications.show({ title: 'Missing fields', message: 'Choose team and start date', color: 'red' });
      return;
    }
    const lh = typeof laborHours === 'string' ? parseFloat(laborHours) : laborHours;
    if (!lh || lh <= 0) {
      notifications.show({ title: 'Invalid labor', message: 'Enter labor hours > 0', color: 'red' });
      return;
    }
    setPreviewing(true);
    try {
      const res = await fetch('/api/schedule/preview', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          team_id: teamId,
          labor_hours: lh,
          start_date: startDate.toISOString().slice(0, 10),
          estimate_type: apiEstimateType(String(estimate.estimate_type)),
          tentative: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.detail || 'Preview failed');
      }
      setPreview({
        work_dates: data.work_dates,
        end_date: data.end_date,
        tentative: data.tentative,
        season_message: data.season_message,
      });
      setTentativeFlag(Boolean(data.tentative));
      notifications.show({ title: 'Preview ready', message: 'Review work dates below', color: 'green', icon: <IconCheck size={16} /> });
    } catch (e) {
      notifications.show({
        title: 'Preview failed',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    } finally {
      setPreviewing(false);
    }
  };

  const saveSchedule = async () => {
    if (!preview?.work_dates?.length || !teamId || !startDate) {
      notifications.show({ title: 'Nothing to save', message: 'Run preview first', color: 'yellow' });
      return;
    }
    const lh = typeof laborHours === 'string' ? parseFloat(laborHours) : laborHours;
    setSaving(true);
    try {
      const res = await fetch(`/api/schedule/estimates/${estimateID}`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          team_id: teamId,
          labor_hours: lh,
          start_date: startDate.toISOString().slice(0, 10),
          estimate_type: apiEstimateType(String(estimate.estimate_type)),
          tentative: tentativeFlag,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.detail || 'Save failed');
      }
      notifications.show({ title: 'Saved', message: 'Schedule saved on job', color: 'green', icon: <IconCheck size={16} /> });
      await loadEvents();
      onUpdate();
    } catch (e) {
      notifications.show({
        title: 'Save failed',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const loadEventIntoForm = (eventId: string | null) => {
    setSelectedEventId(eventId);
    const ev = events.find((x) => x.id === eventId);
    if (!ev) return;
    setTeamId(ev.team_id);
    setLaborHours(ev.labor_hours);
    setStartDate(new Date(ev.start_date));
    setTentativeFlag(Boolean(ev.tentative));
    setPreview({
      work_dates: ev.work_dates,
      end_date: ev.end_date,
      tentative: ev.tentative,
      season_message: null,
    });
  };

  const updateSelectedEvent = async () => {
    if (!selectedEventId || !teamId || !startDate) return;
    const lh = typeof laborHours === 'string' ? parseFloat(laborHours) : laborHours;
    const res = await fetch(`/api/schedule/${selectedEventId}`, {
      method: 'PUT',
      headers: getApiHeaders(),
      body: JSON.stringify({
        team_id: teamId,
        labor_hours: lh,
        start_date: startDate.toISOString().slice(0, 10),
        estimate_type: apiEstimateType(String(estimate.estimate_type)),
        tentative: tentativeFlag,
        is_current: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notifications.show({ title: 'Update failed', message: data.message || 'Unable to update event', color: 'red' });
      return;
    }
    notifications.show({ title: 'Updated', message: 'Schedule event updated', color: 'green' });
    await loadEvents();
    onUpdate();
  };

  const deleteSelectedEvent = async () => {
    if (!selectedEventId) return;
    const res = await fetch(`/api/schedule/${selectedEventId}`, {
      method: 'DELETE',
      headers: getApiHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      notifications.show({ title: 'Delete failed', message: data.message || 'Unable to delete event', color: 'red' });
      return;
    }
    notifications.show({ title: 'Deleted', message: 'Schedule event deleted', color: 'green' });
    setSelectedEventId(null);
    await loadEvents();
    onUpdate();
  };

  const sendInvite = async () => {
    if (!estimate.schedule_start_date || !estimate.schedule_end_date) {
      notifications.show({ title: 'No schedule', message: 'Save a schedule first', color: 'yellow' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/estimates/${estimateID}/schedule/send-invite`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ notes: estimate.notes || '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.detail || 'Send failed');
      }
      notifications.show({
        title: 'Invite sent',
        message: `Email sent to ${data.sent_to || 'customer'}`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (e) {
      notifications.show({
        title: 'Send failed',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Paper withBorder p="sm" radius="md" mb="md">
      <Text size="sm" fw={600} mb="xs">
        Team schedule
      </Text>
      <Text size="xs" c="dimmed" mb="sm" component="div">
        <span>
          Crew size follows the number of members on the selected team. Preview uses season rules
          from Settings → Scheduling.
        </span>{' '}
        <span>
          Run Preview, then Save schedule to persist dates; use Schedule in the main nav for the
          month view.
        </span>
      </Text>
      <Stack gap="sm">
        <Select
          label="Team"
          placeholder={loadingTeams ? 'Loading…' : 'Select team'}
          data={teamOptions}
          value={teamId}
          onChange={setTeamId}
          searchable
          disabled={loadingTeams}
        />
        <NumberInput
          label="Labor hours"
          min={0.5}
          step={0.5}
          decimalScale={2}
          value={laborHours}
          onChange={setLaborHours}
        />
        <DatePickerInput label="Start date" value={startDate} onChange={setStartDate} />
        <Group gap="xs">
          <Select
            placeholder="Select existing event"
            data={events.map((e) => ({ value: e.id, label: `${e.start_date} -> ${e.end_date}${e.is_current ? ' (current)' : ''}` }))}
            value={selectedEventId}
            onChange={loadEventIntoForm}
            clearable
          />
        </Group>
        <Group gap="xs">
          <Button variant="light" onClick={runPreview} loading={previewing}>
            Preview
          </Button>
          <Button onClick={saveSchedule} loading={saving} disabled={!preview?.work_dates?.length}>
            Save schedule
          </Button>
          <Button
            variant="default"
            onClick={updateSelectedEvent}
            disabled={!selectedEventId}
          >
            Update selected
          </Button>
          <Button
            color="red"
            variant="outline"
            onClick={deleteSelectedEvent}
            disabled={!selectedEventId}
          >
            Delete selected
          </Button>
          <Button
            variant="outline"
            leftSection={<IconMail size={16} />}
            onClick={sendInvite}
            loading={sending}
            disabled={!estimate.schedule_start_date || !estimate.schedule_end_date}
          >
            Email customer ICS
          </Button>
        </Group>
        <Checkbox
          label="Tentative schedule"
          checked={tentativeFlag}
          onChange={(e) => setTentativeFlag(e.currentTarget.checked)}
        />
        {preview?.season_message && (
          <Text size="xs" c="yellow.4">
            {preview.season_message}
          </Text>
        )}
        {preview?.work_dates && preview.work_dates.length > 0 && (
          <Text size="xs" c="dimmed">
            Work days: {preview.work_dates.join(', ')}
            {preview.end_date ? ` (end ${preview.end_date})` : ''}
            {preview.tentative ? ' — tentative' : ''}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

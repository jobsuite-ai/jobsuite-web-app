'use client';

import { useEffect, useState } from 'react';

import { Alert, Button, Group, Loader, Modal, Stack, Text } from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { format, isSameDay } from 'date-fns';

import classes from './ScheduleJobModal.module.css';

import { getApiHeaders } from '@/app/utils/apiClient';
import type { Estimate } from '@/components/Global/model';
import { parseLocalDateString } from '@/utils/calendarWorkingDays';
import { effectiveProjectStartDate } from '@/utils/estimateScheduleDisplay';
import { apiEstimateType } from '@/utils/scheduleApiTypes';

/** Full-viewport fixed inner + clickable sheet (see module CSS). */
const modalLayoutProps = {
  centered: true,
  classNames: { inner: classes.modalInner },
  styles: { content: { pointerEvents: 'auto' as const } },
};

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

function ymdFromLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  const [conflictCode, setConflictCode] = useState<string | null>(null);
  const [lockPreview, setLockPreview] = useState<{
    season_message?: string | null;
    firstWorkYmd: string | null;
    endYmd: string | null;
  } | null>(null);
  const [lockPreviewLoading, setLockPreviewLoading] = useState(false);
  const [lockPreviewError, setLockPreviewError] = useState<string | null>(null);

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

  const selectedYmd = start ? ymdFromLocalDate(start) : null;

  useEffect(() => {
    if (!estimate || !opened || !lockInTeamId?.trim() || !start || !selectedYmd) {
      setLockPreview(null);
      setLockPreviewError(null);
      setLockPreviewLoading(false);
      return () => {};
    }
    const hoursBid = Number(estimate.hours_bid) || 0;
    if (hoursBid <= 0) {
      setLockPreview(null);
      setLockPreviewError(null);
      setLockPreviewLoading(false);
      return () => {};
    }
    let cancelled = false;
    setLockPreviewLoading(true);
    setLockPreviewError(null);
    const t = window.setTimeout(() => {
      fetch('/api/schedule/preview', {
        method: 'POST',
        headers: { ...getApiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: lockInTeamId,
          labor_hours: hoursBid,
          start_date: selectedYmd,
          estimate_type: apiEstimateType(String(estimate.estimate_type)),
          tentative: false,
          schedule_day_toggles: [],
        }),
      })
        .then(async (res) => {
          const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
          if (cancelled) {
            return;
          }
          setLockPreviewLoading(false);
          if (!res.ok) {
            const msg =
              typeof data.detail === 'string'
                ? data.detail
                : typeof data.message === 'string'
                  ? data.message
                  : 'Could not load schedule preview';
            setLockPreviewError(msg);
            setLockPreview(null);
            return;
          }
          const wd = data.work_dates;
          const end = data.end_date;
          if (Array.isArray(wd) && wd.length > 0 && typeof end === 'string') {
            const w0 = typeof wd[0] === 'string' ? wd[0].slice(0, 10) : null;
            setLockPreview({
              season_message:
                typeof data.season_message === 'string' ? data.season_message : null,
              firstWorkYmd: w0,
              endYmd: end.slice(0, 10),
            });
            setLockPreviewError(null);
          } else {
            setLockPreview(null);
          }
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          setLockPreviewLoading(false);
          setLockPreviewError('Could not load schedule preview');
          setLockPreview(null);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [
    estimate?.estimate_type,
    estimate?.hours_bid,
    estimate?.id,
    opened,
    lockInTeamId,
    selectedYmd,
  ]);

  const hoursBid = estimate?.hours_bid ?? 0;
  const teamName = teams.find((t) => t.id === lockInTeamId)?.name ?? '—';

  const scheduleErrorMessage = (body: Record<string, unknown>): string => {
    const d = body.detail;
    if (typeof d === 'string') {
      return d;
    }
    if (d && typeof d === 'object' && 'message' in d && typeof (d as { message: string }).message === 'string') {
      return (d as { message: string }).message;
    }
    if (typeof body.message === 'string') {
      return body.message;
    }
    return 'Failed to save schedule';
  };

  const performSave = async (opts?: {
    confirm_activate_job?: boolean;
    confirm_deactivate_job?: boolean;
  }) => {
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

      const payload: Record<string, unknown> = {
        team_id: lockInTeamId,
        labor_hours: hoursBid,
        start_date: startDay,
        estimate_type: apiEstimateType(String(estimate.estimate_type)),
        tentative: false,
        schedule_day_toggles: [],
      };
      if (opts?.confirm_activate_job !== undefined) {
        payload.confirm_activate_job = opts.confirm_activate_job;
      }
      if (opts?.confirm_deactivate_job !== undefined) {
        payload.confirm_deactivate_job = opts.confirm_deactivate_job;
      }

      const schRes = await fetch(`/api/schedule/estimates/${estimate.id}`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(payload),
      });
      const schErr = (await schRes.json().catch(() => ({}))) as Record<string, unknown>;
      if (!schRes.ok) {
        if (schRes.status === 409) {
          const detail = schErr.detail as { code?: string } | undefined;
          const code =
            detail && typeof detail === 'object' && typeof detail.code === 'string'
              ? detail.code
              : undefined;
          if (code === 'ACTIVATE_JOB_CONFIRM' || code === 'DEACTIVATE_JOB_CONFIRM') {
            setConflictCode(code);
            return;
          }
        }
        throw new Error(scheduleErrorMessage(schErr));
      }

      setConflictCode(null);
      onSaved();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save';
      notifications.show({ title: 'Could not save schedule', message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    await performSave();
  };

  return (
    <>
    <Modal
      opened={opened && conflictCode === null}
      onClose={onClose}
      title={
        estimate
          ? `Lock in schedule: ${estimate.title || estimate.address_street || 'Job'}`
          : 'Schedule'
      }
      size="md"
      {...modalLayoutProps}
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
          {lockPreviewLoading ? (
            <Group gap="xs">
              <Loader size="sm" />
              <Text size="xs" c="dimmed">
                Checking schedule rules…
              </Text>
            </Group>
          ) : null}
          {lockPreviewError ? (
            <Alert color="red" variant="light" title="Cannot preview this schedule">
              {lockPreviewError}
            </Alert>
          ) : null}
          {lockPreview?.season_message ? (
            <Alert color="blue" variant="light" title="Why the saved schedule may differ">
              {lockPreview.season_message}
            </Alert>
          ) : null}
          {!lockPreview?.season_message &&
          lockPreview?.firstWorkYmd &&
          selectedYmd &&
          lockPreview.firstWorkYmd !== selectedYmd ? (
            <Alert color="gray" variant="light" title="Actual first work day">
              Labor will start on{' '}
              <strong>
                {format(parseLocalDateString(lockPreview.firstWorkYmd), 'MMM d, yyyy')}
              </strong>{' '}
              (not the calendar day you selected).
            </Alert>
          ) : null}
          {lockPreview?.endYmd && lockPreview?.firstWorkYmd ? (
            <Text size="xs" c="dimmed">
              Preview: {format(parseLocalDateString(lockPreview.firstWorkYmd), 'MMM d')} –{' '}
              {format(parseLocalDateString(lockPreview.endYmd), 'MMM d, yyyy')}
            </Text>
          ) : null}
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
    <Modal
      opened={opened && conflictCode !== null}
      onClose={() => setConflictCode(null)}
      title="Confirm job status"
      {...modalLayoutProps}
    >
      <Text size="sm" mb="md">
        {conflictCode === 'ACTIVATE_JOB_CONFIRM'
          ? 'This schedule includes today (or starts today). Mark the job in progress and current on the calendar?'
          : 'The job is in progress but this schedule no longer includes today. Do you want to return the job to a scheduled status?'}
      </Text>
      <Group justify="flex-end" gap="sm">
        <Button
          variant="default"
          loading={saving}
          disabled={saving}
          onClick={() => {
            const c = conflictCode;
            if (c === 'ACTIVATE_JOB_CONFIRM') {
              performSave({ confirm_activate_job: false }).catch(() => {});
            } else if (c === 'DEACTIVATE_JOB_CONFIRM') {
              performSave({ confirm_deactivate_job: false }).catch(() => {});
            }
          }}
        >
          No, save schedule only
        </Button>
        <Button
          loading={saving}
          disabled={saving}
          onClick={() => {
            const c = conflictCode;
            if (c === 'ACTIVATE_JOB_CONFIRM') {
              performSave({ confirm_activate_job: true }).catch(() => {});
            } else if (c === 'DEACTIVATE_JOB_CONFIRM') {
              performSave({ confirm_deactivate_job: true }).catch(() => {});
            }
          }}
        >
          Yes
        </Button>
      </Group>
    </Modal>
    </>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import {
  ActionIcon,
  Anchor,
  Button,
  Card,
  Checkbox,
  Collapse,
  Container,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { DateInput, TimeInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { addDays, format, parse, subDays } from 'date-fns';
import Link from 'next/link';

import { getApiHeaders } from '@/app/utils/apiClient';
import { isSupportPainter } from '@/app/utils/roles';
import { useAuth } from '@/hooks/useAuth';
import {
  CALENDAR_LOCKED_FETCH_PADDING_DAYS,
  findNextScheduledJobFromDay,
  formatUpcomingJobStartHint,
  isFutureFirstWorkDay,
  pickPrimaryJobScheduledOnDay,
  type CalendarGridJobEvent,
} from '@/utils/calendarGridMath';

/** Must match `SHOP_TIME_ESTIMATE_ID` in job-engine jobsuite_work_time_routes.py */
const SHOP_TIME_ESTIMATE_ID = '__jobsuite_shop_time__';
/** Legacy unscoped key — removed on login so sessions are not shared across users. */
const CLOCK_STORAGE_KEY_LEGACY = 'jobsuite_my_time_clock_v1';

function clockStorageKeyForUser(userId: string): string {
  return `jobsuite_my_time_clock_v1:${userId}`;
}

type EstimateRow = { id: string; title?: string | null };

type LineAllocApi = {
  estimate_line_item_id: string;
  hours: number;
  completed: boolean;
};

type WorkTimeEntry = {
  id: string;
  estimate_id: string;
  estimate_line_item_id: string | null;
  hours: number;
  work_date: string;
  notes: string | null;
  line_allocations?: LineAllocApi[] | null;
  /** Server row is an open clock session until clock-out (hours stay 0). */
  clock_started_at?: string | null;
};

type ClockSession = {
  startedAt: string;
  estimateId: string;
  label: string;
  /** Persisted open work-time row; clock-out uses PUT instead of POST. */
  openEntryId?: string;
};

type LineItemRow = { id: string; title: string; estimatedHours: number };

type PerLineState = {
  include: boolean;
  hoursH: number;
  hoursM: number;
  completed: boolean;
};

/** Whole minutes elapsed for the active clock session (minimum 1). */
function getElapsedMinutes(session: ClockSession): number {
  const end = new Date();
  const start = new Date(session.startedAt);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
}

function getElapsedHours(session: ClockSession): number {
  const m = getElapsedMinutes(session);
  return Math.max(0.01, Math.round((m / 60) * 100) / 100);
}

/** Live hours for a list row backed by an open clock (matches server effective hours). */
function displayHoursForOpenEntry(row: WorkTimeEntry, liveTick: number): number {
  if (!row.clock_started_at) {
    return row.hours;
  }
  const start = new Date(row.clock_started_at);
  const min = Math.max(1, Math.round((Date.now() - start.getTime()) / 60000));
  const h = Math.max(0.01, Math.round((min / 60) * 100) / 100);
  return h + liveTick * 0;
}

/** Formats a duration given as decimal hours (API shape) for display, e.g. 1.5 → "1h 30m". */
function formatDecimalHoursForDisplay(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) {
    return '0m';
  }
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) {
    return `${m}m`;
  }
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}

/** Formats elapsed minutes as "Xh Ym" (no seconds — used for totals in modals). */
function formatMinutesAsHm(totalMin: number): string {
  if (!Number.isFinite(totalMin) || totalMin <= 0) {
    return '0m';
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) {
    return `${m}m`;
  }
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}

function hmToMinutes(h: number, m: number): number {
  const hh = Number.isFinite(h) ? Math.max(0, Math.floor(h)) : 0;
  const mm = Number.isFinite(m) ? Math.min(59, Math.max(0, Math.floor(m))) : 0;
  return hh * 60 + mm;
}

function hmPartsToDecimalHours(h: number, m: number): number {
  return Math.round((hmToMinutes(h, m) / 60) * 100) / 100;
}

/** Split whole minutes across line items in list order; remainder goes to earlier lines. */
function splitMinutesAcrossLines(
  totalMin: number,
  lineIdsInOrder: string[]
): Record<string, { h: number; m: number }> {
  const n = lineIdsInOrder.length;
  const out: Record<string, { h: number; m: number }> = {};
  if (n === 0 || totalMin <= 0) {
    return out;
  }
  const base = Math.floor(totalMin / n);
  const rem = totalMin - base * n;
  for (let i = 0; i < n; i += 1) {
    const mins = base + (i < rem ? 1 : 0);
    const id = lineIdsInOrder[i];
    out[id] = { h: Math.floor(mins / 60), m: mins % 60 };
  }
  return out;
}

function canManageTimeEntriesRole(role: string | undefined): boolean {
  if (!role) {
    return false;
  }
  return role === 'admin' || role === 'manager' || role === 'office';
}

function EntryLineItemsCell({
  row,
  lineTitle,
}: {
  row: WorkTimeEntry;
  lineTitle: (lineItemId: string) => string;
}) {
  if (row.line_allocations && row.line_allocations.length > 0) {
    return (
      <Stack gap={6}>
        {row.line_allocations.map((a) => (
          <Text key={a.estimate_line_item_id} size="xs" component="div">
            <Text span fw={500}>
              {lineTitle(a.estimate_line_item_id)}
            </Text>
            <Text span c="dimmed">
              : {formatDecimalHoursForDisplay(a.hours)}
            </Text>
            {a.completed ? (
              <Text span c="green.7" fw={700} ml={4}>
                ✓
              </Text>
            ) : null}
          </Text>
        ))}
      </Stack>
    );
  }
  if (row.estimate_line_item_id) {
    return (
      <Text size="xs" fw={500}>
        {lineTitle(row.estimate_line_item_id)}
      </Text>
    );
  }
  return (
    <Text size="xs" c="dimmed">
      —
    </Text>
  );
}

function localDateTimeFromParts(day: Date, timeStr: string): Date {
  const parts = timeStr.trim().split(':').map((x) => parseInt(x, 10));
  const h = Number.isFinite(parts[0]) ? parts[0] : 0;
  const m = Number.isFinite(parts[1]) ? parts[1] : 0;
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

function hoursBetweenStartEnd(start: Date, end: Date): number {
  let endMs = end.getTime();
  if (endMs <= start.getTime()) {
    endMs += 24 * 60 * 60 * 1000;
  }
  return Math.max(0.01, Math.round(((endMs - start.getTime()) / 3600000) * 100) / 100);
}

export function MyTimePage() {
  const { user, isLoading: authLoading } = useAuth({ fetchUser: true });

  const [estimates, setEstimates] = useState<EstimateRow[]>([]);
  const [loadingEstimates, setLoadingEstimates] = useState(true);
  const [calEvents, setCalEvents] = useState<CalendarGridJobEvent[]>([]);
  const [loadingCal, setLoadingCal] = useState(true);
  const [entries, setEntries] = useState<WorkTimeEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [saving, setSaving] = useState(false);

  const [session, setSession] = useState<ClockSession | null>(null);
  const [clockTick, tickClock] = useReducer((n: number) => n + 1, 0);

  const [clockInModalOpen, setClockInModalOpen] = useState(false);
  const [modalShopMode, setModalShopMode] = useState(false);
  const [modalEstimateId, setModalEstimateId] = useState<string | null>(null);

  const [clockOutModalOpen, setClockOutModalOpen] = useState(false);
  const [clockOutLineItems, setClockOutLineItems] = useState<LineItemRow[]>([]);
  const [loadingClockOutLines, setLoadingClockOutLines] = useState(false);
  const [clockOutPerLine, setClockOutPerLine] = useState<Record<string, PerLineState>>({});
  const [clockOutNotes, setClockOutNotes] = useState('');

  const [manualOpen, setManualOpen] = useState(false);
  const [manualDate, setManualDate] = useState<Date | null>(() => new Date());
  const [manualStart, setManualStart] = useState('08:00');
  const [manualEnd, setManualEnd] = useState('17:00');
  const [manualShop, setManualShop] = useState(false);
  const [manualEstimateId, setManualEstimateId] = useState<string | null>(null);
  const [manualNotes, setManualNotes] = useState('');
  /**
   * Titles for estimate IDs not in time-entry-eligible (from GET /api/estimates/:id).
   */
  const [jobTitlesById, setJobTitlesById] = useState<Record<string, string>>({});
  const estimateTitleFetchAttemptedRef = useRef<Set<string>>(new Set());

  const [lineItemTitlesById, setLineItemTitlesById] = useState<Record<string, string>>({});
  const lineItemsFetchedForEstimateRef = useRef<Set<string>>(new Set());

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkTimeEntry | null>(null);
  const [editHours, setEditHours] = useState<number>(0);
  const [editWorkDate, setEditWorkDate] = useState<Date | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const rangeTo = format(new Date(), 'yyyy-MM-dd');
  const rangeFrom = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const calFrom = format(subDays(new Date(), CALENDAR_LOCKED_FETCH_PADDING_DAYS), 'yyyy-MM-dd');
  const calTo = format(addDays(new Date(), CALENDAR_LOCKED_FETCH_PADDING_DAYS), 'yyyy-MM-dd');

  const loadEstimates = useCallback(async () => {
    setLoadingEstimates(true);
    try {
      const res = await fetch('/api/estimates/time-entry-eligible', {
        headers: getApiHeaders(),
      });
      if (!res.ok) {
        throw new Error('Failed to load jobs');
      }
      const body = await res.json();
      setEstimates(Array.isArray(body) ? body : []);
    } catch (e) {
      notifications.show({
        title: 'Jobs',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    } finally {
      setLoadingEstimates(false);
    }
  }, []);

  const loadCalendar = useCallback(async () => {
    setLoadingCal(true);
    try {
      const res = await fetch(
        `/api/schedule/calendar?from=${calFrom}&to=${calTo}&only_my_teams=true`,
        { headers: getApiHeaders() }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load schedule');
      }
      const data = await res.json();
      setCalEvents(Array.isArray(data) ? (data as CalendarGridJobEvent[]) : []);
    } catch (e) {
      notifications.show({
        title: 'Schedule',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
      setCalEvents([]);
    } finally {
      setLoadingCal(false);
    }
  }, [calFrom, calTo]);

  const loadEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const res = await fetch(
        `/api/jobsuite-work-time?from=${rangeFrom}&to=${rangeTo}`,
        { headers: getApiHeaders() }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load entries');
      }
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      notifications.show({
        title: 'Time entries',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    } finally {
      setLoadingEntries(false);
    }
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    loadEstimates();
  }, [loadEstimates]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    if (clockOutModalOpen && session && session.estimateId !== SHOP_TIME_ESTIMATE_ID) {
      const run = async () => {
        setLoadingClockOutLines(true);
        try {
          const res = await fetch(`/api/estimates/${session.estimateId}/line-items`, {
            headers: getApiHeaders(),
          });
          if (!res.ok) {
            if (!cancelled) {
              setClockOutLineItems([]);
              setClockOutPerLine({});
            }
            return;
          }
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.Items ?? [];
          if (cancelled) {
            return;
          }
          const rows: LineItemRow[] = list.map(
            (li: { id: string; title: string; hours?: number | string }) => {
              const h =
                typeof li.hours === 'string' ? parseFloat(li.hours) : Number(li.hours ?? 0);
              return {
                id: li.id,
                title: li.title,
                estimatedHours: Number.isFinite(h) ? h : 0,
              };
            }
          );
          setClockOutLineItems(rows);
          const next: Record<string, PerLineState> = {};
          for (const li of rows) {
            next[li.id] = { include: false, hoursH: 0, hoursM: 0, completed: false };
          }
          setClockOutPerLine(next);
        } catch {
          if (!cancelled) {
            setClockOutLineItems([]);
            setClockOutPerLine({});
          }
        } finally {
          if (!cancelled) {
            setLoadingClockOutLines(false);
          }
        }
      };
      run().catch(() => {});
      cleanup = () => {
        cancelled = true;
      };
    }

    return () => {
      cleanup?.();
    };
  }, [clockOutModalOpen, session]);

  const calendarTitleByEstimateId = useMemo(() => {
    const m: Record<string, string> = {};
    for (const ev of calEvents) {
      const id = ev.estimate_id?.trim();
      const t = ev.title?.trim();
      if (id && t && !m[id]) {
        m[id] = t;
      }
    }
    return m;
  }, [calEvents]);

  useEffect(() => {
    const fromEntries = new Set(
      entries
        .map((e) => e.estimate_id)
        .filter((id): id is string => Boolean(id) && id !== SHOP_TIME_ESTIMATE_ID)
    );
    const eligibleIds = new Set(estimates.map((e) => e.id));

    async function fetchEstimateTitle(estimateId: string) {
      try {
        const res = await fetch(`/api/estimates/${estimateId}`, {
          headers: getApiHeaders(),
        });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as { title?: string | null };
        const t = typeof data?.title === 'string' ? data.title.trim() : '';
        if (t) {
          setJobTitlesById((prev) => (prev[estimateId] ? prev : { ...prev, [estimateId]: t }));
        }
      } catch {
        /* ignore */
      }
    }

    fromEntries.forEach((id) => {
      if (eligibleIds.has(id) || calendarTitleByEstimateId[id]) {
        return;
      }
      if (estimateTitleFetchAttemptedRef.current.has(id)) {
        return;
      }
      estimateTitleFetchAttemptedRef.current.add(id);
      fetchEstimateTitle(id).catch(() => {});
    });
  }, [entries, estimates, calendarTitleByEstimateId]);

  useEffect(() => {
    const needLineTitles = new Set<string>();
    for (const e of entries) {
      const eid = e.estimate_id?.trim();
      if (eid && eid !== SHOP_TIME_ESTIMATE_ID) {
        if (e.line_allocations?.length || e.estimate_line_item_id) {
          needLineTitles.add(eid);
        }
      }
    }
    needLineTitles.forEach((estimateId) => {
      if (lineItemsFetchedForEstimateRef.current.has(estimateId)) {
        return;
      }
      lineItemsFetchedForEstimateRef.current.add(estimateId);
      (async () => {
        try {
          const res = await fetch(`/api/estimates/${estimateId}/line-items`, {
            headers: getApiHeaders(),
          });
          if (!res.ok) {
            return;
          }
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.Items ?? [];
          setLineItemTitlesById((prev) => {
            const next = { ...prev };
            for (const li of list as { id?: string; title?: string }[]) {
              const id = typeof li.id === 'string' ? li.id.trim() : '';
              const title = typeof li.title === 'string' ? li.title.trim() : '';
              if (id && title) {
                next[id] = title;
              }
            }
            return next;
          });
        } catch {
          /* ignore */
        }
      })().catch(() => {});
    });
  }, [entries]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!user?.id) {
      if (!authLoading) {
        setSession(null);
      }
      return;
    }
    try {
      localStorage.removeItem(CLOCK_STORAGE_KEY_LEGACY);
      const raw = localStorage.getItem(clockStorageKeyForUser(user.id));
      if (!raw) {
        setSession(null);
        return;
      }
      const s = JSON.parse(raw) as ClockSession;
      if (s.startedAt && s.estimateId && s.label) {
        setSession(s);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    }
  }, [user?.id, authLoading]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !user?.id) {
        return;
      }
      const key = clockStorageKeyForUser(user.id);
      if (!session) {
        localStorage.removeItem(key);
        return;
      }
      localStorage.setItem(key, JSON.stringify(session));
    } catch {
      /* ignore */
    }
  }, [session, user?.id]);

  useEffect(() => {
    const needLiveTick =
      session !== null || entries.some((e) => Boolean(e.clock_started_at));
    if (!needLiveTick) {
      return undefined;
    }
    const id = window.setInterval(() => tickClock(), 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [session, entries]);

  const suggestedJob = useMemo(
    () => pickPrimaryJobScheduledOnDay(calEvents, new Date()),
    [calEvents]
  );

  const nextScheduled = useMemo(
    () => findNextScheduledJobFromDay(calEvents, new Date()),
    [calEvents]
  );

  /** Prefer “today” job; otherwise next calendar work day (e.g. job starting next week). */
  const scheduleContextJob = suggestedJob ?? nextScheduled?.event ?? null;

  const estimateOptions = useMemo(
    () =>
      estimates.map((e) => ({
        value: e.id,
        label: (e.title || '').trim() || e.id,
      })),
    [estimates]
  );

  const estimateOptionsWithScheduleFallback = useMemo(() => {
    const opts = [...estimateOptions];
    const ids = new Set(opts.map((o) => o.value));
    const addIfMissing = (
      estimateId: string | null | undefined,
      title: string | null | undefined
    ) => {
      const sid = estimateId?.trim();
      if (!sid || ids.has(sid)) {
        return;
      }
      ids.add(sid);
      opts.unshift({
        value: sid,
        label: (title || '').trim() || sid,
      });
    };
    addIfMissing(suggestedJob?.estimate_id, suggestedJob?.title);
    addIfMissing(nextScheduled?.event.estimate_id, nextScheduled?.event.title);
    return opts;
  }, [estimateOptions, suggestedJob, nextScheduled]);

  useEffect(() => {
    if (!clockInModalOpen) {
      return;
    }
    setModalShopMode(false);
    setModalEstimateId(
      scheduleContextJob?.estimate_id?.trim() ?? estimates[0]?.id ?? null
    );
  }, [clockInModalOpen, scheduleContextJob, estimates]);

  const estimateTitle = useCallback(
    (id: string) => {
      if (id === SHOP_TIME_ESTIMATE_ID) {
        return 'Shop time';
      }
      const fromEligible = estimates.find((e) => e.id === id)?.title?.trim();
      if (fromEligible) {
        return fromEligible;
      }
      const fromCalendar = calendarTitleByEstimateId[id]?.trim();
      if (fromCalendar) {
        return fromCalendar;
      }
      const fetched = jobTitlesById[id]?.trim();
      if (fetched) {
        return fetched;
      }
      return id;
    },
    [estimates, calendarTitleByEstimateId, jobTitlesById]
  );

  const lineItemTitle = useCallback(
    (lineItemId: string) => {
      const t = lineItemTitlesById[lineItemId]?.trim();
      if (t) {
        return t;
      }
      return lineItemId.length > 12 ? `${lineItemId.slice(0, 8)}…` : lineItemId;
    },
    [lineItemTitlesById]
  );

  const canManageEntries = useMemo(
    () => canManageTimeEntriesRole(user?.role),
    [user?.role]
  );

  const supportPainterSession = useMemo(
    () => isSupportPainter(user?.role),
    [user?.role]
  );

  const openClockInModal = () => {
    setClockInModalOpen(true);
  };

  const closeClockOutModal = () => {
    setClockOutModalOpen(false);
    setClockOutNotes('');
  };

  const performClockOutSubmit = async (opts: {
    shop?: boolean;
    lineAllocations?: LineAllocApi[];
    notes?: string | null;
  }) => {
    if (!session) {
      return;
    }
    const hours = getElapsedHours(session);
    const workDate = format(new Date(), 'yyyy-MM-dd');

    setSaving(true);
    try {
      const closeOpenRow = Boolean(session.openEntryId);

      if (closeOpenRow) {
        const body: Record<string, unknown> = {
          hours,
          work_date: workDate,
          notes: opts.notes?.trim() ? opts.notes.trim() : null,
          clock_started_at: null,
        };
        if (!opts.shop && opts.lineAllocations && opts.lineAllocations.length > 0) {
          body.line_allocations = opts.lineAllocations;
        }
        const res = await fetch(`/api/jobsuite-work-time/${session.openEntryId}`, {
          method: 'PUT',
          headers: getApiHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Save failed');
        }
      } else {
        const body: Record<string, unknown> = {
          hours,
          work_date: workDate,
          notes: opts.notes?.trim() ? opts.notes.trim() : null,
        };
        if (opts.shop) {
          body.is_shop_time = true;
        } else {
          body.estimate_id = session.estimateId;
          if (opts.lineAllocations && opts.lineAllocations.length > 0) {
            body.line_allocations = opts.lineAllocations;
          }
        }

        const res = await fetch('/api/jobsuite-work-time', {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Save failed');
        }
      }

      notifications.show({
        title: 'Clocked out',
        message: `${formatDecimalHoursForDisplay(hours)} logged`,
        color: 'green',
      });
      setSession(null);
      closeClockOutModal();
      setClockOutLineItems([]);
      setClockOutPerLine({});
      await loadEntries();
    } catch (e) {
      notifications.show({
        title: 'Clock out failed',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const beginClockOut = () => {
    if (!session) {
      return;
    }
    if (session.estimateId === SHOP_TIME_ESTIMATE_ID) {
      performClockOutSubmit({ shop: true }).catch(() => {});
      return;
    }
    setClockOutModalOpen(true);
  };

  const submitClockOutFromModal = () => {
    if (!session) {
      return;
    }
    const totalMin = getElapsedMinutes(session);
    const allocations: LineAllocApi[] = [];
    let allocMin = 0;
    for (const li of clockOutLineItems) {
      const st = clockOutPerLine[li.id];
      if (st?.include) {
        const hh = Number(st.hoursH) || 0;
        const mm = Number(st.hoursM) || 0;
        if (hh <= 0 && mm <= 0) {
          notifications.show({
            message: `Enter time for "${li.title}" or uncheck it`,
            color: 'orange',
          });
          return;
        }
        allocMin += hmToMinutes(hh, mm);
        allocations.push({
          estimate_line_item_id: li.id,
          hours: hmPartsToDecimalHours(hh, mm),
          completed: supportPainterSession ? false : Boolean(st.completed),
        });
      }
    }
    if (allocations.length > 0 && allocMin > totalMin) {
      notifications.show({
        message: `Line item time (${formatMinutesAsHm(allocMin)}) cannot exceed total (${formatMinutesAsHm(totalMin)})`,
        color: 'red',
      });
      return;
    }
    performClockOutSubmit({
      lineAllocations: allocations.length > 0 ? allocations : undefined,
      notes: clockOutNotes,
    }).catch(() => {});
  };

  const confirmClockIn = async () => {
    const workDate = format(new Date(), 'yyyy-MM-dd');
    const startedIso = new Date().toISOString();

    if (modalShopMode) {
      setSaving(true);
      try {
        const res = await fetch('/api/jobsuite-work-time', {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({
            is_shop_time: true,
            hours: 0,
            work_date: workDate,
            clock_started_at: startedIso,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Clock-in failed');
        }
        const data = (await res.json()) as {
          id: string;
          clock_started_at?: string | null;
        };
        const startAt =
          typeof data.clock_started_at === 'string' ? data.clock_started_at : startedIso;
        setSession({
          startedAt: startAt,
          estimateId: SHOP_TIME_ESTIMATE_ID,
          label: 'Shop time',
          openEntryId: data.id,
        });
        setClockInModalOpen(false);
        notifications.show({ title: 'Clocked in', message: 'Shop time', color: 'green' });
        await loadEntries();
      } catch (e) {
        notifications.show({
          title: 'Clock-in failed',
          message: e instanceof Error ? e.message : 'Error',
          color: 'red',
        });
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!modalEstimateId) {
      notifications.show({
        message: 'Choose a job from the list or clock in as Shop time',
        color: 'orange',
      });
      return;
    }
    const label =
      estimateOptionsWithScheduleFallback.find((o) => o.value === modalEstimateId)?.label ??
      'Job';

    setSaving(true);
    try {
      const res = await fetch('/api/jobsuite-work-time', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          estimate_id: modalEstimateId,
          hours: 0,
          work_date: workDate,
          clock_started_at: startedIso,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Clock-in failed');
      }
      const data = (await res.json()) as {
        id: string;
        clock_started_at?: string | null;
      };
      const startAt =
        typeof data.clock_started_at === 'string' ? data.clock_started_at : startedIso;
      setSession({
        startedAt: startAt,
        estimateId: modalEstimateId,
        label,
        openEntryId: data.id,
      });
      setClockInModalOpen(false);
      notifications.show({ title: 'Clocked in', message: label, color: 'green' });
      await loadEntries();
    } catch (e) {
      notifications.show({
        title: 'Clock-in failed',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const submitManual = async () => {
    if (!manualDate) {
      notifications.show({ message: 'Choose a date', color: 'orange' });
      return;
    }
    if (manualShop) {
      const start = localDateTimeFromParts(manualDate, manualStart);
      const end = localDateTimeFromParts(manualDate, manualEnd);
      const hours = hoursBetweenStartEnd(start, end);
      setSaving(true);
      try {
        const res = await fetch('/api/jobsuite-work-time', {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({
            is_shop_time: true,
            hours,
            work_date: format(manualDate, 'yyyy-MM-dd'),
            notes: manualNotes.trim() || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Save failed');
        }
        notifications.show({ title: 'Saved', message: 'Manual entry added', color: 'green' });
        setManualNotes('');
        await loadEntries();
      } catch (e) {
        notifications.show({
          title: 'Save failed',
          message: e instanceof Error ? e.message : 'Error',
          color: 'red',
        });
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!manualEstimateId) {
      notifications.show({ message: 'Choose a job or Shop time', color: 'orange' });
      return;
    }
    const start = localDateTimeFromParts(manualDate, manualStart);
    const end = localDateTimeFromParts(manualDate, manualEnd);
    const hours = hoursBetweenStartEnd(start, end);

    setSaving(true);
    try {
      const res = await fetch('/api/jobsuite-work-time', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          estimate_id: manualEstimateId,
          hours,
          work_date: format(manualDate, 'yyyy-MM-dd'),
          notes: manualNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Save failed');
      }
      notifications.show({ title: 'Saved', message: 'Manual entry added', color: 'green' });
      setManualNotes('');
      await loadEntries();
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

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/jobsuite-work-time/${id}`, {
        method: 'DELETE',
        headers: getApiHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Delete failed');
      }
      notifications.show({ message: 'Deleted', color: 'green' });
      await loadEntries();
    } catch (e) {
      notifications.show({
        message: e instanceof Error ? e.message : 'Delete failed',
        color: 'red',
      });
    }
  };

  const closeEditEntryModal = () => {
    setEditModalOpen(false);
    setEditingEntry(null);
  };

  const openEditEntry = (row: WorkTimeEntry) => {
    setEditingEntry(row);
    setEditHours(row.hours);
    const day = row.work_date?.trim()
      ? parse(row.work_date.trim().slice(0, 10), 'yyyy-MM-dd', new Date())
      : new Date();
    setEditWorkDate(day);
    setEditNotes(row.notes ?? '');
    setEditModalOpen(true);
  };

  const saveEditEntry = async () => {
    if (!editingEntry || !editWorkDate) {
      notifications.show({ message: 'Choose a date', color: 'orange' });
      return;
    }
    if (!Number.isFinite(editHours) || editHours <= 0) {
      notifications.show({ message: 'Enter valid hours', color: 'orange' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/jobsuite-work-time/${editingEntry.id}`, {
        method: 'PUT',
        headers: getApiHeaders(),
        body: JSON.stringify({
          hours: editHours,
          work_date: format(editWorkDate, 'yyyy-MM-dd'),
          notes: editNotes.trim() ? editNotes.trim() : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Save failed');
      }
      notifications.show({ title: 'Saved', message: 'Time entry updated', color: 'green' });
      closeEditEntryModal();
      await loadEntries();
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

  const cardSurface = {
    backgroundColor: '#fff',
    color: 'var(--mantine-color-dark-9)',
  } as const;

  const elapsedLabel = useMemo(() => {
    if (!session) {
      return '';
    }
    const start = new Date(session.startedAt);
    const ms = Date.now() - start.getTime();
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [session, clockTick]);

  /** Live total duration for clock-out modal (updates while open). */
  const clockOutDurationLabel = useMemo(() => {
    if (!session) {
      return '';
    }
    return formatMinutesAsHm(getElapsedMinutes(session));
  }, [session, clockTick]);

  const totalIncludedAllocatedMinutes = useCallback(
    (perLine: Record<string, PerLineState>, excludedLineId?: string) => {
      let sum = 0;
      for (const li of clockOutLineItems) {
        if (!excludedLineId || li.id !== excludedLineId) {
          const st = perLine[li.id];
          if (st?.include) {
            sum += hmToMinutes(Number(st.hoursH) || 0, Number(st.hoursM) || 0);
          }
        }
      }
      return sum;
    },
    [clockOutLineItems]
  );

  const rebalanceClockOutMinutes = useCallback(
    (params: { lineId: string; nextMinutesForLine: number }) => {
      if (!session) {
        return;
      }
      const { lineId, nextMinutesForLine } = params;
      const totalMin = getElapsedMinutes(session);

      setClockOutPerLine((prev) => {
        const draft: Record<string, PerLineState> = { ...prev };
        const cur = draft[lineId] ?? { include: true, hoursH: 0, hoursM: 0, completed: false };
        if (!cur.include) {
          return prev;
        }

        // Clamp edited line; keep totals fully allocated across included lines.
        const otherMin = totalIncludedAllocatedMinutes(prev, lineId);
        const maxForEdited = Math.max(0, totalMin - otherMin);
        const editedMin = Math.max(0, Math.min(totalMin, Math.floor(nextMinutesForLine)));
        const clampedEditedMin = Math.min(editedMin, maxForEdited);
        draft[lineId] = {
          ...cur,
          hoursH: Math.floor(clampedEditedMin / 60),
          hoursM: clampedEditedMin % 60,
        };

        const includedOtherIds = clockOutLineItems
          .filter((x) => x.id !== lineId && draft[x.id]?.include)
          .map((x) => x.id);

        const remaining = Math.max(0, totalMin - clampedEditedMin);
        const split = splitMinutesAcrossLines(remaining, includedOtherIds);

        const next: Record<string, PerLineState> = {};
        for (const li of clockOutLineItems) {
          const st = draft[li.id] ?? { include: false, hoursH: 0, hoursM: 0, completed: false };
          next[li.id] = !st.include
            ? { include: false, hoursH: 0, hoursM: 0, completed: false }
            : li.id === lineId
              ? draft[li.id]
              : {
                  ...st,
                  hoursH: split[li.id] ? split[li.id].h : 0,
                  hoursM: split[li.id] ? split[li.id].m : 0,
                };
        }
        return next;
      });
    },
    [clockOutLineItems, session, totalIncludedAllocatedMinutes]
  );

  const loadingHeader = loadingEstimates || loadingCal;

  return (
    <Container size="sm" py="xl">
      <Group justify="space-between" mb="md">
        <Title order={2} c="gray.0">
          My time
        </Title>
        <Button component={Link} href="/my-schedule" variant="light" size="sm">
          My schedule
        </Button>
      </Group>

      <Stack gap="lg">
        <Card withBorder radius="md" p="lg" style={cardSurface}>
          {loadingHeader ? (
            <Loader size="sm" />
          ) : session ? (
            <Stack gap="md" align="center">
              <Text size="sm" c="dimmed" tt="uppercase" fw={600}>
                Clocked in
              </Text>
              <Text fw={700} size="xl">
                {session.label}
              </Text>
              <Text size="sm" c="dimmed">
                Since {format(new Date(session.startedAt), 'h:mm a')}
              </Text>
              <Text fw={600} style={{ fontVariantNumeric: 'tabular-nums' }} size="xl">
                {elapsedLabel}
              </Text>
              <Button
                color="red"
                size="lg"
                fullWidth
                onClick={beginClockOut}
                loading={saving}
              >
                Clock out
              </Button>
            </Stack>
          ) : (
            <Stack gap="md" align="center">
              <Text size="sm" ta="center" c="dimmed">
                {suggestedJob?.title ? (
                  <>
                    Today&apos;s schedule:{' '}
                    <Text span fw={600} c="var(--mantine-color-dark-9)">
                      {(suggestedJob.title || '').trim() || 'Job'}
                    </Text>
                  </>
                ) : nextScheduled &&
                  nextScheduled.event.title?.trim() &&
                  isFutureFirstWorkDay(nextScheduled.firstWorkDay) ? (
                  <>
                    Next on your calendar:{' '}
                    <Text span fw={600} c="var(--mantine-color-dark-9)">
                      {(nextScheduled.event.title || '').trim()}
                    </Text>
                    {' — '}
                    {formatUpcomingJobStartHint(nextScheduled.firstWorkDay)}
                  </>
                ) : (
                  'No job on your calendar in the next few months — pick a job when you clock in.'
                )}
              </Text>
              <Button size="xl" fullWidth onClick={openClockInModal}>
                Clock in
              </Button>
            </Stack>
          )}
        </Card>

        <Modal
          opened={clockInModalOpen}
          onClose={() => setClockInModalOpen(false)}
          title="Clock in"
          centered
        >
          <Stack gap="md">
            {modalShopMode ? (
              <Text size="sm">
                You are clocking in as <strong>Shop time</strong> (not tied to a customer job).
              </Text>
            ) : suggestedJob?.estimate_id ? (
              <Text size="sm">
                You are clocking in for{' '}
                <strong>{(suggestedJob.title || '').trim() || 'this job'}</strong>.
              </Text>
            ) : nextScheduled?.event.estimate_id ? (
              <Text size="sm">
                Nothing on your schedule for today. Next up:{' '}
                <strong>{(nextScheduled.event.title || '').trim() || 'Scheduled job'}</strong>
                {isFutureFirstWorkDay(nextScheduled.firstWorkDay) ? (
                  <>
                    {' '}
                    — <strong>{formatUpcomingJobStartHint(nextScheduled.firstWorkDay)}</strong>
                  </>
                ) : null}
                . You can still clock in to that job below, choose another, or use Shop time.
              </Text>
            ) : (
              <Text size="sm">
                No upcoming job on your calendar in the next few months. Choose a job below if you
                have one, or use Shop time.
              </Text>
            )}

            <Select
              label="Job"
              placeholder="Select job"
              data={estimateOptionsWithScheduleFallback}
              value={modalShopMode ? null : modalEstimateId}
              onChange={(v) => {
                setModalShopMode(false);
                setModalEstimateId(v);
              }}
              disabled={modalShopMode}
              searchable
              nothingFoundMessage={
                scheduleContextJob?.estimate_id
                  ? 'Type to search'
                  : 'No jobs in the list — try Shop time or ask your admin'
              }
            />

            <Group grow>
              <Button
                variant={modalShopMode ? 'filled' : 'light'}
                onClick={() => {
                  setModalShopMode(true);
                  setModalEstimateId(null);
                }}
              >
                Shop time
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  setModalShopMode(false);
                  setModalEstimateId(
                    scheduleContextJob?.estimate_id?.trim() ?? estimates[0]?.id ?? null
                  );
                }}
              >
                Use calendar job
              </Button>
            </Group>

            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={() => setClockInModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  confirmClockIn().catch(() => {});
                }}
                loading={saving}
              >
                Clock in
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={clockOutModalOpen}
          onClose={closeClockOutModal}
          title="Clock out"
          centered
          size="md"
        >
          {session ? (
            <Stack gap="md">
              <Text size="sm">
                <strong>{session.label}</strong> — total time{' '}
                <strong>{clockOutDurationLabel}</strong>
              </Text>
              <Text size="xs" c="dimmed">
                Optionally split time across line items. Allocated time cannot exceed the total
                above. Leave all lines unchecked to log the full amount to the job without a
                line-by-line breakdown. Checking lines fills hours and minutes automatically (one
                line gets the full time; several lines split evenly — you can edit before logging).
              </Text>
              <Textarea
                label="Notes (optional)"
                value={clockOutNotes}
                onChange={(e) => setClockOutNotes(e.currentTarget.value)}
                minRows={2}
              />
              {loadingClockOutLines ? (
                <Loader size="sm" />
              ) : clockOutLineItems.length > 0 ? (
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    Line items
                  </Text>
                  {clockOutLineItems.map((li) => {
                    const st = clockOutPerLine[li.id] ?? {
                      include: false,
                      hoursH: 0,
                      hoursM: 0,
                      completed: false,
                    };
                    const est = Number(li.estimatedHours);
                    const estLabel = Number.isFinite(est)
                      ? ` (${formatDecimalHoursForDisplay(est)} est.)`
                      : '';
                    return (
                      <Card key={li.id} withBorder p="sm" radius="sm" style={cardSurface}>
                        <Checkbox
                          label={
                            <Group gap={8} wrap="nowrap" align="center">
                              <Text span size="sm" fw={500}>
                                {li.title}
                              </Text>
                              <Text span size="sm" c="dimmed">
                                {estLabel}
                              </Text>
                            </Group>
                          }
                          checked={st.include}
                          onChange={(e) => {
                            const { checked } = e.currentTarget;
                            setClockOutPerLine((prev) => {
                              const base = prev[li.id] ?? {
                                include: false,
                                hoursH: 0,
                                hoursM: 0,
                                completed: false,
                              };
                              const draft: Record<string, PerLineState> = {
                                ...prev,
                                [li.id]: { ...base, include: checked },
                              };
                              const includedOrdered = clockOutLineItems
                                .filter((x) => draft[x.id]?.include)
                                .map((x) => x.id);
                              const totalMin = session ? getElapsedMinutes(session) : 0;
                              const split = splitMinutesAcrossLines(totalMin, includedOrdered);
                              const next: Record<string, PerLineState> = {};
                              for (const row of clockOutLineItems) {
                                const inc = Boolean(draft[row.id]?.include);
                                const parts = split[row.id];
                                next[row.id] = {
                                  include: inc,
                                  hoursH: inc && parts ? parts.h : 0,
                                  hoursM: inc && parts ? parts.m : 0,
                                  completed: inc ? draft[row.id]?.completed ?? false : false,
                                };
                              }
                              return next;
                            });
                          }}
                        />
                        {st.include ? (
                          <Group gap="md" mt="xs" wrap="wrap" align="flex-end">
                            <NumberInput
                              label="Hours"
                              value={st.hoursH}
                              onChange={(v) => {
                                const hh = typeof v === 'number' ? v : 0;
                                const mm = Number(st.hoursM) || 0;
                                rebalanceClockOutMinutes({
                                  lineId: li.id,
                                  nextMinutesForLine: hmToMinutes(hh, mm),
                                });
                              }}
                              min={0}
                              max={999}
                              size="sm"
                              w={100}
                            />
                            <NumberInput
                              label="Minutes"
                              value={st.hoursM}
                              onChange={(v) => {
                                const mmRaw = typeof v === 'number' ? v : 0;
                                const mm = Math.min(59, Math.max(0, Math.floor(mmRaw)));
                                const hh = Number(st.hoursH) || 0;
                                rebalanceClockOutMinutes({
                                  lineId: li.id,
                                  nextMinutesForLine: hmToMinutes(hh, mm),
                                });
                              }}
                              min={0}
                              max={59}
                              size="sm"
                              w={100}
                            />
                            {!supportPainterSession ? (
                              <Checkbox
                                label="Mark line item complete"
                                checked={st.completed}
                                onChange={(e) =>
                                  setClockOutPerLine((prev) => ({
                                    ...prev,
                                    [li.id]: {
                                      ...(prev[li.id] ?? st),
                                      completed: e.currentTarget.checked,
                                    },
                                  }))
                                }
                              />
                            ) : null}
                          </Group>
                        ) : null}
                      </Card>
                    );
                  })}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  No line items on this estimate — all hours will be logged to the job.
                </Text>
              )}
              <Group justify="flex-end" mt="xs">
                <Button variant="default" onClick={closeClockOutModal}>
                  Cancel
                </Button>
                <Button onClick={submitClockOutFromModal} loading={saving}>
                  Log time
                </Button>
              </Group>
            </Stack>
          ) : null}
        </Modal>

        <Modal
          opened={editModalOpen}
          onClose={closeEditEntryModal}
          title="Edit time entry"
          centered
        >
          {editingEntry ? (
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                {estimateTitle(editingEntry.estimate_id)}
              </Text>
              <DateInput label="Date" value={editWorkDate} onChange={setEditWorkDate} />
              <NumberInput
                label="Hours"
                value={editHours}
                onChange={(v) => setEditHours(typeof v === 'number' ? v : 0)}
                min={0.01}
                step={0.01}
                decimalScale={2}
              />
              <Textarea
                label="Notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.currentTarget.value)}
                minRows={2}
              />
              <Group justify="flex-end">
                <Button variant="default" onClick={closeEditEntryModal}>
                  Cancel
                </Button>
                <Button onClick={() => saveEditEntry().catch(() => {})} loading={saving}>
                  Save
                </Button>
              </Group>
            </Stack>
          ) : null}
        </Modal>

        <Card withBorder radius="md" p="md" style={cardSurface}>
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Text fw={600} size="sm">
                Manual time entry
              </Text>
              <Anchor
                component="button"
                type="button"
                size="sm"
                onClick={() => setManualOpen((o) => !o)}
              >
                {manualOpen ? 'Hide' : 'Add'}
              </Anchor>
            </Group>
            <Collapse in={manualOpen}>
              {loadingEstimates ? (
                <Loader size="sm" />
              ) : (
                <Stack gap="sm" pt="xs">
                  <DateInput label="Date" value={manualDate} onChange={setManualDate} />
                  <Group grow align="flex-start">
                    <TimeInput
                      label="Start"
                      value={manualStart}
                      onChange={(e) => setManualStart(e.currentTarget.value)}
                    />
                    <TimeInput
                      label="End"
                      value={manualEnd}
                      onChange={(e) => setManualEnd(e.currentTarget.value)}
                    />
                  </Group>
                  <Select
                    label="Job"
                    placeholder="Select job"
                    data={estimateOptionsWithScheduleFallback}
                    value={manualShop ? null : manualEstimateId}
                    onChange={(v) => {
                      setManualShop(false);
                      setManualEstimateId(v);
                    }}
                    disabled={manualShop}
                    searchable
                    nothingFoundMessage="No jobs"
                  />
                  <Group>
                    <Button
                      size="xs"
                      variant={manualShop ? 'filled' : 'light'}
                      onClick={() => {
                        setManualShop(true);
                        setManualEstimateId(null);
                      }}
                    >
                      Shop time
                    </Button>
                  </Group>
                  <Textarea
                    label="Notes (optional)"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.currentTarget.value)}
                    minRows={2}
                  />
                  <Button onClick={submitManual} loading={saving}>
                    Save manual entry
                  </Button>
                </Stack>
              )}
            </Collapse>
          </Stack>
        </Card>

        <Card withBorder radius="md" p="md" style={cardSurface}>
          <Text fw={600} mb="sm" size="md">
            Recent entries (last ~30 days)
          </Text>
          {loadingEntries ? (
            <Loader size="sm" />
          ) : entries.length === 0 ? (
            <Text size="sm" c="dimmed">
              No entries yet.
            </Text>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Hours</Table.Th>
                  <Table.Th>Job</Table.Th>
                  <Table.Th style={{ minWidth: 280 }}>Line items</Table.Th>
                  {canManageEntries ? <Table.Th style={{ width: 88 }} /> : null}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {entries.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.work_date.slice(0, 10)}</Table.Td>
                    <Table.Td>
                      {formatDecimalHoursForDisplay(
                        displayHoursForOpenEntry(row, clockTick)
                      )}
                      {row.clock_started_at ? (
                        <Text span size="xs" c="dimmed" ml={6}>
                          (in progress)
                        </Text>
                      ) : null}
                    </Table.Td>
                    <Table.Td>{estimateTitle(row.estimate_id)}</Table.Td>
                    <Table.Td style={{ minWidth: 280, maxWidth: 420, verticalAlign: 'top' }}>
                      <EntryLineItemsCell row={row} lineTitle={lineItemTitle} />
                    </Table.Td>
                    {canManageEntries ? (
                      <Table.Td style={{ width: 88, whiteSpace: 'nowrap' }}>
                        <Group gap={4} wrap="nowrap">
                          {!row.clock_started_at ? (
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              aria-label="Edit time entry"
                              onClick={() => openEditEntry(row)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          ) : null}
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            aria-label="Delete time entry"
                            onClick={() => remove(row.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    ) : null}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      </Stack>
    </Container>
  );
}

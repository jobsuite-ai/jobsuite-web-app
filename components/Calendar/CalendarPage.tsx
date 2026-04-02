'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Switch,
  Text,
  Title,
  UnstyledButton,
  useMantineTheme,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import '@mantine/dates/styles.css';
import {
  IconArrowBackUp,
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
} from '@tabler/icons-react';
import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  eachWeekOfInterval,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isValid,
  isWeekend,
  max,
  min,
  parse,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';

import { CalendarEventBar } from './CalendarEventBar';
import classes from './CalendarPage.module.css';
import { ChangeTeamModal } from './ChangeTeamModal';
import { LockedScheduleEditModal } from './LockedScheduleEditModal';
import { ScheduleJobModal, type CalendarTeamOption } from './ScheduleJobModal';
import { TentativeBacklogTeamCard } from './TentativeBacklogTeamCard';
import { UnassignedEstimateRow } from './UnassignedEstimateRow';

import { getApiHeaders } from '@/app/utils/apiClient';
import type { Estimate } from '@/components/Global/model';
import { useDataCache } from '@/contexts/DataCacheContext';
import { useTeamConfig } from '@/hooks/useTeamConfig';
import { isUnassignedTeamProject } from '@/utils/calendarProjectFilters';
import {
  parseLocalDateString,
  splitExplicitWorkDatesIntoContiguousSegments,
  splitRangeIntoWeekdaySegments,
} from '@/utils/calendarWorkingDays';
import { apiEstimateType } from '@/utils/scheduleApiTypes';
import {
  colorForScheduleKey,
  mantineColorToCss,
  teamBacklogCardBackground,
} from '@/utils/scheduleColors';
import type { TeamCapacityRowInput } from '@/utils/scheduleMath';
import { buildSyntheticTeamBacklogCalendarEvent } from '@/utils/tentativeBacklogCalendar';

/** Vertical stride for stacked bars (must be ≥ bar min-height + top margin). */
const CAL_EVENT_ROW_PX = 56;
const CAL_WEEK_BODY_MIN_PX = 112;

const SHOW_NON_WORKING_DAYS_STORAGE_KEY = 'jobsuite-calendar-show-non-working-days';
const LEGACY_SHOW_WEEKENDS_STORAGE_KEY = 'jobsuite-calendar-show-weekends';
// Tentative backlog placement needs the last locked job end for each team.
// The visible grid is only a 4-week window, so we fetch extra locked events to
// correctly anchor right before window boundaries (e.g. month transitions).
const CALENDAR_LOCKED_FETCH_PADDING_DAYS = 60;

type BacklogItem = {
  schedule_id: string;
  estimate_id: string;
  job_name: string;
  labor_hours?: number;
};

type BacklogByTeamPayload = {
  total_labor_hours: number;
  items: BacklogItem[];
};

/** Locked jobs from API; tentative backlog bars are merged client-side from schedule_backlog. */
interface CalendarApiEvent {
  schedule_id: string;
  estimate_id: string | null;
  title: string | null;
  team_id: string | null;
  team_name: string | null;
  schedule_start_date: string | null;
  schedule_end_date: string | null;
  schedule_tentative: boolean;
  schedule_work_dates?: string[];
  schedule_non_working_dates?: string[];
  calendar_kind: 'job' | 'team_backlog';
}

/** One bar per estimate when the API still returns duplicate rows (legacy data). */
function pickPrimaryJobCalendarEvent(candidates: CalendarApiEvent[]): CalendarApiEvent {
  if (candidates.length <= 1) {
    return candidates[0];
  }
  return [...candidates].sort((a, b) => {
    const lockA = a.schedule_tentative ? 0 : 1;
    const lockB = b.schedule_tentative ? 0 : 1;
    if (lockA !== lockB) {
      return lockB - lockA;
    }
    const sa = (a.schedule_start_date ?? '').slice(0, 10);
    const sb = (b.schedule_start_date ?? '').slice(0, 10);
    return sb.localeCompare(sa);
  })[0];
}

type WeekCalRow = {
  rowKey: string;
  title: string;
  workRange: { start: Date; end: Date };
  /** Full job span for bar labels (same on every segment of a split job). */
  labelRangeStart: Date;
  labelRangeEnd: Date;
  colorKey: string;
  href: string | null;
  isBacklog: boolean;
  teamName: string | null;
  scheduleTentative: boolean;
  scheduleId: string;
  estimateId: string | null;
  calendarKind: 'job' | 'team_backlog';
  workDatesIso: string[];
  scheduleNonWorkingIso: string[];
  scheduleStartIso: string | null;
  /**
   * Full-span end (ISO date); backlog bar labels match API, not clipped work dates.
   */
  scheduleEndIso: string | null;
  /** Team-colored backlog fill (calendar bar). */
  backlogBackgroundCss: string | null;
};

type ScheduleEditDraft = {
  scheduleId: string;
  estimateId: string;
  teamId: string;
  startIso: string;
  nonWorkingIso: string[];
  laborHours: number;
};

type SchedulePreviewPayload = {
  work_dates: string[];
  end_date: string;
};

function scheduleEditDraftsEqual(
  a: ScheduleEditDraft | null,
  b: ScheduleEditDraft | null
): boolean {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.scheduleId === b.scheduleId &&
    a.startIso === b.startIso &&
    JSON.stringify([...a.nonWorkingIso].sort()) === JSON.stringify([...b.nonWorkingIso].sort())
  );
}

function applySchedulePreviewPatch(
  events: CalendarApiEvent[],
  draft: ScheduleEditDraft | null,
  preview: SchedulePreviewPayload | null
): CalendarApiEvent[] {
  if (!draft || !preview?.end_date) {
    return events;
  }
  const start =
    preview.work_dates?.length > 0 ? preview.work_dates[0].slice(0, 10) : draft.startIso;
  return events.map((ev) => {
    if (ev.calendar_kind !== 'job' || ev.schedule_id !== draft.scheduleId) {
      return ev;
    }
    return {
      ...ev,
      schedule_start_date: start,
      schedule_end_date: preview.end_date.slice(0, 10),
      schedule_work_dates: (preview.work_dates ?? []).map((w) => w.slice(0, 10)),
      schedule_non_working_dates: draft.nonWorkingIso.map((s) => s.slice(0, 10)),
    };
  });
}

/** Always four weeks: anchor week plus the following three (Mon-start weeks). */
function getFourWeekRange(anchor: Date): { start: Date; end: Date } {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const end = endOfWeek(addWeeks(start, 3), { weekStartsOn: 1 });
  return { start, end };
}

function navigateFourWeekWindow(anchor: Date, dir: -1 | 1): Date {
  return addWeeks(anchor, dir * 4);
}

/**
 * Human-readable backlog range (true end date, including when in a later month).
 */
function formatBacklogSpanLabel(
  isoStart: string | null | undefined,
  isoEnd: string | null | undefined
): string | null {
  if (!isoStart?.trim() || !isoEnd?.trim()) {
    return null;
  }
  const a = startOfDay(parseLocalDateString(isoStart));
  const b = startOfDay(parseLocalDateString(isoEnd));
  return `${format(a, 'MMM d')}–${format(b, 'MMM d, yyyy')}`;
}

/**
 * Calendar data flow (see fetch effect below):
 *
 * 1) Estimates from DataCache — used for the "Not scheduled yet" list, title fallbacks on bars, and
 *    team color keys. They are NOT the source of truth for grid bars.
 *
 * 2) GET /api/schedule/calendar?from=&to= — locked jobs only. Tentative backlog bars combine
 *    GET /api/teams/:id/schedule_backlog (order + labor hours), each team’s latest locked job end
 *    from this calendar payload, and team capacity (ceil hours / daily labor capacity per block).
 *
 * 3) If nothing appears but you know a row exists in Dynamo, check contractor_id on the token vs
 *    the schedule row, and that the visible window [from, to] overlaps the job dates.
 *
 * 4) The grid only renders the current four-week `range`; client-side filtering uses the same
 *    overlap rule so bars align with the window.
 */
function scheduleEventOverlapsVisibleRange(
  ev: CalendarApiEvent,
  visibleRange: { start: Date; end: Date }
): boolean {
  if (!ev.schedule_start_date?.trim() || !ev.schedule_end_date?.trim()) {
    return false;
  }
  const s = startOfDay(parseLocalDateString(ev.schedule_start_date));
  const e = startOfDay(parseLocalDateString(ev.schedule_end_date));
  const rs = startOfDay(visibleRange.start);
  const re = startOfDay(visibleRange.end);
  return !(isAfter(s, re) || isBefore(e, rs));
}

/**
 * Map a date range onto week grid columns. `columnCount` 7 = Mon–Sun; 5 = Mon–Fri only
 * (Sat/Sun columns hidden in the UI).
 */
function segmentForWeek(
  weekStart: Date,
  range: { start: Date; end: Date },
  columnCount: 5 | 7
): { colStart: number; colSpan: number } | null {
  const ws = startOfDay(weekStart);
  const weekEnd = startOfDay(endOfWeek(weekStart, { weekStartsOn: 1 }));
  const rs = startOfDay(range.start);
  const re = startOfDay(range.end);
  let segStart = max([rs, ws]);
  let segEnd = min([re, weekEnd]);
  if (isAfter(segStart, segEnd)) {
    return null;
  }

  if (columnCount === 7) {
    const colStart = differenceInCalendarDays(segStart, ws) + 1;
    const colSpan = differenceInCalendarDays(segEnd, segStart) + 1;
    return { colStart, colSpan };
  }

  while (segStart <= segEnd && isWeekend(segStart)) {
    segStart = addDays(segStart, 1);
  }
  while (segEnd >= segStart && isWeekend(segEnd)) {
    segEnd = addDays(segEnd, -1);
  }
  if (isAfter(segStart, segEnd)) {
    return null;
  }

  const colStart = differenceInCalendarDays(segStart, ws) + 1;
  const colEnd = differenceInCalendarDays(segEnd, ws) + 1;
  if (colStart > 5 || colEnd < 1) {
    return null;
  }
  const cs = Math.max(1, colStart);
  const ce = Math.min(5, colEnd);
  if (cs > ce) {
    return null;
  }
  return { colStart: cs, colSpan: ce - cs + 1 };
}

/**
 * Like segmentForWeek; when Mon–Fri view hides a weekend-only job, pin one column on Monday.
 */
/**
 * Work dates that fall inside one visual segment (must match fallback scope in
 * `segmentForWeekOrFallback` — using the full job list per segment pins bars to wrong weeks).
 */
function explicitWorkDatesInSegment(
  explicit: string[],
  seg: { start: Date; end: Date }
): string[] {
  if (explicit.length === 0) {
    return [];
  }
  return explicit.filter((iso) => {
    const d = startOfDay(parseLocalDateString(iso));
    return !isBefore(d, seg.start) && !isAfter(d, seg.end);
  });
}

function segmentForWeekOrFallback(
  weekStart: Date,
  range: { start: Date; end: Date },
  columnCount: 5 | 7,
  workDatesIso?: string[]
): { colStart: number; colSpan: number } | null {
  const seg = segmentForWeek(weekStart, range, columnCount);
  if (seg) {
    return seg;
  }
  if (columnCount === 5) {
    const wide = segmentForWeek(weekStart, range, 7);
    if (wide && (wide.colStart >= 6 || wide.colStart + wide.colSpan - 1 >= 6)) {
      return { colStart: 1, colSpan: 1 };
    }
    if (workDatesIso?.length) {
      const ws = startOfDay(weekStart);
      const we = startOfDay(endOfWeek(weekStart, { weekStartsOn: 1 }));
      const hasInWeek = workDatesIso.some((iso) => {
        const d = startOfDay(parseLocalDateString(iso));
        return !isAfter(d, we) && !isBefore(d, ws);
      });
      if (hasInWeek) {
        return { colStart: 1, colSpan: 1 };
      }
    }
  }
  return null;
}

function columnRangeInclusive(seg: { colStart: number; colSpan: number }): [number, number] {
  return [seg.colStart, seg.colStart + seg.colSpan - 1];
}

function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return !(a[1] < b[0] || b[1] < a[0]);
}

/**
 * Assign each event to a horizontal "lane" (row) so only events that share at least
 * one day column stack vertically. Side-by-side events (e.g. Mon–Wed vs Fri–Sun) share a lane.
 */
function assignLanesForWeek(
  segments: { colStart: number; colSpan: number }[]
): number[] {
  const n = segments.length;
  if (n === 0) {
    return [];
  }
  const laneByIndex = new Array<number>(n);
  const occupied: [number, number][][] = [];

  const order = segments
    .map((seg, index) => ({ seg, index }))
    .sort((a, b) => {
      if (a.seg.colStart !== b.seg.colStart) {
        return a.seg.colStart - b.seg.colStart;
      }
      return b.seg.colSpan - a.seg.colSpan;
    });

  order.forEach(({ seg, index }) => {
    const range = columnRangeInclusive(seg);
    let placed = false;
    for (let L = 0; L < 64; L += 1) {
      if (!occupied[L]) {
        occupied[L] = [];
      }
      const conflict = occupied[L].some((r) => rangesOverlap(r, range));
      if (!conflict) {
        occupied[L].push(range);
        laneByIndex[index] = L;
        placed = true;
        break;
      }
    }
    if (!placed) {
      laneByIndex[index] = 0;
    }
  });

  return laneByIndex;
}

export function CalendarPage() {
  const theme = useMantineTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { estimates, loading, refreshData, errors } = useDataCache();
  const { teamConfig, loading: teamLoading } = useTeamConfig();

  useEffect(() => {
    refreshData('estimates').catch(() => {});
  }, [refreshData]);

  const dateParam = searchParams.get('date');
  const anchor = useMemo(() => {
    if (dateParam) {
      const d = parse(dateParam, 'yyyy-MM-dd', new Date());
      if (isValid(d)) {
        return d;
      }
    }
    return new Date();
  }, [dateParam]);

  const setQuery = useCallback(
    (next: { date?: Date }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.date) {
        params.set('date', format(next.date, 'yyyy-MM-dd'));
      }
      router.replace(`/calendar?${params.toString()}`);
    },
    [router, searchParams]
  );

  const range = useMemo(() => getFourWeekRange(anchor), [anchor]);
  const weekStarts = useMemo(
    () => eachWeekOfInterval({ start: range.start, end: range.end }, { weekStartsOn: 1 }),
    [range.start, range.end]
  );

  const unassignedTeam = useMemo(
    () => estimates.filter((e) => isUnassignedTeamProject(e)),
    [estimates]
  );

  const [calendarEvents, setCalendarEvents] = useState<CalendarApiEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calTick, setCalTick] = useState(0);
  const [backlogByTeam, setBacklogByTeam] = useState<
    Record<string, BacklogByTeamPayload>
  >({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEstimate, setModalEstimate] = useState<Estimate | null>(null);
  const [lockInStartIso, setLockInStartIso] = useState<string | null>(null);
  const [lockInTeamId, setLockInTeamId] = useState<string | null>(null);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [scheduleEditDraft, setScheduleEditDraft] = useState<ScheduleEditDraft | null>(null);
  const [scheduleEditBaseline, setScheduleEditBaseline] = useState<ScheduleEditDraft | null>(null);
  const [schedulePreviewPayload, setSchedulePreviewPayload] =
    useState<SchedulePreviewPayload | null>(null);
  // One-shot undo for the last *saved* locked-schedule change.
  // This should NOT become clickable for preview edits only.
  const [undoScheduleSnapshot, setUndoScheduleSnapshot] = useState<ScheduleEditDraft | null>(
    null
  );

  const [changeTeamCtx, setChangeTeamCtx] = useState<{
    estimate: Estimate;
    currentTeamId: string | null;
  } | null>(null);

  const [teams, setTeams] = useState<CalendarTeamOption[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const [showNonWorkingDays, setShowNonWorkingDays] = useState(false);
  /** Empty = show all teams. Non-empty = calendar shows only those teams (client-side). */
  const [selectedTeamFilterIds, setSelectedTeamFilterIds] = useState<string[]>([]);

  const toggleTeamFilter = useCallback((teamId: string) => {
    setSelectedTeamFilterIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return Array.from(next);
    });
  }, []);

  const clearTeamFilter = useCallback(() => {
    setSelectedTeamFilterIds([]);
  }, []);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') {
        return;
      }
      const v = localStorage.getItem(SHOW_NON_WORKING_DAYS_STORAGE_KEY);
      const legacy = localStorage.getItem(LEGACY_SHOW_WEEKENDS_STORAGE_KEY);
      if (v === 'true' || (v == null && legacy === 'true')) {
        setShowNonWorkingDays(true);
        if (v == null && legacy === 'true') {
          localStorage.setItem(SHOW_NON_WORKING_DAYS_STORAGE_KEY, 'true');
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setShowNonWorkingDaysPersisted = useCallback((next: boolean) => {
    setShowNonWorkingDays(next);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SHOW_NON_WORKING_DAYS_STORAGE_KEY, next ? 'true' : 'false');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const openLockScheduleFromBacklog = useCallback(
    (e: Estimate, teamId: string, impliedStartIso: string) => {
      setLockInStartIso(impliedStartIso);
      setLockInTeamId(teamId);
      setModalEstimate(e);
      setModalOpen(true);
    },
    []
  );

  const handleSaved = useCallback(
    (nextTeamId?: string | null) => {
      setCalTick((n) => n + 1);
      refreshData('estimates').catch(() => {});

      // If a team filter is active, ensure the destination team is included so the job
      // doesn't look like it "disappeared" after reassignment.
      if (nextTeamId && selectedTeamFilterIds.length > 0) {
        setSelectedTeamFilterIds((prev) => {
          if (prev.includes(nextTeamId)) return prev;
          return [...prev, nextTeamId];
        });
      }
    },
    [refreshData, selectedTeamFilterIds]
  );

  const openAdjustLockedSchedule = useCallback(
    (row: WeekCalRow) => {
      if (!row.estimateId) {
        return;
      }
      const est = estimates.find((e) => e.id === row.estimateId);
      const startIso =
        row.scheduleStartIso ?? row.workRange.start.toISOString().slice(0, 10);
      const base: ScheduleEditDraft = {
        scheduleId: row.scheduleId,
        estimateId: row.estimateId,
        teamId: row.colorKey,
        startIso,
        nonWorkingIso: row.scheduleNonWorkingIso.map((s) => s.slice(0, 10)),
        laborHours: est?.hours_bid ?? 0,
      };
      setScheduleEditBaseline({ ...base });
      setScheduleEditDraft({ ...base });
      setAdjustOpen(true);
    },
    [estimates]
  );

  const handleScheduleDraftChange = useCallback(
    (next: { startIso: string | null; nonWorkingIso: string[] }) => {
      setScheduleEditDraft((prev) => {
        if (!prev) {
          return null;
        }
        return {
          ...prev,
          startIso: next.startIso ?? prev.startIso,
          nonWorkingIso: next.nonWorkingIso,
        };
      });
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const timeoutHandle = setTimeout(() => {
      if (!scheduleEditDraft) {
        return;
      }

      const est = estimates.find((e) => e.id === scheduleEditDraft.estimateId);
      fetch('/api/schedule/preview', {
        method: 'POST',
        headers: { ...getApiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: scheduleEditDraft.teamId,
          labor_hours: scheduleEditDraft.laborHours,
          start_date: scheduleEditDraft.startIso,
          estimate_type: apiEstimateType(
            est?.estimate_type ? String(est.estimate_type) : undefined
          ),
          tentative: false,
          non_working_dates: scheduleEditDraft.nonWorkingIso,
        }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok || cancelled) {
            return;
          }
          const wd = data.work_dates;
          const end = data.end_date;
          if (Array.isArray(wd) && typeof end === 'string') {
            setSchedulePreviewPayload({
              work_dates: wd as string[],
              end_date: end,
            });
          } else {
            setSchedulePreviewPayload(null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSchedulePreviewPayload(null);
          }
        });
    }, 250);

    if (!scheduleEditDraft) {
      setSchedulePreviewPayload(null);
    }

    return () => {
      cancelled = true;
      clearTimeout(timeoutHandle);
    };
  }, [scheduleEditDraft, estimates]);

  const saveScheduleEdit = useCallback(async () => {
    if (!scheduleEditDraft) {
      return;
    }
    try {
      const res = await fetch(`/api/schedule/${scheduleEditDraft.scheduleId}`, {
        method: 'PUT',
        headers: { ...getApiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: scheduleEditDraft.startIso,
          labor_hours: scheduleEditDraft.laborHours,
          non_working_dates: scheduleEditDraft.nonWorkingIso,
        }),
      });
      const errBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (typeof errBody.detail === 'string' ? errBody.detail : null) ||
            (errBody as { message?: string }).message ||
            'Failed to update schedule'
        );
      }
      notifications.show({
        title: 'Schedule saved',
        message: 'Calendar will refresh.',
        color: 'green',
      });
      // Enable one-shot undo back to the last committed state (pre-save snapshot).
      // Undo must NOT become available for preview-only edits.
      if (scheduleEditBaseline) {
        setUndoScheduleSnapshot({ ...scheduleEditBaseline });
      }
      setScheduleEditDraft(null);
      setScheduleEditBaseline(null);
      setSchedulePreviewPayload(null);
      setAdjustOpen(false);
      handleSaved();
    } catch (e) {
      notifications.show({
        title: 'Could not save',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    }
  }, [scheduleEditDraft, scheduleEditBaseline, handleSaved]);

  const cancelScheduleEdit = useCallback(() => {
    setScheduleEditDraft(null);
    setScheduleEditBaseline(null);
    setSchedulePreviewPayload(null);
    setAdjustOpen(false);
  }, []);

  const undoScheduleEdit = useCallback(async () => {
    if (!undoScheduleSnapshot) {
      return;
    }
    try {
      const res = await fetch(`/api/schedule/${undoScheduleSnapshot.scheduleId}`, {
        method: 'PUT',
        headers: { ...getApiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: undoScheduleSnapshot.startIso,
          labor_hours: undoScheduleSnapshot.laborHours,
          non_working_dates: undoScheduleSnapshot.nonWorkingIso,
        }),
      });
      const errBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (typeof errBody.detail === 'string' ? errBody.detail : null) ||
            (errBody as { message?: string }).message ||
            'Failed to undo schedule update'
        );
      }

      notifications.show({
        title: 'Undo complete',
        message: 'Reverted last saved schedule change.',
        color: 'green',
      });

      setUndoScheduleSnapshot(null);
      setScheduleEditDraft(null);
      setScheduleEditBaseline(null);
      setSchedulePreviewPayload(null);
      setAdjustOpen(false);

      handleSaved();
    } catch (e) {
      notifications.show({
        title: 'Could not undo',
        message: e instanceof Error ? e.message : 'Error',
        color: 'red',
      });
    }
  }, [undoScheduleSnapshot, handleSaved]);

  const openChangeTeamForRow = useCallback(
    (row: WeekCalRow) => {
      if (!row.estimateId) {
        return;
      }
      const est = estimates.find((e) => e.id === row.estimateId);
      if (!est) {
        return;
      }
      setChangeTeamCtx({ estimate: est, currentTeamId: row.colorKey });
    },
    [estimates]
  );

  const openChangeTeamForEstimate = useCallback((e: Estimate, currentTeamId: string) => {
    setChangeTeamCtx({ estimate: e, currentTeamId });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTeamsLoading(true);
    fetch('/api/teams', { headers: getApiHeaders() })
      .then(async (res) => {
        const data = await res.json().catch(() => []);
        if (!res.ok || cancelled) {
          return;
        }
        const list = Array.isArray(data) ? data : [];
        const mapped: CalendarTeamOption[] = list
          .filter(
            (t: unknown): t is Record<string, unknown> =>
              Boolean(t) && typeof t === 'object' && 'id' in (t as object) && 'name' in (t as object)
          )
          .map((t) => {
            const id = String(t.id).trim();
            const name = String(t.name).trim() || id;
            const memberIds = Array.isArray(t.member_user_ids) ? t.member_user_ids : [];
            const painterCount = memberIds.length;
            const tc = t.team_config as Record<string, unknown> | undefined;
            const capRaw = tc?.team_capacity;
            const capacityRows: TeamCapacityRowInput[] = [];
            if (Array.isArray(capRaw)) {
              capRaw.forEach((row) => {
                if (!row || typeof row !== 'object') return;
                const r = row as Record<string, unknown>;
                const hpd = Number(r.hours_per_day);
                if (!Number.isFinite(hpd) || hpd <= 0) return;
                capacityRows.push({
                  hours_per_day: hpd,
                  working_days:
                    typeof r.working_days === 'string' && r.working_days.trim()
                      ? r.working_days
                      : 'Mon,Tue,Wed,Thu,Fri',
                  active_dates: typeof r.active_dates === 'string' ? r.active_dates : '',
                });
              });
            }
            const scheduleFromApi =
              painterCount > 0 && capacityRows.length > 0
                ? { painterCount, capacityRows }
                : undefined;
            return {
              id,
              name,
              memberCount: painterCount > 0 ? painterCount : undefined,
              scheduleFromApi,
            };
          })
          .filter((t) => t.id.length > 0);
        if (!cancelled) {
          setTeams(mapped);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTeams([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTeamsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [calTick]);

  useEffect(() => {
    let cancelled = false;
    const from = format(addDays(range.start, -CALENDAR_LOCKED_FETCH_PADDING_DAYS), 'yyyy-MM-dd');
    const to = format(addDays(range.end, CALENDAR_LOCKED_FETCH_PADDING_DAYS), 'yyyy-MM-dd');
    setCalendarLoading(true);
    setCalendarError(null);
    fetch(`/api/schedule/calendar?from=${from}&to=${to}`, { headers: getApiHeaders() })
      .then(async (res) => {
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          throw new Error(data.message || data.detail || 'Failed to load calendar');
        }
        if (!cancelled) {
          setCalendarEvents(Array.isArray(data) ? (data as CalendarApiEvent[]) : []);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setCalendarError(e.message || 'Calendar load failed');
          setCalendarEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCalendarLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [range.start, range.end, calTick]);

  useEffect(() => {
    let cancelled = false;
    if (teams.length === 0) {
      setBacklogByTeam({});
      return () => {
        cancelled = true;
      };
    }
    Promise.all(
      teams.map(async (t) => {
        const res = await fetch(`/api/teams/${t.id}/schedule-backlog`, { headers: getApiHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return [t.id, null] as const;
        }
        return [
          t.id,
          {
            total_labor_hours: Number(data.total_labor_hours) || 0,
            items: Array.isArray(data.items) ? (data.items as BacklogItem[]) : [],
          },
        ] as const;
      })
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      const next: Record<string, BacklogByTeamPayload> = {};
      for (const row of entries) {
        const [teamKey, payload] = row;
        if (payload) {
          next[teamKey] = payload;
        }
      }
      setBacklogByTeam(next);
    });
    return () => {
      cancelled = true;
    };
  }, [teams, calTick]);

  /**
   * API calendar jobs only (no synthetic backlog): max locked job end date (`schedule_end_date`)
   * per team.
   */
  const lastLockedJobEndByTeamId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ev of calendarEvents) {
      if (ev.calendar_kind === 'job' && !ev.schedule_tentative) {
        const tid = ev.team_id?.trim();
        const end = ev.schedule_end_date?.trim().slice(0, 10);
        if (tid && end) {
          const cur = map[tid];
          if (!cur || end > cur) {
            map[tid] = end;
          }
        }
      }
    }
    return map;
  }, [calendarEvents]);

  const displayCalendarEvents = useMemo(() => {
    const synth: CalendarApiEvent[] = [];
    for (const t of teams) {
      const bl = backlogByTeam[t.id];
      if (bl) {
        const hasHours =
          bl.total_labor_hours > 0 ||
          (bl.items?.some((i) => (Number(i.labor_hours) || 0) > 0) ?? false);
        if (hasHours) {
          const ev = buildSyntheticTeamBacklogCalendarEvent(t, {
            lastLockedJobEndDateIso: lastLockedJobEndByTeamId[t.id] ?? null,
            items: bl.items,
          });
          if (ev) {
            synth.push(ev);
          }
        }
      }
    }
    return [...calendarEvents, ...synth];
  }, [calendarEvents, teams, backlogByTeam, lastLockedJobEndByTeamId]);

  const displayCalendarEventsTeamFiltered = useMemo(() => {
    if (selectedTeamFilterIds.length === 0) {
      return displayCalendarEvents;
    }
    const allow = new Set(selectedTeamFilterIds);
    return displayCalendarEvents.filter((ev) => {
      const tid = ev.team_id?.trim();
      return Boolean(tid && allow.has(tid));
    });
  }, [displayCalendarEvents, selectedTeamFilterIds]);

  const calendarEventsForDisplay = useMemo(
    () =>
      applySchedulePreviewPatch(
        displayCalendarEventsTeamFiltered,
        scheduleEditDraft,
        schedulePreviewPayload
      ),
    [displayCalendarEventsTeamFiltered, scheduleEditDraft, schedulePreviewPayload]
  );

  const scheduleEditDirty = Boolean(
    scheduleEditDraft &&
      scheduleEditBaseline &&
      !scheduleEditDraftsEqual(scheduleEditDraft, scheduleEditBaseline)
  );

  const calendarJobEvents = useMemo(() => {
    const jobs = calendarEventsForDisplay.filter((e) => e.calendar_kind === 'job');
    const noEstimateId: CalendarApiEvent[] = [];
    const byEstimate = new Map<string, CalendarApiEvent[]>();
    for (const ev of jobs) {
      const eid = ev.estimate_id?.trim();
      if (eid) {
        const list = byEstimate.get(eid) ?? [];
        list.push(ev);
        byEstimate.set(eid, list);
      } else {
        noEstimateId.push(ev);
      }
    }
    const deduped: CalendarApiEvent[] = [...noEstimateId];
    for (const list of byEstimate.values()) {
      deduped.push(pickPrimaryJobCalendarEvent(list));
    }
    return deduped;
  }, [calendarEventsForDisplay]);

  const calendarJobEventsInView = useMemo(
    () => calendarJobEvents.filter((ev) => scheduleEventOverlapsVisibleRange(ev, range)),
    [calendarJobEvents, range]
  );

  const eventsByWeek = useMemo(() => {
    const map = new Map<string, WeekCalRow[]>();
    const eventsInWindow = calendarEventsForDisplay.filter((ev) =>
      scheduleEventOverlapsVisibleRange(ev, range)
    );
    weekStarts.forEach((ws) => {
      const key = ws.toISOString();
      const list: WeekCalRow[] = [];
      eventsInWindow.forEach((ev) => {
        if (!ev.schedule_start_date?.trim() || !ev.schedule_end_date?.trim()) {
          return;
        }
        const start = startOfDay(parseLocalDateString(ev.schedule_start_date));
        const end = startOfDay(parseLocalDateString(ev.schedule_end_date));
        const r = end < start ? { start: end, end: start } : { start, end };
        const explicit = (ev.schedule_work_dates ?? []).filter(
          (s): s is string => typeof s === 'string' && s.trim().length > 0
        );
        const spanParts =
          explicit.length > 0
            ? splitExplicitWorkDatesIntoContiguousSegments(explicit)
            : splitRangeIntoWeekdaySegments(r.start, r.end);
        const cols: 5 | 7 = showNonWorkingDays ? 7 : 5;
        spanParts.forEach((seg) => {
          const explicitForSeg =
            explicit.length > 0 ? explicitWorkDatesInSegment(explicit, seg) : [];
          if (
            segmentForWeekOrFallback(
              ws,
              seg,
              cols,
              explicitForSeg.length > 0 ? explicitForSeg : undefined
            )
          ) {
            const est = ev.estimate_id
              ? estimates.find((e) => e.id === ev.estimate_id)
              : undefined;
            const colorKeyRaw = ev.team_id || est?.schedule_team_id || 'default';
            const colorKey = (colorKeyRaw || 'default').trim() || 'default';
            const { color, shade } = colorForScheduleKey(colorKey);
            const backlogBackgroundCss =
              ev.calendar_kind === 'team_backlog'
                ? teamBacklogCardBackground(theme.colors, color, shade ?? 6)
                : null;
            list.push({
              rowKey: `${ev.schedule_id}-${seg.start.toISOString()}-${ev.calendar_kind}`,
              title:
                ev.title ||
                est?.title ||
                est?.address_street ||
                (ev.calendar_kind === 'team_backlog' ? 'Team backlog' : 'Job'),
              workRange: seg,
              labelRangeStart: r.start,
              labelRangeEnd: r.end,
              colorKey,
              href:
                ev.calendar_kind === 'team_backlog'
                  ? null
                  : ev.estimate_id
                    ? `/proposals/${ev.estimate_id}`
                    : null,
              isBacklog: ev.calendar_kind === 'team_backlog',
              teamName: ev.team_name,
              scheduleTentative: ev.schedule_tentative,
              scheduleId: ev.schedule_id,
              estimateId: ev.estimate_id,
              calendarKind: ev.calendar_kind,
              workDatesIso: explicitForSeg,
              scheduleNonWorkingIso: (ev.schedule_non_working_dates ?? []).filter(
                (s): s is string => typeof s === 'string' && s.trim().length > 0
              ),
              scheduleStartIso: ev.schedule_start_date?.trim()
                ? ev.schedule_start_date.slice(0, 10)
                : null,
              scheduleEndIso: ev.schedule_end_date?.trim()
                ? ev.schedule_end_date.slice(0, 10)
                : null,
              backlogBackgroundCss,
            });
          }
        });
      });
      map.set(key, list);
    });
    return map;
  }, [calendarEventsForDisplay, estimates, weekStarts, showNonWorkingDays, range, theme.colors]);

  const loadingData = loading.estimates || teamLoading || calendarLoading || teamsLoading;
  const noPipelineMatches =
    estimates.length > 0 && calendarJobEvents.length === 0 && unassignedTeam.length === 0;

  /** One swatch per team; colors match bars (`colorForScheduleKey`). */
  const teamLegendEntries = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  );

  return (
    <Container size="xl" className={classes.calendar}>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Group>
              <Title order={2} c="white">Calendar</Title>
              <Switch
                size="sm"
                label="Show weekends"
                c="white"
                checked={showNonWorkingDays}
                onChange={(e) => setShowNonWorkingDaysPersisted(e.currentTarget.checked)}
              />
            </Group>
          </Stack>
          <Group gap="xs" align="center">
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => setQuery({ date: navigateFourWeekWindow(anchor, -1) })}
              aria-label="Previous four weeks"
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => setQuery({ date: navigateFourWeekWindow(anchor, 1) })}
              aria-label="Next four weeks"
            >
              <IconChevronRight size={18} />
            </ActionIcon>
            <Button
              variant="default"
              size="sm"
              onClick={() => setQuery({ date: new Date() })}
            >
              Today
            </Button>
          </Group>
        </Group>

        <Paper p="md" withBorder radius="md">
          <Group justify="space-between" mb="md">
            <Text fw={600}>
              {`${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`}
            </Text>
            <Group gap="xs">
              <Badge variant="light" color="gray">
                {estimates.length} loaded · {calendarJobEventsInView.length} in this window ·{' '}
                {calendarJobEvents.length} scheduled · {unassignedTeam.length} not assigned
              </Badge>
              {undoScheduleSnapshot ? (
                <Button
                  variant="light"
                  size="compact-sm"
                  leftSection={<IconArrowBackUp size={14} />}
                  onClick={undoScheduleEdit}
                >
                  Undo
                </Button>
              ) : null}
              <Button
                variant="light"
                size="compact-sm"
                leftSection={<IconRefresh size={14} />}
                loading={loading.estimates || calendarLoading}
                onClick={() => {
                  setCalTick((n) => n + 1);
                  refreshData('estimates').catch(() => {});
                }}
              >
                Refresh
              </Button>
            </Group>
          </Group>

          {teamLegendEntries.length > 0 && (
            <div className={classes.legendWrap}>
              <Group justify="space-between" align="center" mb="xs" wrap="wrap" gap="xs">
                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                  Teams
                </Text>
                {selectedTeamFilterIds.length > 0 ? (
                  <Button variant="subtle" size="compact-xs" onClick={clearTeamFilter}>
                    Clear
                  </Button>
                ) : null}
              </Group>
              <Group gap="lg" align="flex-start" wrap="wrap">
                {teamLegendEntries.map((team) => {
                  const { color, shade } = colorForScheduleKey(team.id);
                  const bg = mantineColorToCss(theme.colors, color, shade ?? 6);
                  const cfg = teamConfig.scheduleTeams.find((t) => t.id === team.id);
                  const rosterHint = [
                    cfg?.painterCount != null ? `${cfg.painterCount} painters` : '',
                    cfg?.weeklyHours != null ? `${cfg.weeklyHours} hrs/wk` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  const selected = selectedTeamFilterIds.includes(team.id);
                  return (
                    <UnstyledButton
                      key={team.id}
                      type="button"
                      onClick={() => toggleTeamFilter(team.id)}
                      className={`${classes.legendTeamChip} ${selected ? classes.legendTeamChipSelected : ''}`}
                      aria-pressed={selected}
                      aria-label={`${selected ? 'Remove' : 'Add'} ${team.name} ${selected ? 'from' : 'to'} calendar filter`}
                    >
                      <Group gap="xs" wrap="nowrap" align="flex-start">
                        <Box className={classes.legendSwatch} style={{ backgroundColor: bg }} />
                        <Stack gap={2}>
                          <Text size="sm" fw={600} lh={1.3}>
                            {team.name}
                          </Text>
                          {rosterHint ? (
                            <Text size="xs" c="dimmed" lh={1.35}>
                              {rosterHint}
                            </Text>
                          ) : null}
                        </Stack>
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Group>
            </div>
          )}

          {errors.estimates && (
            <Alert color="red" title="Could not load estimates" mb="md">
              {errors.estimates}
            </Alert>
          )}
          {calendarError && (
            <Alert color="orange" title="Could not load schedule calendar" mb="md">
              {calendarError}
            </Alert>
          )}

          {loadingData ? (
            <Group justify="center" p="xl">
              <Loader />
            </Group>
          ) : (
            <Stack gap="xl">
              {estimates.length === 0 && (
                <Alert color="blue" title="No jobs in the app cache">
                  Estimates have not loaded yet or your account has no jobs. Use Refresh or sign in.
                  For local DynamoDB, run{' '}
                  <Text span inherit fw={600} component="span">
                    job-engine/scripts/setup-db.py
                  </Text>{' '}
                  (includes calendar seed projects).
                </Alert>
              )}
              {noPipelineMatches && (
                <Alert color="yellow" title="Nothing to show on the calendar yet">
                  You have {estimates.length} job(s), but none qualify for the calendar filters.
                </Alert>
              )}
              {weekStarts.map((weekStart) => {
                const key = weekStart.toISOString();
                const weekGridCols: 5 | 7 = showNonWorkingDays ? 7 : 5;
                const gridTemplateColumns = `repeat(${weekGridCols}, 1fr)`;
                const days = Array.from({ length: weekGridCols }, (_, i) => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + i);
                  return d;
                });
                const weekEvents = eventsByWeek.get(key) || [];
                const planned = weekEvents
                  .map((row) => {
                    const seg = segmentForWeekOrFallback(
                      weekStart,
                      row.workRange,
                      weekGridCols,
                      row.workDatesIso.length > 0 ? row.workDatesIso : undefined
                    );
                    if (!seg) {
                      return null;
                    }
                    return { row, seg };
                  })
                  .filter(
                    (
                      item
                    ): item is {
                      row: WeekCalRow;
                      seg: { colStart: number; colSpan: number };
                    } => item !== null
                  );

                const lanes = assignLanesForWeek(planned.map((p) => p.seg));
                const numLanes = lanes.length > 0 ? Math.max(...lanes) + 1 : 0;
                const stackMinH = numLanes === 0 ? 0 : 12 + numLanes * CAL_EVENT_ROW_PX;
                const weekBodyMinH = Math.max(CAL_WEEK_BODY_MIN_PX, stackMinH);
                const weekEventsGridRows =
                  numLanes > 0
                    ? `repeat(${numLanes}, minmax(${CAL_EVENT_ROW_PX}px, auto))`
                    : undefined;

                return (
                  <div key={key} className={classes.weekBlock}>
                    <div className={classes.weekTitle}>
                      Week of {format(weekStart, 'MMM d, yyyy')}
                    </div>
                    <div className={classes.weekHeader} style={{ gridTemplateColumns }}>
                      {days.map((d) => (
                        <div key={d.toISOString()} className={classes.dayHeader}>
                          {format(d, 'EEE')}{' '}
                          <Text span inherit fw={700} c="var(--mantine-color-text)">
                            {format(d, 'd')}
                          </Text>
                        </div>
                      ))}
                    </div>
                    <div className={classes.weekBody} style={{ minHeight: weekBodyMinH }}>
                      <div
                        className={classes.weekDayCells}
                        style={{
                          minHeight: weekBodyMinH,
                          gridTemplateColumns,
                        }}
                      >
                        {days.map((d) => (
                          <div key={d.toISOString()} className={classes.dayCell} />
                        ))}
                      </div>
                      <div
                        className={classes.weekEvents}
                        style={{
                          gridTemplateColumns,
                          ...(weekEventsGridRows
                            ? { gridTemplateRows: weekEventsGridRows }
                            : {}),
                        }}
                      >
                        {planned.map(({ row, seg }, idx) => {
                          const lane = lanes[idx] ?? 0;
                          const { color, shade } = colorForScheduleKey(row.colorKey);
                          const solidBg = mantineColorToCss(theme.colors, color, shade ?? 6);
                          const segmentDates =
                            row.isBacklog && row.scheduleStartIso && row.scheduleEndIso
                              ? (formatBacklogSpanLabel(row.scheduleStartIso, row.scheduleEndIso) ??
                                `${format(row.labelRangeStart, 'MMM d')}–${format(row.labelRangeEnd, 'MMM d')}`)
                              : `${format(row.labelRangeStart, 'MMM d')}–${format(row.labelRangeEnd, 'MMM d')}`;
                          const teamLabel =
                            row.teamName ||
                            teams.find((t) => t.id === row.colorKey)?.name ||
                            '—';
                          const metaSuffix = row.isBacklog
                            ? ' · tentative backlog'
                            : ` · ${teamLabel}`;
                          const barStyle: CSSProperties = {
                            gridRow: lane + 1,
                            gridColumn: `${seg.colStart} / span ${seg.colSpan}`,
                            ...(row.isBacklog && row.backlogBackgroundCss
                              ? { background: row.backlogBackgroundCss }
                              : {}),
                          };
                          return (
                            <CalendarEventBar
                              key={row.rowKey}
                              row={{
                                rowKey: row.rowKey,
                                title: row.title,
                                scheduleTentative: row.scheduleTentative,
                                scheduleId: row.scheduleId,
                                estimateId: row.estimateId,
                                isBacklog: row.isBacklog,
                                href: row.href,
                              }}
                              barStyle={barStyle}
                              solidBg={solidBg}
                              segmentDates={segmentDates}
                              metaSuffix={metaSuffix}
                              isPreview={Boolean(
                                scheduleEditDirty &&
                                  scheduleEditDraft &&
                                  row.scheduleId === scheduleEditDraft.scheduleId &&
                                  !row.isBacklog
                              )}
                              onSchedule={
                                !row.isBacklog && !row.scheduleTentative && row.estimateId
                                  ? () => openAdjustLockedSchedule(row)
                                  : undefined
                              }
                              onChangeTeam={
                                !row.isBacklog && !row.scheduleTentative && row.estimateId
                                  ? () => openChangeTeamForRow(row)
                                  : undefined
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </Stack>
          )}
          {scheduleEditDirty ? (
            <Group
              justify="space-between"
              mt="md"
              pt="md"
              wrap="wrap"
              style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
            >
              <Text size="sm" c="dimmed">
                Unsaved schedule changes (preview on the calendar). Save to apply or cancel to
                discard.
              </Text>
              <Group gap="xs">
                <Button variant="default" onClick={cancelScheduleEdit}>
                  Cancel
                </Button>
                <Button onClick={() => saveScheduleEdit().catch(() => {})}>Save</Button>
              </Group>
            </Group>
          ) : null}
        </Paper>

        {unassignedTeam.length > 0 && (
          <Paper p="md" withBorder radius="md">
            <Title order={4} mb="sm">
              Not assigned yet
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              For <strong>Project not scheduled</strong> jobs with no team yet: pick a team and
              click Assign. The job appears in that team&apos;s tentative backlog. Use the backlog
              section to lock in dates.
            </Text>
            <ScrollArea className={classes.unassignedList}>
              <Stack gap="xs">
                {unassignedTeam.map((e) => (
                  <UnassignedEstimateRow
                    key={e.id}
                    estimate={e}
                    teams={teams}
                    teamsLoading={teamsLoading}
                    onAssigned={handleSaved}
                  />
                ))}
              </Stack>
            </ScrollArea>
          </Paper>
        )}

        {teams.some((t) => {
          const bl = backlogByTeam[t.id];
          return bl && (bl.total_labor_hours > 0 || (bl.items?.length ?? 0) > 0);
        }) && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Ordered tentative jobs before they are locked in. Drag to reorder; save changes to
              update the team. Refreshes when you assign a team or lock a schedule.
            </Text>
            {teams.map((t) => {
              const bl = backlogByTeam[t.id];
              if (!bl || (bl.total_labor_hours <= 0 && (bl.items?.length ?? 0) === 0)) {
                return null;
              }
              return (
                <TentativeBacklogTeamCard
                  key={t.id}
                  team={t}
                  totalLaborHours={bl.total_labor_hours}
                  serverItems={bl.items}
                  lastLockedJobEndIso={lastLockedJobEndByTeamId[t.id]}
                  estimates={estimates}
                  onLockSchedule={(e, impliedStartIso) => {
                    openLockScheduleFromBacklog(e, t.id, impliedStartIso);
                  }}
                  onChangeTeam={(e) => openChangeTeamForEstimate(e, t.id)}
                  onSaved={handleSaved}
                />
              );
            })}
          </Stack>
        )}
      </Stack>

      <ScheduleJobModal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalEstimate(null);
          setLockInStartIso(null);
          setLockInTeamId(null);
        }}
        estimate={modalEstimate}
        teams={teams}
        onSaved={handleSaved}
        lockInTeamId={lockInTeamId}
        lockInStartIso={lockInStartIso}
      />

      <LockedScheduleEditModal
        opened={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        scheduleId={scheduleEditDraft?.scheduleId ?? null}
        startIso={scheduleEditDraft?.startIso ?? null}
        nonWorkingIso={scheduleEditDraft?.nonWorkingIso ?? []}
        onChange={handleScheduleDraftChange}
        laborHours={scheduleEditDraft?.laborHours ?? 0}
      />

      <ChangeTeamModal
        opened={changeTeamCtx !== null}
        onClose={() => setChangeTeamCtx(null)}
        estimate={changeTeamCtx?.estimate ?? null}
        teams={teams}
        teamsLoading={teamsLoading}
        currentTeamId={changeTeamCtx?.currentTeamId ?? null}
        onSaved={handleSaved}
      />
    </Container>
  );
}

import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isWeekend,
  max,
  min,
  startOfDay,
  startOfWeek,
} from 'date-fns';

import {
  parseLocalDateString,
  splitRangeIntoWeekdaySegments,
} from '@/utils/calendarWorkingDays';

/** Vertical stride for stacked bars (must be ≥ bar min-height + top margin). */
export const CAL_EVENT_ROW_PX = 56;
export const CAL_WEEK_BODY_MIN_PX = 112;

/** Extra locked-event fetch padding so split jobs near window edges still resolve. */
export const CALENDAR_LOCKED_FETCH_PADDING_DAYS = 60;

export type CalendarGridJobEvent = {
  schedule_id: string;
  estimate_id: string | null;
  title: string | null;
  team_id: string | null;
  team_name: string | null;
  /** Locked schedule row labor hours (API); used for preview when bid hours are missing. */
  labor_hours?: number;
  schedule_start_date: string | null;
  schedule_end_date: string | null;
  schedule_tentative: boolean;
  schedule_work_dates?: string[];
  schedule_non_working_dates?: string[];
  calendar_kind: 'job' | 'team_backlog';
};

export type WeekCalRow = {
  rowKey: string;
  title: string;
  workRange: { start: Date; end: Date };
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
  scheduleEndIso: string | null;
  /** From schedule row; preferred over estimate bid hours for preview/save. */
  scheduleLaborHours?: number;
  backlogBackgroundCss: string | null;
};

/** One bar per estimate when the API returns duplicate rows (legacy data). */
export function pickPrimaryJobCalendarEvent(
  candidates: CalendarGridJobEvent[]
): CalendarGridJobEvent {
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

/** True if this locked job event has the given local calendar day as a scheduled work day. */
export function jobIsScheduledOnLocalDay(
  ev: CalendarGridJobEvent,
  day: Date
): boolean {
  if (ev.calendar_kind !== 'job' || !ev.estimate_id?.trim() || ev.schedule_tentative) {
    return false;
  }
  if (!ev.schedule_start_date?.trim() || !ev.schedule_end_date?.trim()) {
    return false;
  }
  const d = startOfDay(day);
  const start = startOfDay(parseLocalDateString(ev.schedule_start_date));
  const end = startOfDay(parseLocalDateString(ev.schedule_end_date));
  const r = isAfter(start, end) ? { start: end, end: start } : { start, end };
  const ymd = format(d, 'yyyy-MM-dd');
  const nonWorking = new Set(
    (ev.schedule_non_working_dates ?? [])
      .map((s) => s.trim().slice(0, 10))
      .filter(Boolean)
  );
  if (nonWorking.has(ymd)) {
    return false;
  }
  const explicit = (ev.schedule_work_dates ?? []).filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0
  );
  if (explicit.length > 0) {
    return explicit.some((iso) => iso.trim().slice(0, 10) === ymd);
  }
  const segments = splitRangeIntoWeekdaySegments(r.start, r.end);
  for (const seg of segments) {
    if (!isBefore(d, seg.start) && !isAfter(d, seg.end)) {
      return true;
    }
  }
  return false;
}

/**
 * Pick one job row for clock-in UX: jobs scheduled for `day`, deduped per estimate
 * (same logic as the crew calendar), then primary among remaining.
 */
export function pickPrimaryJobScheduledOnDay(
  events: CalendarGridJobEvent[],
  day: Date
): CalendarGridJobEvent | null {
  const onDay = events.filter(
    (e) =>
      e.calendar_kind === 'job' &&
      Boolean(e.estimate_id?.trim()) &&
      jobIsScheduledOnLocalDay(e, day)
  );
  if (onDay.length === 0) {
    return null;
  }
  const byEstimate = new Map<string, CalendarGridJobEvent[]>();
  for (const ev of onDay) {
    const eid = ev.estimate_id!.trim();
    const list = byEstimate.get(eid) ?? [];
    list.push(ev);
    byEstimate.set(eid, list);
  }
  const deduped: CalendarGridJobEvent[] = [];
  for (const list of byEstimate.values()) {
    deduped.push(pickPrimaryJobCalendarEvent(list));
  }
  return pickPrimaryJobCalendarEvent(deduped);
}

const NEXT_SCHEDULE_LOOKAHEAD_DAYS = 120;

export type NextScheduledJobInfo = {
  event: CalendarGridJobEvent;
  firstWorkDay: Date;
};

/**
 * Earliest scheduled work day on or after `fromDay` (local), and one job row for that day.
 * Used when today has no work but a future job exists (e.g. “starting next Monday”).
 */
export function findNextScheduledJobFromDay(
  events: CalendarGridJobEvent[],
  fromDay: Date
): NextScheduledJobInfo | null {
  const start = startOfDay(fromDay);
  const jobs = events.filter(
    (e) =>
      e.calendar_kind === 'job' &&
      Boolean(e.estimate_id?.trim()) &&
      !e.schedule_tentative
  );
  if (jobs.length === 0) {
    return null;
  }
  const byEstimate = new Map<string, CalendarGridJobEvent[]>();
  for (const ev of jobs) {
    const eid = ev.estimate_id!.trim();
    const list = byEstimate.get(eid) ?? [];
    list.push(ev);
    byEstimate.set(eid, list);
  }

  const candidates: NextScheduledJobInfo[] = [];
  for (const list of byEstimate.values()) {
    const ev = pickPrimaryJobCalendarEvent(list);
    for (let d = 0; d < NEXT_SCHEDULE_LOOKAHEAD_DAYS; d += 1) {
      const day = addDays(start, d);
      if (jobIsScheduledOnLocalDay(ev, day)) {
        candidates.push({ event: ev, firstWorkDay: day });
        break;
      }
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => a.firstWorkDay.getTime() - b.firstWorkDay.getTime());
  const minT = candidates[0].firstWorkDay.getTime();
  const tied = candidates.filter((c) => c.firstWorkDay.getTime() === minT);
  if (tied.length === 1) {
    return tied[0];
  }
  return {
    event: pickPrimaryJobCalendarEvent(tied.map((t) => t.event)),
    firstWorkDay: candidates[0].firstWorkDay,
  };
}

/** Short phrase for the first day of scheduled work (e.g. “tomorrow”, “starting Monday”). */
export function formatUpcomingJobStartHint(firstWorkDay: Date, now: Date = new Date()): string {
  const a = startOfDay(firstWorkDay);
  const b = startOfDay(now);
  const diff = differenceInCalendarDays(a, b);
  if (diff === 0) {
    return 'today';
  }
  if (diff === 1) {
    return 'tomorrow';
  }
  const weekday = format(a, 'EEEE');
  if (diff <= 7) {
    return `starting ${weekday}`;
  }
  return `starting ${format(a, 'EEEE, MMM d')}`;
}

/** True when there is no work today but there is a future scheduled first work day. */
export function isFutureFirstWorkDay(
  firstWorkDay: Date,
  now: Date = new Date()
): boolean {
  return !isSameDay(startOfDay(firstWorkDay), startOfDay(now));
}

/** Always four weeks: anchor week plus the following three (Mon-start weeks). */
export function getFourWeekRange(anchor: Date): { start: Date; end: Date } {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const end = endOfWeek(addWeeks(start, 3), { weekStartsOn: 1 });
  return { start, end };
}

export function navigateFourWeekWindow(anchor: Date, dir: -1 | 1): Date {
  return addWeeks(anchor, dir * 4);
}

export function formatBacklogSpanLabel(
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

export function scheduleEventOverlapsVisibleRange(
  ev: CalendarGridJobEvent,
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

export function segmentForWeek(
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

export function explicitWorkDatesInSegment(
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

export function segmentForWeekOrFallback(
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
 * Local calendar dates (YYYY-MM-DD) when this row represents work, matching
 * `jobIsScheduledOnLocalDay` for the same schedule segment.
 */
export function workDateYmdsForCalendarRow(row: WeekCalRow): string[] {
  const non = new Set(
    row.scheduleNonWorkingIso.map((s) => s.trim().slice(0, 10)).filter(Boolean)
  );
  if (row.workDatesIso.length > 0) {
    return row.workDatesIso
      .map((s) => s.trim().slice(0, 10))
      .filter((ymd) => ymd && !non.has(ymd));
  }
  const segments = splitRangeIntoWeekdaySegments(row.workRange.start, row.workRange.end);
  const out: string[] = [];
  for (const seg of segments) {
    for (const d of eachDayOfInterval({ start: seg.start, end: seg.end })) {
      const ymd = format(d, 'yyyy-MM-dd');
      if (!non.has(ymd)) {
        out.push(ymd);
      }
    }
  }
  return out;
}

/**
 * For each local day in `visibleRange`, if two or more distinct estimates are locked on the same
 * team, records `teamId|yyyy-MM-dd` → estimate ids. Built from deduped-per-estimate job events.
 */
export function buildTeamMultiProjectDayKeyMap(
  jobEventsDeduped: CalendarGridJobEvent[],
  visibleRange: { start: Date; end: Date }
): Map<string, string[]> {
  const locked = jobEventsDeduped.filter(
    (e) =>
      e.calendar_kind === 'job' &&
      !e.schedule_tentative &&
      e.team_id?.trim() &&
      e.estimate_id?.trim()
  );
  const map = new Map<string, string[]>();
  const start = startOfDay(visibleRange.start);
  const end = startOfDay(visibleRange.end);
  for (let d = start; !isAfter(d, end); d = addDays(d, 1)) {
    const byTeam = new Map<string, Set<string>>();
    for (const ev of locked) {
      if (jobIsScheduledOnLocalDay(ev, d)) {
        const tid = ev.team_id!.trim();
        const eid = ev.estimate_id!.trim();
        if (!byTeam.has(tid)) {
          byTeam.set(tid, new Set());
        }
        byTeam.get(tid)!.add(eid);
      }
    }
    const ymd = format(d, 'yyyy-MM-dd');
    for (const [tid, estimates] of byTeam) {
      if (estimates.size >= 2) {
        map.set(`${tid}|${ymd}`, [...estimates].sort());
      }
    }
  }
  return map;
}

export type DoubleBookBarHighlight = {
  /** One flag per day column in this bar segment (length === `seg.colSpan`). */
  dayFlags: boolean[];
  tooltip: string;
};

/**
 * Per-day red outline flags and a hover explanation for locked jobs when the team is on multiple
 * projects the same day.
 */
export function buildDoubleBookHighlightForWeekBar(
  row: WeekCalRow,
  weekStart: Date,
  seg: { colStart: number; colSpan: number },
  teamMultiProjectDay: Map<string, string[]>,
  estimateTitles: Map<string, string>
): DoubleBookBarHighlight | null {
  if (row.isBacklog || row.scheduleTentative || !row.estimateId?.trim()) {
    return null;
  }
  const teamId = row.colorKey.trim();
  const myEst = row.estimateId.trim();
  const workYmds = new Set(workDateYmdsForCalendarRow(row));
  const ws = startOfDay(weekStart);
  const dayFlags: boolean[] = [];
  const lines: string[] = [];
  for (let i = 0; i < seg.colSpan; i += 1) {
    const d = addDays(ws, seg.colStart - 1 + i);
    const ymd = format(d, 'yyyy-MM-dd');
    const onThisDay = workYmds.has(ymd);
    const key = `${teamId}|${ymd}`;
    const ids = teamMultiProjectDay.get(key);
    const conflict =
      onThisDay && ids && ids.length >= 2 && ids.includes(myEst);
    dayFlags.push(Boolean(conflict));
    if (conflict && ids) {
      const others = ids.filter((id) => id !== myEst);
      const titles = others.map((id) => estimateTitles.get(id)?.trim() || id);
      lines.push(`${format(d, 'EEE, MMM d')}: also assigned to ${titles.join(', ')}`);
    }
  }
  if (!dayFlags.some(Boolean)) {
    return null;
  }
  const teamLabel = row.teamName?.trim() || 'This team';
  const tooltip = [
    `Double booking: ${teamLabel} is scheduled on multiple projects the same day.`,
    ...lines,
  ].join('\n');
  return { dayFlags, tooltip };
}

export function assignLanesForWeek(
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

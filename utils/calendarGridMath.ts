import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isWeekend,
  max,
  min,
  startOfDay,
  startOfWeek,
} from 'date-fns';

import { parseLocalDateString } from '@/utils/calendarWorkingDays';

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

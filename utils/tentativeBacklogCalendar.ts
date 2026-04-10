import { addDays, format, isWeekend, startOfDay } from 'date-fns';

import { parseLocalDateString } from '@/utils/calendarWorkingDays';
import {
  dateInActiveDateRange,
  DEFAULT_SCHEDULE_DAILY_HOURS,
  isWorkDayFromWeekSpecifier,
  pickCapacityRowForDate,
  type TeamCapacityRowInput,
} from '@/utils/scheduleMath';
import {
  adjustStartForSchedulingSeason,
  DEFAULT_SCHEDULING_SEASON_RULES,
  type SchedulingSeasonRules,
} from '@/utils/schedulingSeason';

/** Subset of calendar team shape; backlog bar math only needs capacity + crew size. */
export type TeamShapeForBacklogBar = {
  id: string;
  name: string;
  memberCount?: number;
  scheduleFromApi?: {
    painterCount: number;
    capacityRows: TeamCapacityRowInput[];
  };
};

export type BacklogLaborItem = {
  labor_hours?: number;
  /** Aligns tentative bars with API lock-in (exterior season, etc.). */
  estimate_type?: string;
};

/** Inclusive calendar span for locked jobs (YYYY-MM-DD), merged for overlap/touch. */
export type LockedIntervalIso = { startIso: string; endIso: string };

export type SyntheticTeamBacklogCalendarEvent = {
  schedule_id: string;
  estimate_id: null;
  title: string;
  team_id: string;
  team_name: string;
  schedule_start_date: string;
  schedule_end_date: string;
  schedule_tentative: boolean;
  schedule_work_dates: string[];
  schedule_non_working_dates: string[];
  calendar_kind: 'team_backlog';
};

function crewSize(team: TeamShapeForBacklogBar): number {
  if (team.memberCount && team.memberCount > 0) {
    return team.memberCount;
  }
  if (team.scheduleFromApi?.painterCount && team.scheduleFromApi.painterCount > 0) {
    return team.scheduleFromApi.painterCount;
  }
  return 1;
}

function isTeamWorkingDay(team: TeamShapeForBacklogBar, d: Date): boolean {
  const rows = team.scheduleFromApi?.capacityRows;
  if (!rows?.length) {
    return !isWeekend(d);
  }
  const row = pickCapacityRowForDate(rows, d);
  if (!dateInActiveDateRange(d, row.active_dates)) {
    return false;
  }
  return isWorkDayFromWeekSpecifier(row.working_days)(d);
}

function dailyLaborCapacityOnDate(team: TeamShapeForBacklogBar, d: Date): number {
  if (!isTeamWorkingDay(team, d)) {
    return 0;
  }
  const m = crewSize(team);
  const rows = team.scheduleFromApi?.capacityRows ?? [];
  if (!rows.length) {
    return m * DEFAULT_SCHEDULE_DAILY_HOURS;
  }
  const row = pickCapacityRowForDate(rows, d);
  return m * row.hours_per_day;
}

function nextTeamWorkDayOnOrAfter(team: TeamShapeForBacklogBar, fromDay: Date): Date {
  let cur = startOfDay(fromDay);
  for (let i = 0; i < 366; i += 1) {
    if (isTeamWorkingDay(team, cur)) {
      return cur;
    }
    cur = addDays(cur, 1);
  }
  return cur;
}

/** Merge overlapping or touching locked spans
 * (matches job-engine merge_inclusive_date_intervals). */
export function mergeLockedIntervals(intervals: LockedIntervalIso[]): LockedIntervalIso[] {
  if (!intervals.length) {
    return [];
  }
  const sorted = [...intervals]
    .map((iv) => ({
      start: startOfDay(parseLocalDateString(iv.startIso.slice(0, 10))),
      end: startOfDay(parseLocalDateString(iv.endIso.slice(0, 10))),
    }))
    .filter((iv) => iv.end >= iv.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  if (!sorted.length) {
    return [];
  }
  const out: { start: Date; end: Date }[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i += 1) {
    const cur = sorted[i];
    const last = out[out.length - 1];
    if (cur.start.getTime() <= addDays(last.end, 1).getTime()) {
      last.end = cur.end > last.end ? cur.end : last.end;
    } else {
      out.push({ ...cur });
    }
  }
  return out.map((iv) => ({
    startIso: format(iv.start, 'yyyy-MM-dd'),
    endIso: format(iv.end, 'yyyy-MM-dd'),
  }));
}

function dateInLockedInterval(d: Date, intervals: LockedIntervalIso[]): boolean {
  const t = startOfDay(d).getTime();
  for (const iv of intervals) {
    const s = startOfDay(parseLocalDateString(iv.startIso.slice(0, 10))).getTime();
    const e = startOfDay(parseLocalDateString(iv.endIso.slice(0, 10))).getTime();
    if (t >= s && t <= e) {
      return true;
    }
  }
  return false;
}

function advanceCursorPastLockedIntervals(
  team: TeamShapeForBacklogBar,
  cursor: Date,
  intervals: LockedIntervalIso[]
): Date {
  let cur = startOfDay(cursor);
  let guard = 0;
  while (guard < 366) {
    guard += 1;
    let moved = false;
    for (const iv of intervals) {
      const s = startOfDay(parseLocalDateString(iv.startIso.slice(0, 10)));
      const e = startOfDay(parseLocalDateString(iv.endIso.slice(0, 10)));
      const c = startOfDay(cur);
      if (c >= s && c <= e) {
        cur = nextTeamWorkDayOnOrAfter(team, addDays(e, 1));
        moved = true;
        break;
      }
    }
    if (!moved) {
      return cur;
    }
  }
  return cur;
}

function endDateAfterNBacklogWorkingDays(
  team: TeamShapeForBacklogBar,
  start: Date,
  n: number,
  intervals: LockedIntervalIso[]
): Date {
  if (n <= 0) {
    return addDays(startOfDay(start), -1);
  }
  let cur = startOfDay(start);
  let left = n;
  for (let iter = 0; iter < 732; iter += 1) {
    if (isTeamWorkingDay(team, cur) && !dateInLockedInterval(cur, intervals)) {
      left -= 1;
      if (left === 0) {
        return cur;
      }
    }
    cur = addDays(cur, 1);
  }
  return cur;
}

/** working_days = ceil(labor_hours / daily_capacity) (matches job-engine backlog cursor rules). */
export function workingDaysFromLaborHoursCeil(
  laborHours: number,
  dailyCapacity: number
): number {
  if (laborHours <= 1e-9 || dailyCapacity <= 1e-9) {
    return 0;
  }
  return Math.ceil(laborHours / dailyCapacity - 1e-15);
}

export type TentativeBacklogPlacementClient = {
  schedule_start_date: string;
  schedule_end_date: string;
  schedule_work_dates: string[];
  /** Parallel to `items` input: ceil days per row (0 if no labor). */
  itemWorkingDays: number[];
  /** Inclusive start/end calendar dates per item; null when job has no labor days. */
  itemDateRanges: Array<{ startIso: string; endIso: string } | null>;
};

/**
 * Sequential placement from today, skipping locked job intervals (gap-aware).
 * Each job uses working_days = ceil(labor_hours / daily_labor_capacity at block start).
 */
export function computeTentativeBacklogPlacementClient(
  team: TeamShapeForBacklogBar,
  params: {
    /** Locked job inclusive date spans for this team (merged inside). */
    lockedIntervals?: LockedIntervalIso[] | null;
    items: BacklogLaborItem[];
    /** Contractor scheduling season; when omitted, defaults match the API engine. */
    seasonRules?: SchedulingSeasonRules;
  }
): TentativeBacklogPlacementClient | null {
  if (!params.items.length) {
    return null;
  }

  const seasonRules = params.seasonRules ?? DEFAULT_SCHEDULING_SEASON_RULES;
  const locked = mergeLockedIntervals(params.lockedIntervals ?? []);

  let cursor = nextTeamWorkDayOnOrAfter(team, startOfDay(new Date()));
  cursor = advanceCursorPastLockedIntervals(team, cursor, locked);

  const workDates: string[] = [];
  const itemWorkingDays: number[] = [];
  const itemDateRanges: Array<{ startIso: string; endIso: string } | null> = [];

  for (const it of params.items) {
    const raw = Number(it.labor_hours) || 0;
    if (raw <= 1e-9) {
      itemWorkingDays.push(0);
      itemDateRanges.push(null);
    } else {
      let guard = 0;
      while (guard < 366) {
        guard += 1;
        cursor = advanceCursorPastLockedIntervals(team, cursor, locked);
        cursor = adjustStartForSchedulingSeason(cursor, it.estimate_type, seasonRules);
        cursor = advanceCursorPastLockedIntervals(team, cursor, locked);
        const cap = dailyLaborCapacityOnDate(team, cursor);
        if (cap > 1e-9) {
          break;
        }
        cursor = nextTeamWorkDayOnOrAfter(team, addDays(cursor, 1));
      }
      if (guard >= 366) {
        return null;
      }
      const cap = dailyLaborCapacityOnDate(team, cursor);
      if (cap <= 1e-9) {
        return null;
      }
      const wd = Math.max(1, workingDaysFromLaborHoursCeil(raw, cap));
      itemWorkingDays.push(wd);
      const startBlock = startOfDay(cursor);
      const end = endDateAfterNBacklogWorkingDays(team, cursor, wd, locked);
      itemDateRanges.push({
        startIso: format(startBlock, 'yyyy-MM-dd'),
        endIso: format(startOfDay(end), 'yyyy-MM-dd'),
      });
      let walk = startOfDay(cursor);
      const endWalk = startOfDay(end);
      while (walk <= endWalk) {
        if (isTeamWorkingDay(team, walk) && !dateInLockedInterval(walk, locked)) {
          workDates.push(format(walk, 'yyyy-MM-dd'));
        }
        walk = addDays(walk, 1);
      }
      cursor = nextTeamWorkDayOnOrAfter(team, addDays(endWalk, 1));
      cursor = advanceCursorPastLockedIntervals(team, cursor, locked);
    }
  }

  if (!workDates.length) {
    return null;
  }
  return {
    schedule_start_date: workDates[0],
    schedule_end_date: workDates[workDates.length - 1],
    schedule_work_dates: workDates,
    itemWorkingDays,
    itemDateRanges,
  };
}

export function computeTentativeBacklogCalendarBar(
  team: TeamShapeForBacklogBar,
  params: {
    lockedIntervals?: LockedIntervalIso[] | null;
    items: BacklogLaborItem[];
    seasonRules?: SchedulingSeasonRules;
  }
): Omit<TentativeBacklogPlacementClient, 'itemWorkingDays' | 'itemDateRanges'> | null {
  const p = computeTentativeBacklogPlacementClient(team, params);
  if (!p) {
    return null;
  }
  const { itemWorkingDays: _w, itemDateRanges: _d, ...rest } = p;
  return rest;
}

export function buildSyntheticTeamBacklogCalendarEvent(
  team: TeamShapeForBacklogBar,
  backlog: {
    items: BacklogLaborItem[];
    lockedIntervals?: LockedIntervalIso[] | null;
    seasonRules?: SchedulingSeasonRules;
  }
): SyntheticTeamBacklogCalendarEvent | null {
  const bar = computeTentativeBacklogCalendarBar(team, {
    lockedIntervals: backlog.lockedIntervals,
    items: backlog.items,
    seasonRules: backlog.seasonRules,
  });
  if (!bar) {
    return null;
  }
  return {
    schedule_id: `backlog:${team.id}`,
    estimate_id: null,
    title: `Tentative backlog (${team.name})`,
    team_id: team.id,
    team_name: team.name,
    schedule_start_date: bar.schedule_start_date,
    schedule_end_date: bar.schedule_end_date,
    schedule_tentative: true,
    schedule_work_dates: bar.schedule_work_dates,
    schedule_non_working_dates: [],
    calendar_kind: 'team_backlog',
  };
}

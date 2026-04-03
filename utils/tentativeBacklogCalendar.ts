import { addDays, format, isWeekend, startOfDay } from 'date-fns';

import { parseLocalDateString } from '@/utils/calendarWorkingDays';
import {
  dateInActiveDateRange,
  DEFAULT_SCHEDULE_DAILY_HOURS,
  isWorkDayFromWeekSpecifier,
  pickCapacityRowForDate,
  type TeamCapacityRowInput,
} from '@/utils/scheduleMath';

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
};

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

function endDateAfterNWorkingDays(
  team: TeamShapeForBacklogBar,
  start: Date,
  n: number
): Date {
  if (n <= 0) {
    return addDays(startOfDay(start), -1);
  }
  let cur = startOfDay(start);
  let left = n;
  for (let iter = 0; iter < 732; iter += 1) {
    if (isTeamWorkingDay(team, cur)) {
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
 * Sequential placement after the last locked job's end date (from calendar data), else today:
 * each job uses working_days = ceil(labor_hours / daily_labor_capacity at block start).
 */
export function computeTentativeBacklogPlacementClient(
  team: TeamShapeForBacklogBar,
  params: {
    /**
     * Max locked job `schedule_end_date` (ISO) for this team; backlog starts the next calendar day.
     */
    lastLockedJobEndDateIso: string | null | undefined;
    items: BacklogLaborItem[];
  }
): TentativeBacklogPlacementClient | null {
  if (!params.items.length) {
    return null;
  }

  let anchor: Date;
  if (params.lastLockedJobEndDateIso?.trim()) {
    anchor = addDays(startOfDay(parseLocalDateString(params.lastLockedJobEndDateIso)), 1);
  } else {
    anchor = startOfDay(new Date());
  }
  let cursor = nextTeamWorkDayOnOrAfter(team, anchor);
  const workDates: string[] = [];
  const itemWorkingDays: number[] = [];
  const itemDateRanges: Array<{ startIso: string; endIso: string } | null> = [];

  for (const it of params.items) {
    const raw = Number(it.labor_hours) || 0;
    if (raw <= 1e-9) {
      itemWorkingDays.push(0);
      itemDateRanges.push(null);
    } else {
      let cap = dailyLaborCapacityOnDate(team, cursor);
      let guard = 0;
      while (cap <= 1e-9 && guard < 366) {
        cursor = nextTeamWorkDayOnOrAfter(team, addDays(cursor, 1));
        cap = dailyLaborCapacityOnDate(team, cursor);
        guard += 1;
      }
      if (cap <= 1e-9) {
        return null;
      }
      const wd = Math.max(1, workingDaysFromLaborHoursCeil(raw, cap));
      itemWorkingDays.push(wd);
      const startBlock = startOfDay(cursor);
      const end = endDateAfterNWorkingDays(team, cursor, wd);
      itemDateRanges.push({
        startIso: format(startBlock, 'yyyy-MM-dd'),
        endIso: format(startOfDay(end), 'yyyy-MM-dd'),
      });
      let walk = startOfDay(cursor);
      const endWalk = startOfDay(end);
      while (walk <= endWalk) {
        if (isTeamWorkingDay(team, walk)) {
          workDates.push(format(walk, 'yyyy-MM-dd'));
        }
        walk = addDays(walk, 1);
      }
      cursor = nextTeamWorkDayOnOrAfter(team, addDays(endWalk, 1));
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
    lastLockedJobEndDateIso: string | null | undefined;
    items: BacklogLaborItem[];
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
    lastLockedJobEndDateIso: string | null | undefined;
  }
): SyntheticTeamBacklogCalendarEvent | null {
  const bar = computeTentativeBacklogCalendarBar(team, {
    lastLockedJobEndDateIso: backlog.lastLockedJobEndDateIso,
    items: backlog.items,
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

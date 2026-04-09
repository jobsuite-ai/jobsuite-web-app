import { addDays, isWeekend, startOfDay } from 'date-fns';

import type { ScheduleTeam } from '@/hooks/useTeamConfig';

/** Default hours applied per business day when no team-specific capacity is available. */
export const DEFAULT_SCHEDULE_DAILY_HOURS = 10;

/** API / Employee teams: one row from `team_config.team_capacity`. */
export interface TeamCapacityRowInput {
  hours_per_day: number;
  working_days: string;
  active_dates: string;
}

const WEEKDAY_ABBREV_TO_JS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function isBusinessDay(d: Date): boolean {
  return !isWeekend(d);
}

/**
 * CSV like `Mon,Tue,Wed,Thu,Fri` (as in Employee teams). Empty/invalid → Mon–Fri.
 */
export function isWorkDayFromWeekSpecifier(workingDaysCsv: string): (d: Date) => boolean {
  const raw = workingDaysCsv.trim();
  if (!raw) {
    return isBusinessDay;
  }
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = new Set<number>();
  for (const p of parts) {
    const k = p.length > 3 ? p.slice(0, 3) : p;
    const cap = k.charAt(0).toUpperCase() + k.slice(1, 3).toLowerCase();
    const n = WEEKDAY_ABBREV_TO_JS[cap];
    if (typeof n === 'number') {
      allowed.add(n);
    }
  }
  if (allowed.size === 0) {
    return isBusinessDay;
  }
  return (d: Date) => allowed.has(d.getDay());
}

function parseSlashMonthDay(s: string): { month: number; day: number } | null {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

/**
 * `active_dates` like `01/01 - 12/31` or seasons that cross the year (`11/01 - 02/28`).
 */
export function dateInActiveDateRange(date: Date, active_dates: string): boolean {
  const raw = active_dates.trim();
  if (!raw) {
    return true;
  }
  const parts = raw.split(/\s*-\s*/);
  if (parts.length !== 2) {
    return true;
  }
  const a = parseSlashMonthDay(parts[0]);
  const b = parseSlashMonthDay(parts[1]);
  if (!a || !b) {
    return true;
  }
  const t = startOfDay(date).getTime();
  const y = date.getFullYear();
  for (const base of [y - 1, y, y + 1]) {
    let endYear = base;
    if (b.month < a.month || (b.month === a.month && b.day < a.day)) {
      endYear = base + 1;
    }
    const s = startOfDay(new Date(base, a.month - 1, a.day)).getTime();
    const e = startOfDay(new Date(endYear, b.month - 1, b.day)).getTime();
    if (s <= e && t >= s && t <= e) {
      return true;
    }
  }
  return false;
}

export function pickCapacityRowForDate(
  rows: TeamCapacityRowInput[],
  ref: Date
): TeamCapacityRowInput {
  if (!rows.length) {
    return {
      hours_per_day: DEFAULT_SCHEDULE_DAILY_HOURS,
      working_days: 'Mon,Tue,Wed,Thu,Fri',
      active_dates: '',
    };
  }
  const matched = rows.find((r) => dateInActiveDateRange(ref, r.active_dates));
  return matched ?? rows[0];
}

function nextWorkDayFrom(d: Date, isWorkDay: (x: Date) => boolean): Date {
  let x = startOfDay(d);
  let guard = 0;
  while (!isWorkDay(x) && guard < 366) {
    x = addDays(x, 1);
    guard += 1;
  }
  return x;
}

/**
 * Daily productive hours for scheduling: team weekly capacity / 5 business days,
 * or painterCount * weeklyHours / 5 when both present, else defaultDailyHours.
 */
export function getDailyCapacityHours(
  teamId: string | null | undefined,
  scheduleTeams: ScheduleTeam[],
  defaultDailyHours: number
): number {
  const safeDefault =
    typeof defaultDailyHours === 'number' && defaultDailyHours > 0
      ? defaultDailyHours
      : DEFAULT_SCHEDULE_DAILY_HOURS;
  if (!teamId || !scheduleTeams.length) {
    return safeDefault;
  }
  const team = scheduleTeams.find((t) => t.id === teamId);
  if (!team) {
    return safeDefault;
  }
  const { painterCount, weeklyHours } = team;
  if (
    typeof painterCount === 'number' &&
    painterCount > 0 &&
    typeof weeklyHours === 'number' &&
    weeklyHours > 0
  ) {
    return (painterCount * weeklyHours) / 5;
  }
  if (typeof weeklyHours === 'number' && weeklyHours > 0) {
    return weeklyHours / 5;
  }
  /** `schedule_default_daily_hours` is per person; scale by crew size when set. */
  if (typeof painterCount === 'number' && painterCount > 0) {
    return safeDefault * painterCount;
  }
  return safeDefault;
}

/**
 * Last calendar day (start-of-day) needed to cover hoursBid, allocating up to
 * dailyCapacityHours per work day starting from start (inclusive).
 */
export function computeScheduledEndDate(params: {
  start: Date;
  hoursBid: number;
  dailyCapacityHours: number;
  /** If omitted, Mon–Fri (skip weekends). */
  isWorkDay?: (d: Date) => boolean;
}): Date {
  const isWorkDay = params.isWorkDay ?? isBusinessDay;
  const cap =
    params.dailyCapacityHours > 0 ? params.dailyCapacityHours : DEFAULT_SCHEDULE_DAILY_HOURS;
  let remaining = Math.max(0, params.hoursBid);
  let day = nextWorkDayFrom(params.start, isWorkDay);
  let lastWorkDay = day;

  if (remaining <= 0) {
    return day;
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const use = Math.min(remaining, cap);
    remaining -= use;
    lastWorkDay = day;
    if (remaining <= 1e-9) {
      break;
    }
    day = addDays(day, 1);
    let guard = 0;
    while (!isWorkDay(day) && guard < 366) {
      day = addDays(day, 1);
      guard += 1;
    }
  }

  return lastWorkDay;
}

import { addDays, isWeekend, startOfDay } from 'date-fns';

import type { ScheduleTeam } from '@/hooks/useTeamConfig';

/** Default hours applied per business day when no team-specific capacity is available. */
export const DEFAULT_SCHEDULE_DAILY_HOURS = 8;

export function isBusinessDay(d: Date): boolean {
  return !isWeekend(d);
}

function nextBusinessDayFrom(d: Date): Date {
  let x = startOfDay(d);
  let guard = 0;
  while (!isBusinessDay(x) && guard < 14) {
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
  return safeDefault;
}

/**
 * Last calendar day (start-of-day) needed to cover hoursBid, allocating up to
 * dailyCapacityHours per business day starting from start (inclusive).
 */
export function computeScheduledEndDate(params: {
  start: Date;
  hoursBid: number;
  dailyCapacityHours: number;
}): Date {
  const cap =
    params.dailyCapacityHours > 0 ? params.dailyCapacityHours : DEFAULT_SCHEDULE_DAILY_HOURS;
  let remaining = Math.max(0, params.hoursBid);
  let day = nextBusinessDayFrom(params.start);
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
    while (!isBusinessDay(day) && guard < 14) {
      day = addDays(day, 1);
      guard += 1;
    }
  }

  return lastWorkDay;
}

import { addDays, format, isAfter, isBefore, isWeekend, startOfDay } from 'date-fns';

import { parseLocalDateString } from '@/utils/calendarWorkingDays';

function ymd(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Mon–Fri baseline when no team row on the client (matches web fallback). */
function baselineWeekday(d: Date): boolean {
  return !isWeekend(d);
}

function setDayWorkDesired(toggles: Set<string>, ymdStr: string, wantWork: boolean): void {
  const d = parseLocalDateString(ymdStr);
  const base = baselineWeekday(d);
  const effective = base !== toggles.has(ymdStr);
  if (effective === wantWork) {
    return;
  }
  if (toggles.has(ymdStr)) {
    toggles.delete(ymdStr);
  } else {
    toggles.add(ymdStr);
  }
}

/**
 * Adjust `schedule_day_toggles` so the last scheduled work day in the given week moves toward
 * `desiredLastYmd`, using current preview work dates as the starting schedule.
 */
export function computeTogglesAfterResizeWeekEdge(params: {
  prevToggleYmds: string[];
  previewWorkYmds: string[];
  weekStart: Date;
  weekEnd: Date;
  desiredLastYmd: string;
}): string[] {
  const toggles = new Set(params.prevToggleYmds.map((s) => s.slice(0, 10)));
  const weekStart = startOfDay(params.weekStart);
  const weekEnd = startOfDay(params.weekEnd);
  const inWeek = params.previewWorkYmds
    .map((s) => s.slice(0, 10))
    .filter((s) => {
      const d = parseLocalDateString(s);
      return !isBefore(d, weekStart) && !isAfter(d, weekEnd);
    })
    .sort();
  const lastInWeek = inWeek[inWeek.length - 1];
  const desired = params.desiredLastYmd.slice(0, 10);
  if (!lastInWeek) {
    return [...toggles].sort();
  }
  if (desired === lastInWeek) {
    return [...toggles].sort();
  }

  const lastD = parseLocalDateString(lastInWeek);
  const targetD = parseLocalDateString(desired);

  if (lastD > targetD) {
    let cur = lastD;
    while (cur > targetD) {
      const y = ymd(cur);
      if (inWeek.includes(y)) {
        setDayWorkDesired(toggles, y, false);
      }
      cur = addDays(cur, -1);
    }
  } else {
    let cur = addDays(lastD, 1);
    while (cur <= targetD) {
      if (!isBefore(cur, weekStart) && !isAfter(cur, weekEnd)) {
        setDayWorkDesired(toggles, ymd(cur), true);
      }
      cur = addDays(cur, 1);
    }
  }

  return [...toggles].sort();
}

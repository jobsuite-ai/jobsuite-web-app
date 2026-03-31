import {
  differenceInCalendarDays,
  eachDayOfInterval,
  isAfter,
  isWeekend,
  startOfDay,
} from 'date-fns';

/**
 * Split an inclusive date range into contiguous segments of **weekdays only** (Mon–Fri).
 * Used so calendar bars skip Sat/Sun when jobs span multiple weeks.
 * (Team configuration will eventually own working-day / capacity rules; this stays the
 * default when “show weekends” is off.)
 */
export function splitRangeIntoWeekdaySegments(
  start: Date,
  end: Date
): { start: Date; end: Date }[] {
  const s = startOfDay(start);
  const e = startOfDay(end);
  if (isAfter(s, e)) {
    return [];
  }

  const workDays = eachDayOfInterval({ start: s, end: e }).filter((d) => !isWeekend(d));
  if (workDays.length === 0) {
    return [];
  }

  const segments: { start: Date; end: Date }[] = [];
  let runStart = workDays[0];
  let prev = workDays[0];
  for (let i = 1; i < workDays.length; i += 1) {
    const d = workDays[i];
    if (differenceInCalendarDays(d, prev) === 1) {
      prev = d;
    } else {
      segments.push({ start: runStart, end: prev });
      runStart = d;
      prev = d;
    }
  }
  segments.push({ start: runStart, end: prev });
  return segments;
}

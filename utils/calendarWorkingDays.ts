import {
  differenceInCalendarDays,
  eachDayOfInterval,
  isAfter,
  isWeekend,
  parse,
  startOfDay,
} from 'date-fns';

/**
 * Parse API date-only strings (YYYY-MM-DD) in the user's local calendar.
 * `parseISO` uses UTC midnight for date-only strings, which shifts the day in US timezones.
 */
export function parseLocalDateString(iso: string): Date {
  const ymd = iso.trim().slice(0, 10);
  return parse(ymd, 'yyyy-MM-dd', new Date());
}

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

/**
 * Build display segments from explicit work dates (API `schedule_work_dates`).
 * E.g. Thu + Mon–Tue when the team does not work Fridays. Contiguous days form one segment.
 */
export function splitExplicitWorkDatesIntoContiguousSegments(
  isoDates: string[]
): { start: Date; end: Date }[] {
  if (!isoDates.length) {
    return [];
  }
  const parsed = isoDates
    .map((s) => startOfDay(parseLocalDateString(s)))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (parsed.length === 0) {
    return [];
  }
  const unique: Date[] = [];
  for (const d of parsed) {
    if (unique.length === 0 || d.getTime() !== unique[unique.length - 1].getTime()) {
      unique.push(d);
    }
  }
  const segments: { start: Date; end: Date }[] = [];
  let runStart = unique[0];
  let prev = unique[0];
  for (let i = 1; i < unique.length; i += 1) {
    const d = unique[i];
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

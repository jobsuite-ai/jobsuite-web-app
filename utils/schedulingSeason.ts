import { format, startOfDay } from 'date-fns';

import { apiEstimateType } from '@/utils/scheduleApiTypes';

/** Matches job-engine `SeasonRules` / contractor_config keys. */
export type SchedulingSeasonRules = {
  exteriorEarliestMmdd: string;
  interiorYearRound: boolean;
};

export const DEFAULT_SCHEDULING_SEASON_RULES: SchedulingSeasonRules = {
  exteriorEarliestMmdd: '04-15',
  interiorYearRound: true,
};

/** Normalize API values to MM-DD (matches `_load_season_rules` in schedule_routes). */
export function normalizeExteriorEarliestMmdd(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) {
    return DEFAULT_SCHEDULING_SEASON_RULES.exteriorEarliestMmdd;
  }
  let s = raw.trim();
  if (s.includes('/') && (s.match(/\//g) || []).length === 1) {
    const [a, b] = s.split('/', 2);
    s = `${a.trim().padStart(2, '0')}-${b.trim().padStart(2, '0')}`;
  }
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(s);
  if (!m) {
    return DEFAULT_SCHEDULING_SEASON_RULES.exteriorEarliestMmdd;
  }
  const mo = Number(m[1]);
  const day = Number(m[2]);
  if (mo < 1 || mo > 12 || day < 1 || day > 31) {
    return DEFAULT_SCHEDULING_SEASON_RULES.exteriorEarliestMmdd;
  }
  return `${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseSeasonMonthDay(mmdd: string): { month: number; day: number } {
  const m = /^(\d{2})-(\d{2})$/.exec(mmdd.trim());
  if (!m) {
    return { month: 4, day: 15 };
  }
  return { month: Number(m[1]), day: Number(m[2]) };
}

/** `exterior_allowed_on_date` in scheduling_engine.py */
export function exteriorAllowedOnDate(d: Date, exteriorEarliestMmdd: string): boolean {
  const { month, day } = parseSeasonMonthDay(exteriorEarliestMmdd);
  const start = startOfDay(new Date(d.getFullYear(), month - 1, day));
  return startOfDay(d).getTime() >= start.getTime();
}

/** `job_type_allows_date` in scheduling_engine.py */
export function jobTypeAllowsStartDate(
  estimateTypeRaw: string | undefined,
  rules: SchedulingSeasonRules,
  d: Date
): boolean {
  const et = apiEstimateType(estimateTypeRaw);
  if (et === 'INTERIOR') {
    return rules.interiorYearRound;
  }
  if (et === 'EXTERIOR' || et === 'BOTH') {
    return exteriorAllowedOnDate(d, rules.exteriorEarliestMmdd);
  }
  return true;
}

/** `next_exterior_season_start` in scheduling_engine.py */
export function nextExteriorSeasonStart(fromDay: Date, exteriorEarliestMmdd: string): Date {
  const { month, day } = parseSeasonMonthDay(exteriorEarliestMmdd);
  const y = fromDay.getFullYear();
  const candidate = startOfDay(new Date(y, month - 1, day));
  const from = startOfDay(fromDay);
  if (from.getTime() < candidate.getTime()) {
    return candidate;
  }
  return startOfDay(new Date(y + 1, month - 1, day));
}

/**
 * When locking a schedule, the engine snaps the start forward to the exterior season if the
 * job type is exterior/both and the day is before season — mirror that for tentative backlog.
 */
export function adjustStartForSchedulingSeason(
  cursor: Date,
  estimateTypeRaw: string | undefined,
  rules: SchedulingSeasonRules
): Date {
  const d = startOfDay(cursor);
  if (jobTypeAllowsStartDate(estimateTypeRaw, rules, d)) {
    return d;
  }
  return startOfDay(nextExteriorSeasonStart(d, rules.exteriorEarliestMmdd));
}

/**
 * Short message when this calendar day cannot be the schedule start (drag/drop UX).
 * Returns null when the date is allowed.
 */
export function reasonStartDateNotAllowed(
  estimateTypeRaw: string | undefined,
  rules: SchedulingSeasonRules,
  d: Date
): string | null {
  if (jobTypeAllowsStartDate(estimateTypeRaw, rules, d)) {
    return null;
  }
  const et = apiEstimateType(estimateTypeRaw);
  if (et === 'INTERIOR' && !rules.interiorYearRound) {
    return 'Interior scheduling is turned off for this period in your settings.';
  }
  if (et === 'EXTERIOR' || et === 'BOTH') {
    const earliest = nextExteriorSeasonStart(startOfDay(d), rules.exteriorEarliestMmdd);
    return `Exterior work isn’t in season yet. Earliest start is ${format(earliest, 'MMM d, yyyy')}.`;
  }
  return 'This job type can’t start on this date with your current scheduling settings.';
}

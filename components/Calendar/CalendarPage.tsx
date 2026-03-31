'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Switch,
  Text,
  Title,
  useMantineTheme,
} from '@mantine/core';
import '@mantine/dates/styles.css';
import {
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
} from '@tabler/icons-react';
import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  eachWeekOfInterval,
  endOfWeek,
  format,
  isAfter,
  isValid,
  isWeekend,
  max,
  min,
  parse,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import classes from './CalendarPage.module.css';
import { ScheduleJobModal } from './ScheduleJobModal';

import type { Estimate } from '@/components/Global/model';
import { useDataCache } from '@/contexts/DataCacheContext';
import { type TeamConfig, useTeamConfig } from '@/hooks/useTeamConfig';
import {
  isCalendarScheduledProject,
  isUnscheduledPipelineProject,
} from '@/utils/calendarProjectFilters';
import { splitRangeIntoWeekdaySegments } from '@/utils/calendarWorkingDays';
import { mantineColorToCss, colorForScheduleKey } from '@/utils/scheduleColors';
import {
  computeScheduledEndDate,
  getDailyCapacityHours,
} from '@/utils/scheduleMath';

/** Vertical stride for stacked bars (must be ≥ bar min-height + top margin). */
const CAL_EVENT_ROW_PX = 56;
const CAL_WEEK_BODY_MIN_PX = 112;

const SHOW_WEEKENDS_STORAGE_KEY = 'jobsuite-calendar-show-weekends';

/** Always four weeks: anchor week plus the following three (Mon-start weeks). */
function getFourWeekRange(anchor: Date): { start: Date; end: Date } {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const end = endOfWeek(addWeeks(start, 3), { weekStartsOn: 1 });
  return { start, end };
}

function navigateFourWeekWindow(anchor: Date, dir: -1 | 1): Date {
  return addWeeks(anchor, dir * 4);
}

function getEffectiveRange(
  estimate: Estimate,
  teamConfig: TeamConfig
): { start: Date; end: Date } | null {
  if (!estimate.scheduled_date?.trim()) {
    return null;
  }
  const start = startOfDay(parseISO(estimate.scheduled_date));
  if (estimate.scheduled_end_date?.trim()) {
    const end = startOfDay(parseISO(estimate.scheduled_end_date));
    return end < start ? { start: end, end: start } : { start, end };
  }
  const hours = estimate.hours_bid ?? 0;
  const daily = getDailyCapacityHours(
    estimate.schedule_team_id,
    teamConfig.scheduleTeams,
    teamConfig.scheduleDefaultDailyHours
  );
  const end = computeScheduledEndDate({
    start,
    hoursBid: hours,
    dailyCapacityHours: daily,
  });
  return { start, end };
}

/**
 * Map a date range onto week grid columns. `columnCount` 7 = Mon–Sun; 5 = Mon–Fri only
 * (Sat/Sun columns hidden in the UI).
 */
function segmentForWeek(
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

function columnRangeInclusive(seg: { colStart: number; colSpan: number }): [number, number] {
  return [seg.colStart, seg.colStart + seg.colSpan - 1];
}

function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return !(a[1] < b[0] || b[1] < a[0]);
}

/**
 * Assign each event to a horizontal "lane" (row) so only events that share at least
 * one day column stack vertically. Side-by-side events (e.g. Mon–Wed vs Fri–Sun) share a lane.
 */
function assignLanesForWeek(
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

export function CalendarPage() {
  const theme = useMantineTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { estimates, loading, refreshData, errors } = useDataCache();
  const { teamConfig, loading: teamLoading } = useTeamConfig();

  useEffect(() => {
    refreshData('estimates').catch(() => {});
  }, [refreshData]);

  const dateParam = searchParams.get('date');
  const anchor = useMemo(() => {
    if (dateParam) {
      const d = parse(dateParam, 'yyyy-MM-dd', new Date());
      if (isValid(d)) {
        return d;
      }
    }
    return new Date();
  }, [dateParam]);

  const setQuery = useCallback(
    (next: { date?: Date }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.date) {
        params.set('date', format(next.date, 'yyyy-MM-dd'));
      }
      router.replace(`/calendar?${params.toString()}`);
    },
    [router, searchParams]
  );

  const range = useMemo(() => getFourWeekRange(anchor), [anchor]);
  const weekStarts = useMemo(
    () => eachWeekOfInterval({ start: range.start, end: range.end }, { weekStartsOn: 1 }),
    [range.start, range.end]
  );

  const scheduled = useMemo(
    () => estimates.filter((e) => isCalendarScheduledProject(e)),
    [estimates]
  );

  const unscheduled = useMemo(
    () => estimates.filter((e) => isUnscheduledPipelineProject(e)),
    [estimates]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEstimate, setModalEstimate] = useState<Estimate | null>(null);

  const [showWeekends, setShowWeekends] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(SHOW_WEEKENDS_STORAGE_KEY) === 'true') {
        setShowWeekends(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setShowWeekendsPersisted = useCallback((next: boolean) => {
    setShowWeekends(next);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SHOW_WEEKENDS_STORAGE_KEY, next ? 'true' : 'false');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const openSchedule = useCallback((e: Estimate) => {
    setModalEstimate(e);
    setModalOpen(true);
  }, []);

  const eventsByWeek = useMemo(() => {
    const map = new Map<
      string,
      { estimate: Estimate; workRange: { start: Date; end: Date } }[]
    >();
    weekStarts.forEach((ws) => {
      const key = ws.toISOString();
      const list: { estimate: Estimate; workRange: { start: Date; end: Date } }[] = [];
      scheduled.forEach((estimate) => {
        const r = getEffectiveRange(estimate, teamConfig);
        if (!r) {
          return;
        }
        // Bars are always Mon–Fri segments; "Show weekends" only adds Sat/Sun columns to the grid.
        const spanParts = splitRangeIntoWeekdaySegments(r.start, r.end);
        const cols: 5 | 7 = showWeekends ? 7 : 5;
        spanParts.forEach((seg) => {
          if (segmentForWeek(ws, seg, cols)) {
            list.push({ estimate, workRange: seg });
          }
        });
      });
      map.set(key, list);
    });
    return map;
  }, [scheduled, teamConfig, weekStarts, showWeekends]);

  const handleSaved = useCallback(() => {
    refreshData('estimates').catch(() => {});
  }, [refreshData]);

  const loadingData = loading.estimates || teamLoading;
  const noPipelineMatches =
    estimates.length > 0 && scheduled.length === 0 && unscheduled.length === 0;

  const scheduleLegendEntries = useMemo(() => {
    const seen = new Set<string>();
    const rows: {
      key: string;
      teamName: string | null;
      crewLead: string;
      rosterHint: string;
    }[] = [];
    scheduled.forEach((e) => {
      const key = (e.schedule_team_id || e.project_crew_lead || 'default').trim() || 'default';
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      const team = e.schedule_team_id
        ? teamConfig.scheduleTeams.find((t) => t.id === e.schedule_team_id)
        : undefined;
      const crewLead = e.project_crew_lead?.trim() || '—';
      const parts: string[] = [];
      if (team?.painterCount != null) {
        parts.push(`${team.painterCount} painters`);
      }
      if (team?.weeklyHours != null) {
        parts.push(`${team.weeklyHours} hrs/wk`);
      }
      rows.push({
        key,
        teamName: team?.name ?? null,
        crewLead,
        rosterHint: parts.join(' · '),
      });
    });
    return rows.sort((a, b) => (a.teamName || a.crewLead).localeCompare(b.teamName || b.crewLead));
  }, [scheduled, teamConfig.scheduleTeams]);

  return (
    <Container size="xl" className={classes.calendar}>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Group>
              <Title order={2} c="white">Calendar</Title>
              <Switch
                size="sm"
                label="Show weekends"
                c="white"
                checked={showWeekends}
                onChange={(e) => setShowWeekendsPersisted(e.currentTarget.checked)}
              />
            </Group>
          </Stack>
          <Group gap="xs" align="center">
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => setQuery({ date: navigateFourWeekWindow(anchor, -1) })}
              aria-label="Previous four weeks"
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => setQuery({ date: navigateFourWeekWindow(anchor, 1) })}
              aria-label="Next four weeks"
            >
              <IconChevronRight size={18} />
            </ActionIcon>
            <Button
              variant="default"
              size="sm"
              onClick={() => setQuery({ date: new Date() })}
            >
              Today
            </Button>
          </Group>
        </Group>

        <Paper p="md" withBorder radius="md">
          <Group justify="space-between" mb="md">
            <Text fw={600}>
              {`${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`}
            </Text>
            <Group gap="xs">
              <Badge variant="light" color="gray">
                {estimates.length} loaded · {scheduled.length} scheduled · {unscheduled.length}{' '}
                unscheduled
              </Badge>
              <Button
                variant="light"
                size="compact-sm"
                leftSection={<IconRefresh size={14} />}
                loading={loading.estimates}
                onClick={() => refreshData('estimates')}
              >
                Refresh
              </Button>
            </Group>
          </Group>

          {scheduleLegendEntries.length > 0 && (
            <div className={classes.legendWrap}>
              <Text size="xs" fw={600} c="dimmed" mb="xs" tt="uppercase">
                Schedule colors
              </Text>
              <Group gap="lg" align="flex-start" wrap="wrap">
                {scheduleLegendEntries.map((row) => {
                  const { color, shade } = colorForScheduleKey(row.key);
                  const bg = mantineColorToCss(theme.colors, color, shade ?? 6);
                  const title = row.teamName || row.crewLead;
                  return (
                    <Group key={row.key} gap="xs" wrap="nowrap" align="flex-start">
                      <Box className={classes.legendSwatch} style={{ backgroundColor: bg }} />
                      <Stack gap={2}>
                        <Text size="sm" fw={600} lh={1.3}>
                          {title}
                        </Text>
                        {row.teamName ? (
                          <Text size="xs" c="dimmed" lh={1.35}>
                            Crew lead: {row.crewLead}
                            {row.rosterHint ? ` · ${row.rosterHint}` : ''}
                          </Text>
                        ) : (
                          <Text size="xs" c="dimmed" lh={1.35}>
                            Color from crew lead
                            {row.rosterHint ? ` · ${row.rosterHint}` : ''}
                          </Text>
                        )}
                      </Stack>
                    </Group>
                  );
                })}
              </Group>
            </div>
          )}

          {errors.estimates && (
            <Alert color="red" title="Could not load estimates" mb="md">
              {errors.estimates}
            </Alert>
          )}

          {loadingData ? (
            <Group justify="center" p="xl">
              <Loader />
            </Group>
          ) : (
            <Stack gap="xl">
              {estimates.length === 0 && (
                <Alert color="blue" title="No jobs in the app cache">
                  Estimates have not loaded yet or your account has no jobs. Use Refresh or sign in.
                  For local DynamoDB, run{' '}
                  <Text span inherit fw={600} component="span">
                    job-engine/scripts/setup-db.py
                  </Text>{' '}
                  (includes calendar seed projects).
                </Alert>
              )}
              {noPipelineMatches && (
                <Alert color="yellow" title="Nothing to show on the calendar yet">
                  You have {estimates.length} job(s), but none qualify for the calendar filters.
                </Alert>
              )}
              {weekStarts.map((weekStart) => {
                const key = weekStart.toISOString();
                const weekGridCols: 5 | 7 = showWeekends ? 7 : 5;
                const gridTemplateColumns = `repeat(${weekGridCols}, 1fr)`;
                const days = Array.from({ length: weekGridCols }, (_, i) => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + i);
                  return d;
                });
                const weekEvents = eventsByWeek.get(key) || [];
                const planned = weekEvents
                  .map(({ estimate, workRange }) => {
                    const seg = segmentForWeek(weekStart, workRange, weekGridCols);
                    if (!seg) {
                      return null;
                    }
                    return { estimate, seg, workRange };
                  })
                  .filter(
                    (
                      row
                    ): row is {
                      estimate: Estimate;
                      seg: { colStart: number; colSpan: number };
                      workRange: { start: Date; end: Date };
                    } => row !== null
                  );

                const lanes = assignLanesForWeek(planned.map((p) => p.seg));
                const numLanes = lanes.length > 0 ? Math.max(...lanes) + 1 : 0;
                const stackMinH = numLanes === 0 ? 0 : 12 + numLanes * CAL_EVENT_ROW_PX;
                const weekBodyMinH = Math.max(CAL_WEEK_BODY_MIN_PX, stackMinH);
                const weekEventsGridRows =
                  numLanes > 0
                    ? `repeat(${numLanes}, minmax(${CAL_EVENT_ROW_PX}px, auto))`
                    : undefined;

                return (
                  <div key={key} className={classes.weekBlock}>
                    <div className={classes.weekTitle}>
                      Week of {format(weekStart, 'MMM d, yyyy')}
                    </div>
                    <div className={classes.weekHeader} style={{ gridTemplateColumns }}>
                      {days.map((d) => (
                        <div key={d.toISOString()} className={classes.dayHeader}>
                          {format(d, 'EEE')}{' '}
                          <Text span inherit fw={700} c="var(--mantine-color-text)">
                            {format(d, 'd')}
                          </Text>
                        </div>
                      ))}
                    </div>
                    <div className={classes.weekBody} style={{ minHeight: weekBodyMinH }}>
                      <div
                        className={classes.weekDayCells}
                        style={{
                          minHeight: weekBodyMinH,
                          gridTemplateColumns,
                        }}
                      >
                        {days.map((d) => (
                          <div key={d.toISOString()} className={classes.dayCell} />
                        ))}
                      </div>
                      <div
                        className={classes.weekEvents}
                        style={{
                          gridTemplateColumns,
                          ...(weekEventsGridRows
                            ? { gridTemplateRows: weekEventsGridRows }
                            : {}),
                        }}
                      >
                        {planned.map(({ estimate, seg, workRange }, idx) => {
                          const lane = lanes[idx] ?? 0;
                          const { color, shade } = colorForScheduleKey(
                            estimate.schedule_team_id || estimate.project_crew_lead
                          );
                          const bg = mantineColorToCss(theme.colors, color, shade ?? 6);
                          const label =
                            estimate.title ||
                            estimate.address_street ||
                            estimate.client_name ||
                            'Job';
                          const teamName =
                            teamConfig.scheduleTeams.find((t) => t.id === estimate.schedule_team_id)
                              ?.name || null;
                          const segmentDates = `${format(workRange.start, 'MMM d')}–${format(
                            workRange.end,
                            'MMM d'
                          )}`;
                          return (
                            <Link
                              key={`${estimate.id}-${key}-${workRange.start.toISOString()}`}
                              href={`/proposals/${estimate.id}`}
                              className={classes.eventBar}
                              style={{
                                gridRow: lane + 1,
                                gridColumn: `${seg.colStart} / span ${seg.colSpan}`,
                                backgroundColor: bg,
                              }}
                            >
                              <div className={classes.eventTitle}>{label}</div>
                              <div className={classes.eventMeta}>
                                {segmentDates}
                                {' · '}
                                {estimate.project_crew_lead || '—'}
                                {teamName ? ` · ${teamName}` : ''}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </Stack>
          )}
        </Paper>

        {unscheduled.length > 0 && (
            <Paper p="md" withBorder radius="md">
            <Title order={4} mb="sm">
                Not scheduled yet
            </Title>
            <Text size="sm" c="dimmed" mb="md">
                Jobs in <strong>Project not scheduled</strong> status. Click to assign dates.
                Saving promotes them to Project scheduled.
            </Text>
            <ScrollArea className={classes.unscheduledList}>
                <Stack gap="xs">
                    {unscheduled.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      className={classes.unscheduledItem}
                      onClick={() => openSchedule(e)}
                    >
                        <Text size="sm" fw={600}>
                        {e.title || e.address_street || e.client_name || 'Job'}
                        </Text>
                        <Text size="xs" c="dimmed">
                        {e.status} · {(e.hours_bid ?? 0).toFixed(1)} bid hrs
                        </Text>
                    </button>
                    ))}
                </Stack>
            </ScrollArea>
            </Paper>
        )}
      </Stack>

      <ScheduleJobModal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalEstimate(null);
        }}
        estimate={modalEstimate}
        teamConfig={teamConfig}
        onSaved={handleSaved}
      />
    </Container>
  );
}

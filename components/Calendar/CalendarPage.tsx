'use client';

import type { CSSProperties } from 'react';
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
import { ScheduleJobModal, type CalendarTeamOption } from './ScheduleJobModal';

import { getApiHeaders } from '@/app/utils/apiClient';
import type { Estimate } from '@/components/Global/model';
import { useDataCache } from '@/contexts/DataCacheContext';
import { useTeamConfig } from '@/hooks/useTeamConfig';
import { isUnscheduledPipelineProject } from '@/utils/calendarProjectFilters';
import { splitRangeIntoWeekdaySegments } from '@/utils/calendarWorkingDays';
import { mantineColorToCss, colorForScheduleKey } from '@/utils/scheduleColors';

/** Vertical stride for stacked bars (must be ≥ bar min-height + top margin). */
const CAL_EVENT_ROW_PX = 56;
const CAL_WEEK_BODY_MIN_PX = 112;

const SHOW_WEEKENDS_STORAGE_KEY = 'jobsuite-calendar-show-weekends';

type BacklogByTeamPayload = {
  total_labor_hours: number;
  items: { schedule_id: string; estimate_id: string; job_name: string }[];
};

/** Locked jobs + synthetic team backlog bar from GET /schedule/calendar */
interface CalendarApiEvent {
  schedule_id: string;
  estimate_id: string | null;
  title: string | null;
  team_id: string | null;
  team_name: string | null;
  schedule_start_date: string | null;
  schedule_end_date: string | null;
  schedule_tentative: boolean;
  calendar_kind: 'job' | 'team_backlog';
}

type WeekCalRow = {
  rowKey: string;
  title: string;
  workRange: { start: Date; end: Date };
  colorKey: string;
  href: string | null;
  isBacklog: boolean;
  teamName: string | null;
};

/** Striped fill for tentative team-backlog bars (matches prior inline gradient). */
const BACKLOG_EVENT_STRIPED_BG =
  'linear-gradient(135deg, rgba(120,120,120,0.35) 25%, rgba(180,180,180,0.25) 25%, ' +
  'rgba(180,180,180,0.25) 50%, rgba(120,120,120,0.35) 50%, rgba(120,120,120,0.35) 75%, ' +
  'rgba(180,180,180,0.25) 75%)';

/** Always four weeks: anchor week plus the following three (Mon-start weeks). */
function getFourWeekRange(anchor: Date): { start: Date; end: Date } {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const end = endOfWeek(addWeeks(start, 3), { weekStartsOn: 1 });
  return { start, end };
}

function navigateFourWeekWindow(anchor: Date, dir: -1 | 1): Date {
  return addWeeks(anchor, dir * 4);
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

  const unscheduled = useMemo(
    () => estimates.filter((e) => isUnscheduledPipelineProject(e)),
    [estimates]
  );

  const [calendarEvents, setCalendarEvents] = useState<CalendarApiEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calTick, setCalTick] = useState(0);
  const [backlogByTeam, setBacklogByTeam] = useState<
    Record<string, BacklogByTeamPayload>
  >({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalEstimate, setModalEstimate] = useState<Estimate | null>(null);

  const [teams, setTeams] = useState<CalendarTeamOption[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    setTeamsLoading(true);
    fetch('/api/teams', { headers: getApiHeaders() })
      .then(async (res) => {
        const data = await res.json().catch(() => []);
        if (!res.ok || cancelled) {
          return;
        }
        const list = Array.isArray(data) ? data : [];
        const mapped: CalendarTeamOption[] = list
          .filter(
            (t: unknown): t is Record<string, unknown> =>
              Boolean(t) && typeof t === 'object' && 'id' in (t as object) && 'name' in (t as object)
          )
          .map((t) => ({
            id: String(t.id).trim(),
            name: String(t.name).trim() || String(t.id),
          }))
          .filter((t) => t.id.length > 0);
        if (!cancelled) {
          setTeams(mapped);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTeams([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTeamsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [calTick]);

  useEffect(() => {
    let cancelled = false;
    const from = format(range.start, 'yyyy-MM-dd');
    const to = format(range.end, 'yyyy-MM-dd');
    setCalendarLoading(true);
    setCalendarError(null);
    fetch(`/api/schedule/calendar?from=${from}&to=${to}`, { headers: getApiHeaders() })
      .then(async (res) => {
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          throw new Error(data.message || data.detail || 'Failed to load calendar');
        }
        if (!cancelled) {
          setCalendarEvents(Array.isArray(data) ? (data as CalendarApiEvent[]) : []);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setCalendarError(e.message || 'Calendar load failed');
          setCalendarEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCalendarLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [range.start, range.end, calTick]);

  useEffect(() => {
    let cancelled = false;
    if (teams.length === 0) {
      setBacklogByTeam({});
      return () => {
        cancelled = true;
      };
    }
    Promise.all(
      teams.map(async (t) => {
        const res = await fetch(`/api/teams/${t.id}/schedule-backlog`, { headers: getApiHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return [t.id, null] as const;
        }
        return [
          t.id,
          {
            total_labor_hours: Number(data.total_labor_hours) || 0,
            items: Array.isArray(data.items) ? data.items : [],
          },
        ] as const;
      })
    ).then((entries) => {
      if (cancelled) {
        return;
      }
      const next: Record<string, BacklogByTeamPayload> = {};
      for (const row of entries) {
        const [teamKey, payload] = row;
        if (payload) {
          next[teamKey] = payload;
        }
      }
      setBacklogByTeam(next);
    });
    return () => {
      cancelled = true;
    };
  }, [teams, calTick]);

  const calendarJobEvents = useMemo(
    () => calendarEvents.filter((e) => e.calendar_kind === 'job'),
    [calendarEvents]
  );

  const eventsByWeek = useMemo(() => {
    const map = new Map<string, WeekCalRow[]>();
    weekStarts.forEach((ws) => {
      const key = ws.toISOString();
      const list: WeekCalRow[] = [];
      calendarEvents.forEach((ev) => {
        if (!ev.schedule_start_date?.trim() || !ev.schedule_end_date?.trim()) {
          return;
        }
        const start = startOfDay(parseISO(ev.schedule_start_date));
        const end = startOfDay(parseISO(ev.schedule_end_date));
        const r = end < start ? { start: end, end: start } : { start, end };
        const spanParts = splitRangeIntoWeekdaySegments(r.start, r.end);
        const cols: 5 | 7 = showWeekends ? 7 : 5;
        spanParts.forEach((seg) => {
          if (segmentForWeek(ws, seg, cols)) {
            const est = ev.estimate_id
              ? estimates.find((e) => e.id === ev.estimate_id)
              : undefined;
            const colorKey = ev.team_id || est?.schedule_team_id || 'default';
            list.push({
              rowKey: `${ev.schedule_id}-${seg.start.toISOString()}-${ev.calendar_kind}`,
              title:
                ev.title ||
                est?.title ||
                est?.address_street ||
                (ev.calendar_kind === 'team_backlog' ? 'Team backlog' : 'Job'),
              workRange: seg,
              colorKey: (colorKey || 'default').trim() || 'default',
              href:
                ev.calendar_kind === 'team_backlog'
                  ? null
                  : ev.estimate_id
                    ? `/proposals/${ev.estimate_id}`
                    : null,
              isBacklog: ev.calendar_kind === 'team_backlog',
              teamName: ev.team_name,
            });
          }
        });
      });
      map.set(key, list);
    });
    return map;
  }, [calendarEvents, estimates, weekStarts, showWeekends]);

  const handleSaved = useCallback(() => {
    setCalTick((n) => n + 1);
    refreshData('estimates').catch(() => {});
  }, [refreshData]);

  const loadingData = loading.estimates || teamLoading || calendarLoading || teamsLoading;
  const noPipelineMatches =
    estimates.length > 0 && calendarJobEvents.length === 0 && unscheduled.length === 0;

  /** One swatch per team; colors match bars (`colorForScheduleKey`). */
  const teamLegendEntries = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  );

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
                {estimates.length} loaded · {calendarJobEvents.length} on calendar · {unscheduled.length}{' '}
                unscheduled
              </Badge>
              <Button
                variant="light"
                size="compact-sm"
                leftSection={<IconRefresh size={14} />}
                loading={loading.estimates || calendarLoading}
                onClick={() => {
                  setCalTick((n) => n + 1);
                  refreshData('estimates').catch(() => {});
                }}
              >
                Refresh
              </Button>
            </Group>
          </Group>

          {teamLegendEntries.length > 0 && (
            <div className={classes.legendWrap}>
              <Text size="xs" fw={600} c="dimmed" mb="xs" tt="uppercase">
                Team colors
              </Text>
              <Group gap="lg" align="flex-start" wrap="wrap">
                {teamLegendEntries.map((team) => {
                  const { color, shade } = colorForScheduleKey(team.id);
                  const bg = mantineColorToCss(theme.colors, color, shade ?? 6);
                  const cfg = teamConfig.scheduleTeams.find((t) => t.id === team.id);
                  const rosterHint = [
                    cfg?.painterCount != null ? `${cfg.painterCount} painters` : '',
                    cfg?.weeklyHours != null ? `${cfg.weeklyHours} hrs/wk` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <Group key={team.id} gap="xs" wrap="nowrap" align="flex-start">
                      <Box className={classes.legendSwatch} style={{ backgroundColor: bg }} />
                      <Stack gap={2}>
                        <Text size="sm" fw={600} lh={1.3}>
                          {team.name}
                        </Text>
                        {rosterHint ? (
                          <Text size="xs" c="dimmed" lh={1.35}>
                            {rosterHint}
                          </Text>
                        ) : null}
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
          {calendarError && (
            <Alert color="orange" title="Could not load schedule calendar" mb="md">
              {calendarError}
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
                  .map((row) => {
                    const seg = segmentForWeek(weekStart, row.workRange, weekGridCols);
                    if (!seg) {
                      return null;
                    }
                    return { row, seg };
                  })
                  .filter(
                    (
                      item
                    ): item is {
                      row: WeekCalRow;
                      seg: { colStart: number; colSpan: number };
                    } => item !== null
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
                        {planned.map(({ row, seg }, idx) => {
                          const lane = lanes[idx] ?? 0;
                          const { color, shade } = colorForScheduleKey(row.colorKey);
                          const solidBg = mantineColorToCss(theme.colors, color, shade ?? 6);
                          const segmentDates = `${format(row.workRange.start, 'MMM d')}–${format(
                            row.workRange.end,
                            'MMM d'
                          )}`;
                          const teamLabel =
                            row.teamName ||
                            teams.find((t) => t.id === row.colorKey)?.name ||
                            '—';
                          const inner = (
                            <>
                              <div className={classes.eventTitle}>{row.title}</div>
                              <div className={classes.eventMeta}>
                                {segmentDates}
                                {row.isBacklog
                                  ? ' · tentative backlog'
                                  : ` · ${teamLabel}`}
                              </div>
                            </>
                          );
                          const barStyle: CSSProperties = {
                            gridRow: lane + 1,
                            gridColumn: `${seg.colStart} / span ${seg.colSpan}`,
                            ...(row.isBacklog
                              ? { background: BACKLOG_EVENT_STRIPED_BG }
                              : { backgroundColor: solidBg }),
                          };
                          return row.href ? (
                            <Link
                              key={row.rowKey}
                              href={row.href}
                              className={classes.eventBar}
                              style={barStyle}
                            >
                              {inner}
                            </Link>
                          ) : (
                            <div key={row.rowKey} className={classes.eventBar} style={barStyle}>
                              {inner}
                            </div>
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

        {teams.some((t) => (backlogByTeam[t.id]?.total_labor_hours ?? 0) > 0) && (
          <Paper p="md" withBorder radius="md">
            <Title order={4} mb="sm">
              Tentative backlog (by team)
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              Ordered tentative jobs before they are locked in. Updated periodically by the server.
            </Text>
            <Stack gap="md">
              {teams.map((t) => {
                const bl = backlogByTeam[t.id];
                if (!bl || bl.total_labor_hours <= 0) {
                  return null;
                }
                return (
                  <Stack key={t.id} gap="xs">
                    <Group justify="space-between">
                      <Text fw={600}>{t.name}</Text>
                      <Text size="sm" c="dimmed">
                        {bl.total_labor_hours.toFixed(1)} hrs total
                      </Text>
                    </Group>
                    <Stack gap={4}>
                      {bl.items.map((item) => (
                        <Group key={item.schedule_id} justify="space-between" wrap="nowrap" gap="xs">
                          <Text size="sm" lineClamp={2}>
                            {item.job_name}
                          </Text>
                          <Button
                            component={Link}
                            href={`/proposals/${item.estimate_id}`}
                            size="xs"
                            variant="light"
                          >
                            Open
                          </Button>
                        </Group>
                      ))}
                    </Stack>
                  </Stack>
                );
              })}
            </Stack>
          </Paper>
        )}

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
        teams={teams}
        onSaved={handleSaved}
      />
    </Container>
  );
}
